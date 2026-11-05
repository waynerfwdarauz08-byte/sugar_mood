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
      imagen:{type:D.STRING(100),allowNull:true},
      stock: {type:D.INTEGER, allowNull:false, defaultValue:0, validate:{min:0}},
      stockMinimo: {type:D.INTEGER, allowNull:false, defaultValue:5, validate:{min:0}},
      activo: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
    },
    options("productos"),
  );

  return Producto;
};
