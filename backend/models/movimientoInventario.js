module.exports=(sequelize,D)=>sequelize.define('MovimientoInventario',{
  id:require('./attributes')(sequelize,D).id,
  productoId:D.INTEGER,productoNombre:D.STRING(100),pedidoId:D.INTEGER,
  usuarioId:D.INTEGER,usuarioNombre:D.STRING(100),fecha:D.DATE,tipo:D.STRING(30),
  cantidad:D.INTEGER,stockAnterior:D.INTEGER,stockPosterior:D.INTEGER,motivo:D.STRING(255),
},{tableName:'movimientos_inventario',timestamps:false});
