const r=require('express').Router(),c=require('../controllers/pagoController'),p=require('../middlewares/permissionMiddleware');
r.get('/',p('pagos'),c.list);
r.post('/',p('pagos','crear'),c.create);
r.post('/:id/anular',p('pagos','anular'),c.annul);
module.exports=r;
