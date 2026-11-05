const r = require('express').Router();
r.get('/ventas', require('../controllers/reporteController').ventas);
module.exports = r;
