module.exports = (sequelize, D) => {
  const { id, text, fk, money, options } = require("./attributes")(
    sequelize,
    D,
  );
  const Cliente = sequelize.define(
    "Cliente",
    {
      id: { ...id },
      usuarioId: { type: D.INTEGER, allowNull: true, unique: true },
      nombre: text(100),
      telefono: text(20),
      direccion: text(255, true),
    },
    options("clientes"),
  );

  return Cliente;
};
