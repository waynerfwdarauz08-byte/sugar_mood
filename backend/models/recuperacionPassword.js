module.exports=(sequelize,D)=>sequelize.define('RecuperacionPassword',{
  usuarioId:{type:D.INTEGER,primaryKey:true},tokenHash:D.CHAR(64),
  vence:D.DATE,creado:D.DATE,sesionVersion:D.INTEGER,
},{tableName:'recuperaciones_password',timestamps:false});
