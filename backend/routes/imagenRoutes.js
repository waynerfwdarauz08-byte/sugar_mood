const express=require('express'),r=express.Router(),path=require('node:path'),images=require('../services/imageService');
r.post('/',require('../middlewares/authMiddleware'),(req,res,next)=>{
  const permissions=require('../services/permissionService');
  if(permissions.can(req.usuario,'productos','editar')||permissions.can(req.usuario,'productos','crear'))return next();
  return res.status(403).json({error:'No tienes permiso para cargar imágenes.'});
},express.raw({type:['image/png','image/jpeg'],limit:'2mb'}),async(req,res)=>res.status(201).json(await images.upload(req.body,req.get('Content-Type')?.split(';')[0])));
r.get('/:file',(req,res,next)=>{
  if(!/^[a-f0-9]{64}\.(png|jpg)$/.test(req.params.file))return res.status(404).json({error:'Imagen no encontrada.'});
  res.set({'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'});
  res.sendFile(path.join(images.root,req.params.file),err=>{if(err){if(err.status===404)return res.status(404).json({error:'Imagen no encontrada.'});next(err);}});
});
module.exports=r;
