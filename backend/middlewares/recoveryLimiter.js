// Límite por proceso, sin confiar en X-Forwarded-For de clientes externos.
const entries=new Map();
module.exports=(req,res,next)=>{
  const now=Date.now();
  for(const [key,value]of entries)if(value.until<=now)entries.delete(key);
  const key=req.ip;
  let entry=entries.get(key);
  if(!entry){if(entries.size>=10000)return res.status(429).json({error:'Reintenta más tarde.'});entry={count:0,until:now+900000};entries.set(key,entry);}
  if(++entry.count>10)return res.status(429).json({error:'Demasiados intentos. Reintenta en 15 minutos.'});
  next();
};
