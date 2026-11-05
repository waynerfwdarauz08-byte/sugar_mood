const db = require("../models");
const v = require("./validation");
const access = require("./accessService");
const includes = {
  categorias: [],
  clientes: [],
  productos: [{ model: db.Categoria, as: "categoria" }],
  pedidos: [
    { model: db.Cliente, as: "cliente" },
    {
      model: db.DetallePedido,
      as: "detalles",
      include: [{ model: db.Producto, as: "producto" }],
    },
  ],
  "detalles-pedido": [{ model: db.Producto, as: "producto" }],
};
const models = {
  categorias: db.Categoria,
  productos: db.Producto,
  clientes: db.Cliente,
  pedidos: db.Pedido,
  "detalles-pedido": db.DetallePedido,
};
function serialize(record) {
  const p = record.toJSON ? record.toJSON() : record;
  if (p.precioUnitario !== undefined)
    p.subtotal = v.decimal(v.cents(p.precioUnitario) * BigInt(p.cantidad));
  if (p.detalles) {
    p.detalles = p.detalles.map(serialize);
    p.total = v.decimal(
      p.detalles.reduce((s, d) => s + v.cents(d.subtotal), 0n),
    );
  }
  return p;
}
async function find(kind, id, transaction, lock = false) {
  const row = await models[kind].findByPk(v.integer(id), {
    transaction,
    ...(lock ? { lock: transaction.LOCK.UPDATE } : { include: includes[kind] }),
  });
  if (!row) v.fail("Registro no encontrado.", 404);
  return row;
}
async function related(model, id, t) {
  const row = await model.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
  if (!row) v.fail("El registro relacionado no existe.", 400);
  return row;
}
function catalog(kind, b) {
  const specs = {
    categorias: ["nombre", "descripcion"],
    productos: ["categoriaId", "nombre", "precio", "activo"],
    clientes: ["nombre", "telefono", "direccion"],
  };
  v.object(b, specs[kind]);
  if (kind === "categorias")
    return {
      nombre: v.text(b.nombre, "nombre", 80),
      descripcion: v.text(b.descripcion, "descripcion", 255, true),
    };
  if (kind === "clientes")
    return {
      nombre: v.text(b.nombre, "nombre", 100),
      telefono: v.text(b.telefono, "telefono", 20),
      direccion: v.text(b.direccion, "direccion", 255, true),
    };
  if (b.activo !== undefined && typeof b.activo !== "boolean")
    v.fail("activo debe ser booleano.");
  return {
    categoriaId: v.integer(b.categoriaId, "categoriaId"),
    nombre: v.text(b.nombre, "nombre", 100),
    precio: v.money(b.precio),
    activo: b.activo ?? true,
  };
}
async function list(kind, user) {
  access.known(user);
  let where = {},
    include = includes[kind];
  if (!access.isAdmin(user)) {
    if (kind === "productos") where = { activo: true };
    if (kind === "clientes") where = { usuarioId: user.id };
    if (kind === "pedidos") where = { clienteId: access.clientId(user) };
    if (kind === "detalles-pedido")
      include = [
        ...include,
        {
          model: db.Pedido,
          as: "pedido",
          attributes: [],
          required: true,
          where: { clienteId: access.clientId(user) },
        },
      ];
  }
  return (
    await models[kind].findAll({
      include,
      where,
      order: [["id", "DESC"]],
    })
  ).map(serialize);
}
async function get(kind, id, user) {
  const row = await find(kind, id);
  await access.check(kind, row, user);
  return serialize(row);
}
async function saveCatalog(kind, id, body, user) {
  access.known(user);
  if (!access.isAdmin(user) && (kind !== "clientes" || !id))
    v.fail("No tienes permiso para realizar esta operación.", 403);
  const data = catalog(kind, body);
  return db.sequelize.transaction(async (t) => {
    const row = id ? await find(kind, id, t, true) : null;
    if (row) await access.check(kind, row, user, t, true);
    if (kind === "productos") await related(db.Categoria, data.categoriaId, t);
    const saved = row
      ? await row.update(data, { transaction: t })
      : await models[kind].create(data, { transaction: t });
    return serialize(await find(kind, saved.id, t));
  });
}
// Todas las escrituras de líneas bloquean primero el pedido. Así se serializan
// altas, reemplazos y bajas concurrentes, incluyendo la regla de última línea.
async function saveOrder(id, body, user) {
  access.known(user);
  v.object(body, ["clienteId", "fecha", "estado", "detalles"]);
  const data = {
    clienteId: access.isAdmin(user)
      ? v.integer(body.clienteId, "clienteId")
      : access.clientId(user),
    fecha: v.date(body.fecha),
    estado: v.state(body.estado === undefined ? "pendiente" : body.estado),
  };
  if (!access.isAdmin(user)) {
    if (
      body.clienteId !== undefined &&
      v.integer(body.clienteId, "clienteId") !== data.clienteId
    )
      v.fail("No puedes asignar pedidos a otro cliente.", 403);
    if (!id && data.estado !== "pendiente")
      v.fail("Los pedidos nuevos deben estar pendientes.", 403);
    if (id && !["pendiente", "cancelado"].includes(data.estado))
      v.fail("No puedes preparar ni entregar pedidos.", 403);
  }
  if (!Array.isArray(body.detalles) || !body.detalles.length)
    v.fail("El pedido debe tener al menos un detalle.");
  const lines = body.detalles.map((d) => {
    v.object(d, ["productoId", "cantidad"]);
    return {
      productoId: v.integer(d.productoId, "productoId"),
      cantidad: v.integer(d.cantidad, "cantidad"),
    };
  });
  if (new Set(lines.map((d) => d.productoId)).size !== lines.length)
    v.fail("Un producto solo puede aparecer una vez por pedido.", 409);
  const orderId = await db.sequelize.transaction(async (t) => {
    let row = id ? await find("pedidos", id, t, true) : null;
    if (row) await access.check("pedidos", row, user, t, true);
    await related(db.Cliente, data.clienteId, t);
    const old = row
      ? await db.DetallePedido.findAll({
          where: { pedidoId: row.id },
          transaction: t,
        })
      : [];
    const prices = new Map();
    for (const line of [...lines].sort((a, b) => a.productoId - b.productoId)) {
      const product = await related(db.Producto, line.productoId, t);
      const previous = old.find((d) => d.productoId === line.productoId);
      if (!previous && !product.activo)
        v.fail("No se pueden agregar productos inactivos.");
      prices.set(
        line.productoId,
        previous ? previous.precioUnitario : product.precio,
      );
    }
    if (row) await row.update(data, { transaction: t });
    else row = await db.Pedido.create(data, { transaction: t });
    for (const d of old)
      if (!lines.some((l) => l.productoId === d.productoId))
        await d.destroy({ transaction: t });
    for (const line of lines) {
      const previous = old.find((d) => d.productoId === line.productoId);
      if (previous)
        await previous.update({ cantidad: line.cantidad }, { transaction: t });
      else
        await db.DetallePedido.create(
          {
            ...line,
            pedidoId: row.id,
            precioUnitario: prices.get(line.productoId),
          },
          { transaction: t },
        );
    }
    return row.id;
  });
  return get("pedidos", orderId, user);
}
async function saveDetail(id, body, user) {
  access.known(user);
  v.object(body, id ? ["cantidad"] : ["pedidoId", "productoId", "cantidad"]);
  const cantidad = v.integer(body.cantidad, "cantidad");
  const original = id ? await find("detalles-pedido", id) : null;
  const pedidoId = original
    ? original.pedidoId
    : v.integer(body.pedidoId, "pedidoId");
  const saved = await db.sequelize.transaction(async (t) => {
    const parent = await find("pedidos", pedidoId, t, true);
    await access.check("pedidos", parent, user, t, true);
    if (id) {
      const row = await find("detalles-pedido", id, t, true);
      await row.update({ cantidad }, { transaction: t });
      return row.id;
    }
    const productoId = v.integer(body.productoId, "productoId");
    const product = await related(db.Producto, productoId, t);
    if (!product.activo) v.fail("No se pueden agregar productos inactivos.");
    if (
      await db.DetallePedido.findOne({
        where: { pedidoId, productoId },
        transaction: t,
      })
    )
      v.fail("Producto repetido en el pedido.", 409);
    return (
      await db.DetallePedido.create(
        { pedidoId, productoId, cantidad, precioUnitario: product.precio },
        { transaction: t },
      )
    ).id;
  });
  return get("detalles-pedido", saved, user);
}
async function remove(kind, id, user) {
  access.known(user);
  if (
    !access.isAdmin(user) &&
    ["categorias", "productos", "clientes"].includes(kind)
  )
    v.fail("No tienes permiso para eliminar este registro.", 403);
  const original = kind === "detalles-pedido" ? await find(kind, id) : null;
  await db.sequelize.transaction(async (t) => {
    if (original) await find("pedidos", original.pedidoId, t, true);
    const row = await find(kind, id, t, true);
    await access.check(kind, row, user, t, true);
    if (kind === "clientes" && row.usuarioId)
      v.fail(
        "Este cliente está vinculado a una cuenta. Elimina primero la cuenta de usuario para conservar la integridad del acceso.",
        409,
      );
    if (
      original &&
      (await db.DetallePedido.count({
        where: { pedidoId: row.pedidoId },
        transaction: t,
      })) <= 1
    )
      v.fail("No se puede eliminar el último detalle del pedido.", 409);
    if (kind === "pedidos")
      await db.DetallePedido.destroy({
        where: { pedidoId: row.id },
        transaction: t,
      });
    await row.destroy({ transaction: t });
  });
}
module.exports = {
  list,
  get,
  remove,
  save: (kind, id, body, user) =>
    kind === "pedidos"
      ? saveOrder(id, body, user)
      : kind === "detalles-pedido"
        ? saveDetail(id, body, user)
        : saveCatalog(kind, id, body, user),
};
