const r=require('express').Router();
r.get('/',require('../controllers/agendaController').list);
module.exports=r;
