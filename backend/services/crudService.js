const db = require("../models");
const v = require("./validation");
const access = require("./accessService");
const inventory = require("./inventoryService");
const includes = {
  categorias: [],
  clientes: [],
  productos: [{ model: db.Categoria, as: "categoria" }],
  pedidos: [
    { model: db.Cliente, as: "cliente" },
    {model:db.Pago,as:"pagos"},
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
  if (p.stock !== undefined) p.stockBajo = p.stock <= p.stockMinimo;
  if (p.precioUnitario !== undefined)
    p.subtotal = v.decimal(v.cents(p.precioUnitario) * BigInt(p.cantidad));
  if (p.detalles) {
    p.detalles = p.detalles.map(serialize);
    p.total = v.decimal(
      p.detalles.reduce((s, d) => s + v.cents(d.subtotal), 0n),
    );
  }
  if(p.detalles) Object.assign(p,require("./paymentService").summary(p));
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
    productos: ["categoriaId", "nombre", "precio", "activo", "stock", "stockMinimo", "imagen"],
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
    ...(b.imagen !== undefined ? {imagen:require("./imageService").validatePath(b.imagen)} : {}),
    ...(b.stock !== undefined ? {stock:v.nonnegative(b.stock,"stock")} : {}),
    ...(b.stockMinimo !== undefined ? {stockMinimo:v.nonnegative(b.stockMinimo,"stockMinimo")} : {}),
  };
}
async function list(kind, user, query = {}) {
  access.known(user);
  require('./permissionService').requirePermission(user,kind,'leer');
  let where = {},
    include = includes[kind];
  if (user.rol.codigo === "cliente") {
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
  if (kind === "pedidos") {
    const filters = require("./orderFilters").where(query);
    if (user.rol.codigo === "cliente" && filters.clienteId && filters.clienteId !== access.clientId(user)) v.fail("No puedes consultar pedidos de otro cliente.",403);
    where = {...filters,...where};
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
  if (user.rol.codigo === "cliente" && (kind !== "clientes" || !id))
    v.fail("No tienes permiso para realizar esta operación.", 403);
  const data = catalog(kind, body);
  return db.sequelize.transaction(async (t) => {
    const row = id ? await find(kind, id, t, true) : null;
    if (row) await access.check(kind, row, user, t, true);
    if (kind === "productos") await related(db.Categoria, data.categoriaId, t);
    const previousStock=row?.stock || 0;
    const saved = row
      ? await row.update(data, { transaction: t })
      : await models[kind].create(data, { transaction: t });
    if(kind === "productos" && saved.stock !== previousStock) await require("./stockMovementService").record(saved,previousStock,saved.stock,"ajuste","Conteo desde Productos",null,t);
    return serialize(await find(kind, saved.id, t));
  });
}
// Todas las escrituras de líneas bloquean primero el pedido. Así se serializan
// altas, reemplazos y bajas concurrentes, incluyendo la regla de última línea.
async function saveOrder(id, body, user) {
  access.known(user);
  v.object(body, ["clienteId", "fecha", "estado", "detalles", "fechaEntrega", "observaciones"]);
  const data = {
    clienteId: user.rol.codigo !== "cliente"
      ? v.integer(body.clienteId, "clienteId")
      : access.clientId(user),
    fecha: v.date(body.fecha),
    estado: v.state(body.estado === undefined ? "pendiente" : body.estado),
  };
  if (user.rol.codigo === "cliente") {
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
    if (row) inventory.editable(row);
    data.fechaEntrega = body.fechaEntrega === undefined ? row?.fechaEntrega || null : body.fechaEntrega === null || body.fechaEntrega === "" ? null : v.date(body.fechaEntrega);
    data.observaciones = body.observaciones === undefined ? row?.observaciones || null : v.text(body.observaciones,"observaciones",500,true);
    if (data.fechaEntrega && data.fechaEntrega < data.fecha) v.fail("La entrega no puede ser anterior al pedido.");
    await related(db.Cliente, data.clienteId, t);
    const old = row
      ? await db.DetallePedido.findAll({
          where: { pedidoId: row.id },
          transaction: t,
        })
      : [];
    if(!row) row=await db.Pedido.create(data,{transaction:t});
    const products = await inventory.reconcile(row, old, lines, data.estado, t);
    data.stockAplicado = data.estado !== "cancelado";
    const prices = new Map(lines.map(line => [line.productoId,
      old.find(d => d.productoId === line.productoId)?.precioUnitario || products.get(line.productoId).precio]));
    await require("./paymentService").validateOrder(row,lines,prices,data.estado,t);
    await row.update(data,{transaction:t});
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
    inventory.editable(parent);
    if (parent.estado === "cancelado") v.fail("Reactiva el pedido antes de modificar sus detalles.",409);
    const before = await db.DetallePedido.findAll({where:{pedidoId},transaction:t});
    const productoId = original ? original.productoId : v.integer(body.productoId,"productoId");
    if (!id && before.some(d => d.productoId === productoId)) v.fail("Producto repetido en el pedido.",409);
    const after = id ? before.map(d => ({productoId:d.productoId,cantidad:d.id === Number(id) ? cantidad : d.cantidad})) : [...before,{productoId,cantidad}];
    const products = await inventory.reconcile(parent,before,after,parent.estado,t);
    const prices=new Map(before.map(d=>[d.productoId,d.precioUnitario]));
    if(!prices.has(productoId))prices.set(productoId,products.get(productoId).precio);
    await require("./paymentService").validateOrder(parent,after,prices,parent.estado,t);
    await parent.update({stockAplicado:true},{transaction:t});
    if (id) {
      const row = await find("detalles-pedido", id, t, true);
      await row.update({ cantidad }, { transaction: t });
      return row.id;
    }
    const product = products.get(productoId);
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
  require('./permissionService').requirePermission(user,kind,'eliminar');
  if (
    user.rol.codigo === "cliente" &&
    ["categorias", "productos", "clientes"].includes(kind)
  )
    v.fail("No tienes permiso para eliminar este registro.", 403);
  const original = kind === "detalles-pedido" ? await find(kind, id) : null;
  await db.sequelize.transaction(async (t) => {
    const parent = original ? await find("pedidos", original.pedidoId, t, true) : null;
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
    if (kind === "pedidos" || original) {
      const order = parent || row;
      inventory.editable(order);
      if(!original && await db.Pago.count({where:{pedidoId:order.id},transaction:t})) v.fail("Este pedido tiene historial de pagos y no puede eliminarse.",409);
      if (original && order.estado === "cancelado") v.fail("Reactiva el pedido antes de modificar sus detalles.",409);
      const before = await db.DetallePedido.findAll({where:{pedidoId:order.id},transaction:t});
      const after = original ? before.filter(d => d.id !== row.id) : [];
      if(original) await require("./paymentService").validateOrder(order,after,new Map(before.map(d=>[d.productoId,d.precioUnitario])),order.estado,t);
      await inventory.reconcile(order,before,after,original ? order.estado : "cancelado",t);
      if (original) await order.update({stockAplicado:true},{transaction:t});
    }
    if (kind === "pedidos")
      await db.DetallePedido.destroy({
        individualHooks:true,
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
  save: (kind, id, body, user) => {
    require('./permissionService').requirePermission(user,kind,id?'editar':'crear');
    return (
    kind === "pedidos"
      ? saveOrder(id, body, user)
      : kind === "detalles-pedido"
        ? saveDetail(id, body, user)
        : saveCatalog(kind, id, body, user));
  },
};
