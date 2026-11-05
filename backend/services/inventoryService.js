const db = require('../models');
const v = require('./validation');
exports.editable = (order) => {
  if (order.estado === 'entregado') v.fail('Un pedido entregado conserva su historial y no puede modificarse ni eliminarse.', 409);
};
// Bloqueo por id ascendente: los pedidos concurrentes no venden la misma unidad.
exports.reconcile = async (order, before, after, state, transaction) => {
  const ids = [...new Set([...before, ...after].map(d => d.productoId))].sort((a,b) => a-b);
  const products = new Map();
  for (const id of ids) {
    const p = await db.Producto.findByPk(id, {transaction, lock: transaction.LOCK.UPDATE});
    if (!p) v.fail('El producto no existe.');
    const previous = before.find(d => d.productoId === id);
    const next = after.find(d => d.productoId === id);
    if (next && !previous && !p.activo) v.fail('No se pueden agregar productos inactivos.');
    const released = order?.stockAplicado && order.estado !== 'cancelado' ? previous?.cantidad || 0 : 0;
    const reserved = state !== 'cancelado' ? next?.cantidad || 0 : 0;
    const stock = p.stock + released - reserved;
    if (stock < 0) v.fail(`Stock insuficiente para ${p.nombre}. Disponible: ${p.stock + released}.`, 409);
    if (stock > 2147483647) v.fail('Stock fuera de rango.', 409);
    if (stock !== p.stock) {
      const previousStock=p.stock;
      await p.update({stock}, {transaction});
      await require("./stockMovementService").record(p,previousStock,stock,stock > previousStock ? "liberacion" : "reserva","Cambio de pedido",order?.id||null,transaction);
    }
    products.set(id, p);
  }
  return products;
};
