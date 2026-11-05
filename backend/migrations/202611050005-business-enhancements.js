module.exports = {
  async up(q, D) {
    await q.addColumn('productos', 'stock', {type:D.INTEGER, allowNull:false, defaultValue:0});
    await q.addColumn('productos', 'stockMinimo', {type:D.INTEGER, allowNull:false, defaultValue:5});
    await q.addColumn('pedidos', 'fechaEntrega', {type:D.DATE, allowNull:true});
    await q.addColumn('pedidos', 'observaciones', {type:D.STRING(500), allowNull:true});
    await q.addColumn('pedidos', 'stockAplicado', {type:D.BOOLEAN, allowNull:false, defaultValue:false});
    await q.addColumn('usuarios', 'activo', {type:D.BOOLEAN, allowNull:false, defaultValue:true});
    await q.addColumn('usuarios', 'sesionVersion', {type:D.INTEGER, allowNull:false, defaultValue:0});
    await q.sequelize.query('ALTER TABLE productos ADD CONSTRAINT productos_stock_no_negativo CHECK (stock >= 0 AND stockMinimo >= 0)');
  },
  async down(q) {
    await q.sequelize.query('ALTER TABLE productos DROP CHECK productos_stock_no_negativo');
    for (const [table, columns] of [['usuarios',['sesionVersion','activo']],['pedidos',['stockAplicado','observaciones','fechaEntrega']],['productos',['stockMinimo','stock']]])
      for (const column of columns) await q.removeColumn(table,column);
  }
};
