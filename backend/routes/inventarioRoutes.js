const r=require('express').Router(),c=require('../controllers/inventarioController'),p=require('../middlewares/permissionMiddleware');
r.get('/movimientos',p('inventario'),c.list);
r.post('/movimientos',p('inventario','crear'),c.create);
module.exports=r;
