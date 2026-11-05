module.exports = {
  async up(q, S) {
    await q.createTable("usuarios", {
      id: {
        type: S.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre: { type: S.STRING(100), allowNull: false },
      correo: { type: S.STRING(254), allowNull: false, unique: true },
      password: { type: S.STRING(255), allowNull: false },
      fechaCreacion: {
        type: S.DATE,
        allowNull: false,
        defaultValue: S.literal("CURRENT_TIMESTAMP"),
      },
      id_rol: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "roles", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
    });
  },
  async down(q) {
    await q.dropTable("usuarios");
  },
};
