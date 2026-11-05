module.exports = {
  async up(q, S) {
    await q.createTable("roles", {
      id: {
        type: S.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      codigo: { type: S.STRING(40), allowNull: false, unique: true },
      nombre: { type: S.STRING(80), allowNull: false, unique: true },
    });
    await q.bulkInsert("roles", [
      { codigo: "administrador", nombre: "Administrador" },
      { codigo: "cliente", nombre: "Cliente" },
    ]);
  },
  async down(q) {
    await q.dropTable("roles");
  },
};
