module.exports = {
  async up(q, S) {
    await q.addColumn("clientes", "usuarioId", {
      type: S.INTEGER,
      allowNull: true,
      unique: true,
      references: { model: "usuarios", key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.removeColumn("clientes", "usuarioId");
  },
};
