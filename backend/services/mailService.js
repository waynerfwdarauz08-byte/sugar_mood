let testTransport;
function ready(){return Boolean(testTransport||(process.env.SMTP_HOST&&process.env.SMTP_FROM&&process.env.FRONTEND_URL));}
exports.ready=ready;
exports.send=async(to,url)=>{
  const mail={from:process.env.SMTP_FROM,to,subject:'Restablece tu contraseña de SUGAR MOOD',text:`Recibimos una solicitud para restablecer tu contraseña. Abre este enlace, válido por 15 minutos y un solo uso:\n\n${url}\n\nSi no solicitaste el cambio, ignora este mensaje.`};
  if(testTransport)return testTransport(mail);
  const port=Number(process.env.SMTP_PORT||587);
  const transport=require('nodemailer').createTransport({
    host:process.env.SMTP_HOST,port,secure:port===465,
    requireTLS:port!==465,
    auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,
    connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,disableFileAccess:true,disableUrlAccess:true,
  });
  try {await transport.sendMail(mail);}finally{transport.close();}
};
exports.setTestTransport=transport=>{
  if(process.env.NODE_ENV!=='test'||process.env.RUN_MYSQL_TESTS!=='1')throw Error('Solo disponible en pruebas aisladas');
  testTransport=transport;
};
