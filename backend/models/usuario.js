module.exports = (sequelize, D) =>
  sequelize.define(
    "Usuario",
    {
      id: {
        type: D.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre: {
        type: D.STRING(100),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 100] },
      },
      correo: {
        type: D.STRING(254),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password: { type: D.STRING(255), allowNull: false },
      fechaCreacion: { type: D.DATE, allowNull: false, defaultValue: D.NOW },
      id_rol: { type: D.INTEGER, allowNull: false },
    },
    {
      tableName: "usuarios",
      timestamps: false,
      defaultScope: { attributes: { exclude: ["password"] } },
      scopes: { conPassword: { attributes: { include: ["password"] } } },
    },
  );
