module.exports = (sequelize, D) => {
  const { id, text, fk, money, options } = require("./attributes")(
    sequelize,
    D,
  );
  const Producto = sequelize.define(
    "Producto",
    {
      id: { ...id },
      categoriaId: { ...fk },
      nombre: { ...text(100), unique: true },
      precio: { ...money },
      activo: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
    },
    options("productos"),
  );

  return Producto;
};
