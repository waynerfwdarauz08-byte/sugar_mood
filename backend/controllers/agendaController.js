exports.list=async(req,res)=>res.json(await require('../services/agendaService')(req.usuario,req.query));
