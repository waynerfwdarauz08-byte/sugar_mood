module.exports = (sequelize, D) => {
  const { id, text, fk, money, options } = require("./attributes")(
    sequelize,
    D,
  );
  const DetallePedido = sequelize.define(
    "DetallePedido",
    {
      id: { ...id },
      pedidoId: { ...fk },
      productoId: { ...fk },
      cantidad: {
        type: D.INTEGER,
        allowNull: false,
        validate: { isInt: true, min: 1 },
      },
      precioUnitario: { ...money },
    },
    {
      ...options("detalles_pedido"),
      indexes: [{ unique: true, fields: ["pedidoId", "productoId"] }],
    },
  );

  return DetallePedido;
};
