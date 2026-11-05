const crypto=require('node:crypto');
const db=require('../models'),v=require('./validation'),auth=require('./authService'),mail=require('./mailService');
const hash=token=>crypto.createHash('sha256').update(token).digest('hex');
const message={mensaje:'Si la cuenta existe y está activa, recibirás un enlace para restablecer tu contraseña.'};
exports.request=async(body)=>{
  v.object(body,['correo']);const correo=auth.correo(body.correo);
  if(!mail.ready())v.fail('La recuperación por correo requiere configurar SMTP en el servidor.',503);
  const origin=new URL(process.env.FRONTEND_URL||'http://127.0.0.1:5173');
  if(!['http:','https:'].includes(origin.protocol)||(process.env.NODE_ENV==='production'&&origin.protocol!=='https:'))throw Error('FRONTEND_URL inválido');
  const token=crypto.randomBytes(40).toString('hex'),tokenHash=hash(token);
  let recipient;
  await db.sequelize.transaction(async transaction=>{
    const user=await db.Usuario.findOne({where:{correo,activo:true},transaction,lock:transaction.LOCK.UPDATE});
    if(!user)return;
    const old=await db.RecuperacionPassword.findByPk(user.id,{transaction});
    if(old&&Date.now()-old.creado.getTime()<60000)return;
    const data={usuarioId:user.id,tokenHash,creado:new Date(),vence:new Date(Date.now()+900000),sesionVersion:user.sesionVersion};
    if(old)await old.update(data,{transaction});else await db.RecuperacionPassword.create(data,{transaction});
    recipient=user;
  });
  if(recipient){
    const url=new URL('/restablecer',origin.origin);url.hash='token='+token;
    // La respuesta HTTP no espera al servidor SMTP ni revela su tiempo de entrega.
    setImmediate(async()=>{
      try {await mail.send(recipient.correo,url.toString());}
      catch {
        try{await db.RecuperacionPassword.destroy({where:{usuarioId:recipient.id,tokenHash}});}catch{}
        console.error('No se pudo entregar un correo de recuperación. Revise la configuración SMTP.');
      }
    });
  }
  return message;
};
exports.reset=async(body)=>{
  v.object(body,['token','password']);
  if(typeof body.token!=='string'||!/^[a-f0-9]{80}$/.test(body.token))v.fail('Enlace inválido o vencido.');
  const tokenHash=hash(body.token),password=await auth.hash(body.password);
  const record=await db.RecuperacionPassword.findOne({where:{tokenHash}});
  if(!record)v.fail('Enlace inválido o vencido.');
  await db.sequelize.transaction(async transaction=>{
    const user=await db.Usuario.findByPk(record.usuarioId,{transaction,lock:transaction.LOCK.UPDATE});
    const current=await db.RecuperacionPassword.findByPk(record.usuarioId,{transaction,lock:transaction.LOCK.UPDATE});
    if(!user?.activo||!current||current.tokenHash!==tokenHash||current.vence<=new Date()||current.sesionVersion!==user.sesionVersion)v.fail('Enlace inválido o vencido.');
    await user.update({password,sesionVersion:user.sesionVersion+1},{transaction});
    await current.destroy({transaction});
  });
};
