module.exports = {
  async up(q, S) {
    await q.createTable(
      "categorias",
      require("../config/migration-schema")(S).categorias,
    );
  },
  async down(q) {
    await q.dropTable("categorias");
  },
};
