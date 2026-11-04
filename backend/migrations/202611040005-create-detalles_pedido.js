module.exports = {
  async up(q, S) {
    await q.createTable(
      "detalles_pedido",
      require("../config/migration-schema")(S).detalles_pedido,
    );
    await q.addConstraint("detalles_pedido", {
      fields: ["pedidoId", "productoId"],
      type: "unique",
      name: "uq_pedido_producto",
    });
    await q.sequelize.query(
      "ALTER TABLE detalles_pedido ADD CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0), ADD CONSTRAINT chk_detalle_precio CHECK (precioUnitario >= 0)",
    );
  },
  async down(q) {
    await q.dropTable("detalles_pedido");
  },
};
