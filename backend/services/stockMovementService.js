const db=require('../models');
const v=require('./validation');
const audit=require('./auditService');
exports.record=async(product,before,after,tipo,motivo,pedidoId,transaction)=>db.MovimientoInventario.create({
  ...audit.actor(),productoId:product.id,productoNombre:product.nombre,pedidoId,fecha:new Date(),
  tipo,cantidad:after-before,stockAnterior:before,stockPosterior:after,motivo,
},{transaction});
exports.list=async(query)=>{
  v.object(query,['productoId','limite']);
  return db.MovimientoInventario.findAll({where:query.productoId?{productoId:v.integer(query.productoId)}:{},limit:Math.min(v.integer(query.limite||100,'limite'),500),order:[['id','DESC']]});
};
exports.create=async(body)=>{
  v.object(body,['productoId','tipo','cantidad','motivo']);
  const id=v.integer(body.productoId),motivo=v.text(body.motivo,'motivo',255);
  if(!['entrada','salida','ajuste'].includes(body.tipo))v.fail('Tipo de movimiento inválido.');
  const quantity=body.tipo==='ajuste'?v.nonnegative(body.cantidad,'cantidad'):v.integer(body.cantidad,'cantidad');
  return db.sequelize.transaction(async transaction=>{
    const product=await db.Producto.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});
    if(!product)v.fail('Producto no encontrado.',404);
    const before=product.stock;
    const after=body.tipo==='ajuste'?quantity:before+(body.tipo==='salida'?-quantity:quantity);
    if(after<0||after>2147483647)v.fail('El movimiento supera las existencias o el rango permitido.',409);
    if(after===before)v.fail('El ajuste no cambia las existencias.');
    await product.update({stock:after},{transaction});
    return exports.record(product,before,after,body.tipo,motivo,null,transaction);
  });
};
