const {Op}=require('sequelize');
const db=require('../models');
const v=require('./validation');
module.exports=async(user,query)=>{
  v.object(query,['desde','hasta','estado']);
  const day=n=>new Date(Date.now()-21600000+n*86400000).toISOString().slice(0,10);
  const {from,until}=require('./orderFilters').range({desde:query.desde||day(0),hasta:query.hasta||day(6)});
  if(until-from>93*86400000)v.fail('La agenda admite hasta 93 días.');
  const where={fechaEntrega:{[Op.gte]:from,[Op.lt]:until},estado:query.estado?v.state(query.estado):{[Op.ne]:'cancelado'}};
  if(user.rol.codigo==='cliente')where.clienteId=require('./accessService').clientId(user);
  return db.Pedido.findAll({where,include:[{model:db.Cliente,as:'cliente'}],order:[['fechaEntrega','ASC'],['id','ASC']]});
};
