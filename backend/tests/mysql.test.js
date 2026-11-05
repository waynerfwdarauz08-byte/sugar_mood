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
    const auth = require("../services/authService");
    const jwt = require("jsonwebtoken");
    const api = request(app);
    const adminRole = await db.Rol.findOne({
      where: { codigo: "administrador" },
    });
    const clientRole = await db.Rol.findOne({ where: { codigo: "cliente" } });
    const admin = await db.Usuario.create({
      nombre: "Administrador de prueba",
      correo: "admin@prueba.local",
      password: await auth.hash("PruebaAdmin2026!"),
      id_rol: adminRole.id,
    });
    const adminLogin = await api
      .post("/api/auth/login")
      .send({ correo: admin.correo, password: "PruebaAdmin2026!" });
    assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
    const adminToken = adminLogin.body.token;
    const call = async (method, path, body, status = 200) => {
      const r = await api[method]("/api/" + path)
        .set("Authorization", "Bearer " + adminToken)
        .send(body);
      assert.equal(r.status, status, JSON.stringify(r.body));
      return r.body;
    };
    try {
      const browser = request.agent(app);
      const initialCsrf = await browser
        .get("/api/auth/csrf")
        .set("X-Session-Mode", "cookie");
      assert.equal(initialCsrf.status, 200);
      assert.equal(initialCsrf.headers["cache-control"], "no-store");
      const cookieLogin = await browser
        .post("/api/auth/login")
        .set("X-Session-Mode", "cookie")
        .set("X-CSRF-Token", initialCsrf.body.csrfToken)
        .send({ correo: admin.correo, password: "PruebaAdmin2026!" });
      assert.equal(cookieLogin.status, 200, JSON.stringify(cookieLogin.body));
      assert.equal(
        cookieLogin.body.token,
        undefined,
        "El modo navegador no expone JWT en JSON",
      );
      assert.ok(cookieLogin.body.expiresAt);
      const cookieHeader = cookieLogin.headers["set-cookie"].find((c) =>
        c.startsWith("sugar_mood_session="),
      );
      assert.ok(cookieHeader.includes("HttpOnly"));
      assert.ok(cookieHeader.includes("SameSite=Lax"));
      assert.ok(cookieHeader.includes("Max-Age=3600"));
      assert.ok(cookieHeader.includes("Path=/"));
      const restored = await browser.get("/api/auth/me");
      assert.equal(restored.status, 200);
      assert.equal(restored.body.rol.codigo, "administrador");
      assert.equal(restored.body.expiresAt, cookieLogin.body.expiresAt);
      assert.equal(
        (
          await browser
            .get("/api/auth/me")
            .set("Authorization", "Bearer incorrecto")
        ).status,
        401,
        "Un Bearer inválido no puede usar la cookie como fallback",
      );
      assert.equal(
        (
          await browser
            .post("/api/auth/login")
            .set("X-Session-Mode", "cookie")
            .send({ correo: admin.correo, password: "PruebaAdmin2026!" })
        ).status,
        403,
        "Login en navegador exige prueba CSRF",
      );
      const expiredBrowser = jwt.sign({}, process.env.JWT_SECRET, {
        subject: String(admin.id),
        algorithm: "HS256",
        expiresIn: -1,
        issuer: "sugar-mood",
        audience: "sugar-mood-web",
      });
      assert.equal(
        (
          await api
            .get("/api/auth/me")
            .set("Cookie", "sugar_mood_session=" + expiredBrowser)
        ).status,
        401,
        "La cookie no prolonga un JWT vencido",
      );
      assert.equal(
        (await browser.get("/api/productos")).status,
        200,
        "Nueva petición autentica solo con cookie",
      );
      assert.equal(
        (
          await browser
            .post("/api/categorias")
            .send({ nombre: "CSRF sin prueba" })
        ).status,
        403,
      );
      assert.equal(
        (
          await browser
            .post("/api/categorias")
            .set("X-CSRF-Token", initialCsrf.body.csrfToken)
            .send({ nombre: "CSRF antiguo" })
        ).status,
        403,
      );
      assert.equal(
        (
          await browser
            .post("/api/categorias")
            .set("Origin", "https://no-autorizado.example")
            .set("X-CSRF-Token", cookieLogin.body.csrfToken)
            .send({ nombre: "CSRF externo" })
        ).status,
        403,
      );
      assert.equal(
        (
          await browser
            .get("/api/auth/csrf")
            .set("Origin", "https://no-autorizado.example")
        ).status,
        403,
      );
      const freshProof = await browser.get("/api/auth/csrf");
      assert.equal(
        freshProof.body.csrfToken,
        cookieLogin.body.csrfToken,
        "Recargar no rompe la prueba CSRF de otras pestañas",
      );
      const cookieCategory = await browser
        .post("/api/categorias")
        .set("Origin", "http://localhost:5173")
        .set("X-CSRF-Token", freshProof.body.csrfToken)
        .send({ nombre: "Categoría desde cookie" });
      assert.equal(
        cookieCategory.status,
        201,
        JSON.stringify(cookieCategory.body),
      );
      assert.equal(
        cookieCategory.headers["access-control-allow-credentials"],
        "true",
      );
      assert.equal(
        (
          await browser
            .delete("/api/categorias/" + cookieCategory.body.id)
            .set("X-CSRF-Token", freshProof.body.csrfToken)
        ).status,
        204,
      );
      const cookieLogout = await browser
        .post("/api/auth/logout")
        .set("X-Session-Mode", "cookie")
        .set("X-CSRF-Token", freshProof.body.csrfToken)
        .send({});
      assert.equal(cookieLogout.status, 204);
      assert.ok(
        cookieLogout.headers["set-cookie"].every((c) =>
          c.includes("Expires=Thu, 01 Jan 1970"),
        ),
      );
      assert.equal(
        (await browser.get("/api/auth/me")).status,
        401,
        "Logout borra la cookie del agente",
      );
      const cookieOptions = require("../services/cookieService");
      const previousEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        assert.equal(cookieOptions.config().options.secure, true);
        assert.ok(cookieOptions.config().sessionName.startsWith("__Host-"));
      } finally {
        if (previousEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnv;
      }
      for (const kind of [
        "categorias",
        "productos",
        "clientes",
        "pedidos",
        "detalles-pedido",
        "usuarios",
        "roles",
      ]) {
        for (const [method, path] of [
          ["get", kind],
          ["get", kind + "/1"],
          ["post", kind],
          ["put", kind + "/1"],
          ["delete", kind + "/1"],
        ])
          assert.equal(
            (await api[method]("/api/" + path).send({})).status,
            401,
          );
      }
      assert.equal((await api.get("/api/auth/me")).status, 401);
      assert.equal(
        (
          await api
            .get("/api/auth/me")
            .set("Authorization", "Bearer incorrecto")
        ).status,
        401,
      );
      const expired = jwt.sign({}, process.env.JWT_SECRET, {
        subject: String(admin.id),
        algorithm: "HS256",
        expiresIn: -1,
        issuer: "sugar-mood",
        audience: "sugar-mood-web",
      });
      assert.equal(
        (
          await api
            .get("/api/auth/me")
            .set("Authorization", "Bearer " + expired)
        ).status,
        401,
      );
      const tampered = adminToken.slice(0, -4) + "aaaa";
      assert.equal(
        (
          await api
            .get("/api/auth/me")
            .set("Authorization", "Bearer " + tampered)
        ).status,
        401,
      );
      assert.equal(
        (
          await api
            .post("/api/auth/login")
            .send({ correo: admin.correo, password: "incorrecta" })
        ).status,
        401,
      );
      const registrations = [];
      for (const suffix of ["a", "b"]) {
        const body = {
          nombre: "Cliente " + suffix,
          correo: suffix + "@prueba.local",
          password: "ClaveCliente2026!",
          telefono: "0000-0011",
        };
        assert.equal(
          (
            await api
              .post("/api/auth/register")
              .send({ ...body, id_rol: adminRole.id })
          ).status,
          400,
        );
        assert.equal(
          (
            await api
              .post("/api/auth/register")
              .send({ ...body, password: "corta" })
          ).status,
          400,
        );
        const registered = await api.post("/api/auth/register").send(body);
        assert.equal(registered.status, 201, JSON.stringify(registered.body));
        assert.equal(registered.body.rol.codigo, "cliente");
        assert.equal(registered.body.password, undefined);
        const login = await api
          .post("/api/auth/login")
          .send({ correo: body.correo, password: body.password });
        assert.equal(login.status, 200);
        assert.equal(login.body.usuario.password, undefined);
        registrations.push(login.body);
        assert.equal(
          (await api.post("/api/auth/register").send(body)).status,
          400,
        );
        const stored = await db.Usuario.scope("conPassword").findByPk(
          registered.body.id,
        );
        assert.notEqual(stored.password, body.password);
        assert.ok(stored.password.startsWith("$2"));
      }
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
        { nombre: "Cliente de prueba", telefono: "0000-7788" },
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
        nombre: p.nombre,
        categoriaId: c.id,
        precio: "0.10",
        activo: true,
      });
      assert.equal(updatedProduct.categoria.id, c.id);
      await call("post", "pedidos", { ...data, estado: null }, 400);
      // Provocar un fallo real de la operación después de la primera escritura.
      const createDetail = db.DetallePedido.create;
      const countBefore = await db.Pedido.count();
      let writes = 0;
      try {
        db.DetallePedido.create = async function (...args) {
          if (++writes === 2)
            throw new Error(
              "Fallo simulado después de guardar la primera línea",
            );
          return createDetail.apply(this, args);
        };
        await call(
          "post",
          "pedidos",
          {
            ...data,
            detalles: [
              { productoId: p.id, cantidad: 1 },
              { productoId: p2.id, cantidad: 1 },
            ],
          },
          500,
        );
      } finally {
        db.DetallePedido.create = createDetail;
      }
      assert.equal(writes, 2);
      assert.equal(await db.Pedido.count(), countBefore);
      assert.equal(
        await db.DetallePedido.count({ where: { productoId: p.id } }),
        0,
      );
      const order = await call("post", "pedidos", data, 201);
      assert.equal(order.fecha, "2026-11-04T16:00:45.000Z");
      try {
        db.DetallePedido.create = async () => {
          throw new Error("Fallo simulado después de actualizar una línea");
        };
        await call(
          "put",
          "pedidos/" + order.id,
          {
            ...data,
            estado: "preparado",
            detalles: [
              { productoId: p.id, cantidad: 99 },
              { productoId: p2.id, cantidad: 1 },
            ],
          },
          500,
        );
      } finally {
        db.DetallePedido.create = createDetail;
      }
      const unchanged = await call("get", "pedidos/" + order.id);
      assert.equal(unchanged.estado, "pendiente");
      assert.equal(unchanged.total, "0.20");
      assert.equal(unchanged.detalles.length, 1);
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
        api
          .delete("/api/detalles-pedido/" + extra.id)
          .set("Authorization", "Bearer " + adminToken),
        api
          .delete("/api/detalles-pedido/" + seedOrder.detalles[0].id)
          .set("Authorization", "Bearer " + adminToken),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [204, 409]);
      assert.equal(
        (await call("get", "pedidos/" + seedOrder.id)).detalles.length,
        1,
      );
      const [alice, bob] = registrations;
      const clientCall = async (session, method, path, body, status = 200) => {
        const r = await api[method]("/api/" + path)
          .set("Authorization", "Bearer " + session.token)
          .send(body);
        assert.equal(r.status, status, JSON.stringify(r.body));
        return r.body;
      };
      const catalog = await clientCall(alice, "get", "productos");
      const product = catalog[0];
      const own = {
        fecha: "2026-11-05T10:20:33-06:00",
        estado: "pendiente",
        detalles: [{ productoId: product.id, cantidad: 2 }],
      };
      const ownOrder = await clientCall(alice, "post", "pedidos", own, 201);
      assert.equal(ownOrder.clienteId, alice.usuario.cliente.id);
      assert.equal((await clientCall(bob, "get", "pedidos")).length, 0);
      assert.equal((await clientCall(bob, "get", "detalles-pedido")).length, 0);
      for (const method of ["get", "put", "delete"])
        await clientCall(
          bob,
          method,
          "pedidos/" + ownOrder.id,
          method === "put" ? own : undefined,
          404,
        );
      for (const method of ["get", "put", "delete"])
        await clientCall(
          bob,
          method,
          "detalles-pedido/" + ownOrder.detalles[0].id,
          method === "put" ? { cantidad: 3 } : undefined,
          404,
        );
      await clientCall(
        bob,
        "post",
        "detalles-pedido",
        { pedidoId: ownOrder.id, productoId: product.id, cantidad: 1 },
        404,
      );
      await clientCall(
        alice,
        "post",
        "pedidos",
        { ...own, clienteId: bob.usuario.cliente.id },
        403,
      );
      await clientCall(
        alice,
        "put",
        "pedidos/" + ownOrder.id,
        { ...own, estado: "entregado" },
        403,
      );
      await clientCall(alice, "post", "productos", { nombre: "Escalada" }, 403);
      await clientCall(alice, "get", "usuarios", undefined, 403);
      await clientCall(alice, "get", "roles", undefined, 403);
      await clientCall(
        alice,
        "get",
        "clientes/" + bob.usuario.cliente.id,
        undefined,
        404,
      );
      assert.equal((await clientCall(alice, "get", "clientes")).length, 1);
      await clientCall(alice, "put", "clientes/" + alice.usuario.cliente.id, {
        nombre: "Mi perfil",
        telefono: "0000-1122",
      });
      const modified = await clientCall(
        alice,
        "put",
        "pedidos/" + ownOrder.id,
        { ...own, detalles: [{ productoId: product.id, cantidad: 4 }] },
      );
      assert.equal(modified.detalles[0].cantidad, 4);
      await call("put", "pedidos/" + ownOrder.id, {
        ...own,
        clienteId: alice.usuario.cliente.id,
        estado: "preparado",
      });
      await clientCall(
        alice,
        "put",
        "detalles-pedido/" + ownOrder.detalles[0].id,
        { cantidad: 5 },
        403,
      );
      await clientCall(
        alice,
        "delete",
        "pedidos/" + ownOrder.id,
        undefined,
        403,
      );
      await call("put", "pedidos/" + ownOrder.id, {
        ...own,
        clienteId: alice.usuario.cliente.id,
        estado: "pendiente",
      });
      await clientCall(alice, "put", "pedidos/" + ownOrder.id, {
        ...own,
        estado: "cancelado",
      });
      await clientCall(alice, "put", "pedidos/" + ownOrder.id, own, 403);
      await call("get", "usuarios/" + alice.usuario.id);
      assert.equal((await call("get", "usuarios"))[0].password, undefined);
      const newRole = await call(
        "post",
        "roles",
        {
          codigo: "consulta_futura",
          nombre: "Consulta futura",
          descripcion: "Descripción del rol de prueba",
        },
        201,
      );
      assert.equal(newRole.descripcion, "Descripción del rol de prueba");
      await call("put", "roles/" + newRole.id, {
        codigo: "consulta_futura",
        nombre: "Rol futuro actualizado",
        descripcion: "Descripción actualizada",
      });
      assert.equal(
        (await call("get", "roles/" + newRole.id)).descripcion,
        "Descripción actualizada",
      );
      await call(
        "put",
        "roles/" + newRole.id,
        {
          codigo: "consulta_futura",
          nombre: "Rol futuro actualizado",
          descripcion: "x".repeat(256),
        },
        400,
      );
      await call("put", "roles/" + newRole.id, {
        codigo: "consulta_futura",
        nombre: "Rol futuro actualizado",
        descripcion: null,
      });
      assert.equal(
        (await call("get", "roles/" + newRole.id)).descripcion,
        null,
      );
      const extraUser = await call(
        "post",
        "usuarios",
        {
          nombre: "Cuenta temporal",
          correo: "temporal@prueba.local",
          password: "Temporal2026!",
          id_rol: newRole.id,
        },
        201,
      );
      await call("delete", "roles/" + newRole.id, undefined, 409);
      const future = await api
        .post("/api/auth/login")
        .send({ correo: extraUser.correo, password: "Temporal2026!" });
      await clientCall(future.body, "get", "productos", undefined, 403);
      await call("put", "usuarios/" + extraUser.id, {
        nombre: extraUser.nombre,
        correo: extraUser.correo,
        id_rol: adminRole.id,
      });
      await clientCall(future.body, "get", "usuarios");
      await call("delete", "usuarios/" + extraUser.id, undefined, 204);
      await clientCall(future.body, "get", "auth/me", undefined, 401);
      await call("delete", "roles/" + newRole.id, undefined, 204);
      await call("delete", "usuarios/" + admin.id, undefined, 409);
      await call(
        "put",
        "usuarios/" + admin.id,
        {
          nombre: admin.nombre,
          correo: admin.correo,
          id_rol: clientRole.id,
          telefono: "0000-0000",
        },
        409,
      );
      await call("delete", "roles/" + clientRole.id, undefined, 409);
      const unlinked = await call(
        "post",
        "clientes",
        { nombre: "Cliente previo", telefono: "0000-5566" },
        201,
      );
      const linked = await call(
        "post",
        "usuarios",
        {
          nombre: "Vinculado",
          correo: "link@prueba.local",
          password: "Vinculado2026!",
          id_rol: clientRole.id,
          clienteId: unlinked.id,
        },
        201,
      );
      assert.equal(linked.cliente.id, unlinked.id);
      await call("delete", "clientes/" + unlinked.id, undefined, 409);
      await call("delete", "usuarios/" + linked.id, undefined, 204);
      assert.equal(
        (await call("get", "clientes/" + unlinked.id)).usuarioId,
        null,
      );
    } finally {
      await db.sequelize.close();
    }
  },
);
