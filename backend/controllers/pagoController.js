const service=require('../services/paymentService');
exports.list=async(req,res)=>res.json(await service.list(req.usuario,req.query));
exports.create=async(req,res)=>res.status(201).json(await service.create(req.usuario,req.body));
exports.annul=async(req,res)=>res.json(await service.annul(req.usuario,req.params.id,req.body));
