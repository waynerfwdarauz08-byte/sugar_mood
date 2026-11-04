const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const enabled = process.env.RUN_MYSQL_TESTS === "1";
test(
  "CRUDs e integridad de pedidos contra MySQL aislado",
  { skip: !enabled },
  async () => {
    assert.match(process.env.DB_TEST_NAME, /^sugar_mood_test_\d+_[a-f0-9]+$/);
    const app = require("../app");
    const db = require("../models");
    const api = request(app);
    const call = async (method, path, body, status = 200) => {
      const r = await api[method]("/api/" + path).send(body);
      assert.equal(r.status, status, JSON.stringify(r.body));
      return r.body;
    };
    try {
      await call("get", "salud");
      const c = await call(
        "post",
        "categorias",
        { nombre: "Categoría de prueba" },
        201,
      );
      const client = await call(
        "post",
        "clientes",
        { nombre: "Cliente de prueba", telefono: "0000-1234" },
        201,
      );
      const p = await call(
        "post",
        "productos",
        { nombre: "Producto de prueba", categoriaId: c.id, precio: "0.10" },
        201,
      );
      const p2 = await call(
        "post",
        "productos",
        { nombre: "Producto dos", categoriaId: c.id, precio: "0.20" },
        201,
      );
      await call("get", "productos/" + p.id);
      assert.equal((await call("get", "productos/" + p.id)).categoria.id, c.id);
      await call("post", "categorias", { nombre: "Categoría de prueba" }, 409);
      await call("post", "categorias", { nombre: " " }, 400);
      await call(
        "post",
        "clientes",
        { nombre: "X", telefono: "1", id: 4 },
        400,
      );
      await call("get", "clientes/2147483647", undefined, 404);
      await call("get", "clientes/abc", undefined, 400);
      const data = {
        clienteId: client.id,
        fecha: "2026-11-04T10:00:45-06:00",
        detalles: [{ productoId: p.id, cantidad: 2 }],
      };
      assert.equal(p.categoria.id, c.id);
      const updatedProduct = await call("put", "productos/" + p.id, {
        nombre: p.nombre, categoriaId: c.id, precio: "0.10", activo: true,
      });
      assert.equal(updatedProduct.categoria.id, c.id);
      await call("post", "pedidos", {...data, estado:null}, 400);
      // Provocar un fallo real de la operación después de la primera escritura.
      const createDetail = db.DetallePedido.create;
      const countBefore = await db.Pedido.count();
      let writes = 0;
      try {
        db.DetallePedido.create = async function(...args) {
          if (++writes === 2) throw new Error("Fallo simulado después de guardar la primera línea");
          return createDetail.apply(this,args);
        };
        await call("post", "pedidos", {...data, detalles:[{productoId:p.id,cantidad:1},{productoId:p2.id,cantidad:1}]},500);
      } finally { db.DetallePedido.create = createDetail; }
      assert.equal(writes,2);
      assert.equal(await db.Pedido.count(),countBefore);
      assert.equal(await db.DetallePedido.count({where:{productoId:p.id}}),0);
      const order = await call("post", "pedidos", data, 201);
      assert.equal(order.fecha, "2026-11-04T16:00:45.000Z");
      try {
        db.DetallePedido.create = async () => {throw new Error("Fallo simulado después de actualizar una línea");};
        await call("put", "pedidos/"+order.id, {...data,estado:"preparado",detalles:[{productoId:p.id,cantidad:99},{productoId:p2.id,cantidad:1}]},500);
      } finally { db.DetallePedido.create = createDetail; }
      const unchanged = await call("get", "pedidos/"+order.id);
      assert.equal(unchanged.estado,"pendiente");
      assert.equal(unchanged.total,"0.20");
      assert.equal(unchanged.detalles.length,1);
      assert.equal(order.total, "0.20");
      assert.equal(order.cliente.id, client.id);
      await call("post", "pedidos", { ...data, detalles: [] }, 400);
      await call(
        "post",
        "pedidos",
        { ...data, detalles: [...data.detalles, ...data.detalles] },
        409,
      );
      const before = (await call("get", "pedidos")).length;
      await call(
        "post",
        "pedidos",
        {
          ...data,
          detalles: [...data.detalles, { productoId: 2147483647, cantidad: 1 }],
        },
        400,
      );
      assert.equal((await call("get", "pedidos")).length, before);
      await call("put", "productos/" + p.id, {
        nombre: p.nombre,
        categoriaId: c.id,
        precio: "9.99",
        activo: false,
      });
      const edited = await call("put", "pedidos/" + order.id, {
        ...data,
        detalles: [
          { productoId: p.id, cantidad: 3 },
          { productoId: p2.id, cantidad: 1 },
        ],
      });
      assert.equal(edited.total, "0.50");
      assert.equal(
        edited.detalles.find((d) => d.productoId === p.id).precioUnitario,
        "0.10",
      );
      await call("post", "pedidos", data, 400);
      await call("delete", "productos/" + p.id, undefined, 409);
      await call("delete", "categorias/" + c.id, undefined, 409);
      await call("delete", "clientes/" + client.id, undefined, 409);
      await call(
        "put",
        "pedidos/" + order.id,
        {
          ...data,
          detalles: [
            { productoId: p.id, cantidad: 8 },
            { productoId: 2147483647, cantidad: 1 },
          ],
        },
        400,
      );
      assert.equal((await call("get", "pedidos/" + order.id)).total, "0.50");
      const line = edited.detalles.find((d) => d.productoId === p.id),
        other = edited.detalles.find((d) => d.productoId === p2.id);
      await call("get", "detalles-pedido");
      await call("get", "detalles-pedido/" + line.id);
      await call("put", "detalles-pedido/" + line.id, { cantidad: 4 });
      await call(
        "post",
        "detalles-pedido",
        { pedidoId: order.id, productoId: p2.id, cantidad: 1 },
        409,
      );
      await call("delete", "detalles-pedido/" + other.id, undefined, 204);
      await call("delete", "detalles-pedido/" + line.id, undefined, 409);
      const newLine = await call(
        "post",
        "detalles-pedido",
        { pedidoId: order.id, productoId: p2.id, cantidad: 2 },
        201,
      );
      assert.equal(newLine.precioUnitario, "0.20");
      await call("delete", "pedidos/" + order.id, undefined, 204);
      await call("get", "detalles-pedido/" + newLine.id, undefined, 404);
      await call("put", "categorias/" + c.id, {
        nombre: "Categoría actualizada",
      });
      await call("put", "clientes/" + client.id, {
        nombre: "Cliente actualizado",
        telefono: "0000-9999",
      });
      for (const kind of [
        "categorias",
        "clientes",
        "productos",
        "pedidos",
        "detalles-pedido",
      ])
        await call("get", kind);
      await call("delete", "productos/" + p.id, undefined, 204);
      await call("delete", "productos/" + p2.id, undefined, 204);
      await call("delete", "categorias/" + c.id, undefined, 204);
      await call("delete", "clientes/" + client.id, undefined, 204);
      // Dos bajas simultáneas deben dejar exactamente una línea.
      const seedOrder = (await call("get", "pedidos"))[0];
      const seedProduct = (await call("get", "productos")).find(
        (p) => p.id !== seedOrder.detalles[0].productoId,
      );
      const extra = await call(
        "post",
        "detalles-pedido",
        { pedidoId: seedOrder.id, productoId: seedProduct.id, cantidad: 1 },
        201,
      );
      const results = await Promise.all([
        api.delete("/api/detalles-pedido/" + extra.id),
        api.delete("/api/detalles-pedido/" + seedOrder.detalles[0].id),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [204, 409]);
      assert.equal(
        (await call("get", "pedidos/" + seedOrder.id)).detalles.length,
        1,
      );
    } finally {
      await db.sequelize.close();
    }
  },
);
