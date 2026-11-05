module.exports = (sequelize, D) => {
  const { id, text, fk, money, options } = require("./attributes")(
    sequelize,
    D,
  );
  const Pedido = sequelize.define(
    "Pedido",
    {
      id: { ...id },
      clienteId: { ...fk },
      fecha: { type: D.DATE, allowNull: false, validate: { isDate: true } },
      estado: {
        type: D.ENUM("pendiente", "preparado", "entregado", "cancelado"),
        allowNull: false,
        defaultValue: "pendiente",
      },
    },
    options("pedidos"),
  );

  return Pedido;
};
