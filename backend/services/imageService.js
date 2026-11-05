const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const v=require('./validation');
const testName=process.env.DB_TEST_NAME||'';
const root=process.env.NODE_ENV==='test'&&process.env.RUN_MYSQL_TESTS==='1'&&/^sugar_mood_test_\d+_[a-f0-9]+$/.test(testName)
  ? path.resolve(require('node:os').tmpdir(),testName,'imagenes')
  : path.resolve(__dirname,'../uploads/productos');
exports.root=root;
exports.validatePath=value=>{
  if(value===null||value==='')return null;
  if(typeof value!=='string'||!/^\/api\/imagenes\/[a-f0-9]{64}\.(png|jpg)$/.test(value))v.fail('La imagen debe cargarse desde el selector de archivos.');
  return value;
};
exports.upload=async(buffer,type)=>{
  if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>2*1024*1024)v.fail('Carga una imagen de hasta 2 MB.');
  let extension;
  if(type==='image/png'&&buffer.length>=33&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&buffer.toString('ascii',12,16)==='IHDR'){
    const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20);
    if(!width||!height||width>8000||height>8000||!buffer.includes(Buffer.from('IEND')))v.fail('PNG inválido o demasiado grande.');
    extension='png';
  }else if(type==='image/jpeg'&&buffer.length>=4&&buffer[0]===255&&buffer[1]===216&&buffer.at(-2)===255&&buffer.at(-1)===217){extension='jpg';}
  else v.fail('Solo se admiten imágenes PNG o JPEG válidas.');
  try {
    const image=require('sharp')(buffer,{limitInputPixels:64000000,failOn:'warning'});
    const metadata=await image.metadata();
    if(!['png','jpeg'].includes(metadata.format)||!metadata.width||!metadata.height||metadata.width>8000||metadata.height>8000)v.fail('Imagen inválida o demasiado grande.');
    // Re-codifica para descartar metadatos y cualquier contenido ajeno a la imagen.
    buffer=await image.rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true})[extension==='png'?'png':'jpeg']().toBuffer();
  }catch{v.fail('No se pudo leer la imagen. Selecciona un PNG o JPEG válido.');}
  const name=crypto.createHash('sha256').update(buffer).digest('hex')+'.'+extension;
  await fs.mkdir(root,{recursive:true});
  try{await fs.writeFile(path.join(root,name),buffer,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
  return {imagen:'/api/imagenes/'+name};
};
