module.exports = (sequelize, D) => {
  const { id, text, fk, money, options } = require("./attributes")(
    sequelize,
    D,
  );
  const Categoria = sequelize.define(
    "Categoria",
    {
      id: { ...id },
      nombre: { ...text(80), unique: true },
      descripcion: text(255, true),
    },
    options("categorias"),
  );

  return Categoria;
};
