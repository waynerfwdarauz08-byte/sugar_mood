exports.ventas = async (req,res) => res.json(await require('../services/ventasService')(req.query));
