module.exports = {
  async up(q, S) {
    await q.createTable(
      "clientes",
      require("../config/migration-schema")(S).clientes,
    );
  },
  async down(q) {
    await q.dropTable("clientes");
  },
};
