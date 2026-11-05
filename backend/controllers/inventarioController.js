const service=require('../services/stockMovementService');
exports.list=async(req,res)=>res.json(await service.list(req.query));
exports.create=async(req,res)=>res.status(201).json(await service.create(req.body));
