module.exports=(sequelize,D)=>sequelize.define('Auditoria',{
  id:require('./attributes')(sequelize,D).id,
  usuarioId:D.INTEGER,usuarioNombre:D.STRING(100),fecha:D.DATE,
  entidad:D.STRING(60),registroId:D.INTEGER,accion:D.STRING(30),antes:D.JSON,despues:D.JSON,
},{tableName:'auditoria',timestamps:false});
