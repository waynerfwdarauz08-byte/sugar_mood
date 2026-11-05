exports.list=async(req,res)=>{
  const v=require('../services/validation'),db=require('../models');
  v.object(req.query,['entidad','limite']);
  const where=req.query.entidad?{entidad:v.text(req.query.entidad,'entidad',60)}:{};
  res.json(await db.Auditoria.findAll({where,limit:Math.min(v.integer(req.query.limite||100),500),order:[['id','DESC']]}));
};
