module.exports = {
  async up(q, S) {
    await q.createTable(
      "pedidos",
      require("../config/migration-schema")(S).pedidos,
    );
  },
  async down(q) {
    await q.dropTable("pedidos");
  },
};
