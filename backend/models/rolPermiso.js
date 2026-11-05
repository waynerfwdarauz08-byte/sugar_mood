module.exports=(sequelize,D)=>sequelize.define('RolPermiso',{
  id_rol:{type:D.INTEGER,primaryKey:true},
  permiso:{type:D.STRING(60),primaryKey:true},
},{tableName:'rol_permisos',timestamps:false});
