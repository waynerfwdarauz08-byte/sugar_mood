module.exports=(sequelize,D)=>sequelize.define('Pago',{
  id:require('./attributes')(sequelize,D).id,
  pedidoId:D.INTEGER,usuarioId:D.INTEGER,usuarioNombre:D.STRING(100),fecha:D.DATE,
  monto:D.DECIMAL(10,2),metodo:D.ENUM('efectivo','sinpe','transferencia','tarjeta'),
  referencia:D.STRING(100),estado:{type:D.ENUM('registrado','anulado'),defaultValue:'registrado'},
  anulacionMotivo:D.STRING(255),anuladoPor:D.STRING(100),fechaAnulacion:D.DATE,
},{tableName:'pagos',timestamps:false});
