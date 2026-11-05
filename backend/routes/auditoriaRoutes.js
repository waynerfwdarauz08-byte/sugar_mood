const r=require('express').Router();
r.get('/',require('../controllers/auditoriaController').list);
module.exports=r;
