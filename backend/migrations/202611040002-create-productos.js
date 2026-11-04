module.exports = {
  async up(q, S) {
    await q.createTable(
      "productos",
      require("../config/migration-schema")(S).productos,
    );
    await q.sequelize.query(
      "ALTER TABLE productos ADD CONSTRAINT chk_producto_precio CHECK (precio >= 0)",
    );
  },
  async down(q) {
    await q.dropTable("productos");
  },
};
