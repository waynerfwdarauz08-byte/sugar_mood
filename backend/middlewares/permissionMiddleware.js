module.exports=(resource,action='leer')=>(req,res,next)=>{
  try {require('../services/permissionService').requirePermission(req.usuario,resource,action);next();}catch(e){next(e);}
};
