module.exports = (sequelize, D) =>
  sequelize.define(
    "Rol",
    {
      id: {
        type: D.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      codigo: {
        type: D.STRING(40),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true, len: [1, 40] },
      },
      nombre: {
        type: D.STRING(80),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true, len: [1, 80] },
      },
      descripcion: {
        type: D.STRING(255),
        allowNull: true,
        validate: { len: [0, 255] },
      },
    },
    { tableName: "roles", timestamps: false },
  );
