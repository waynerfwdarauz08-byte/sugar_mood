const db=require('../models');
const v=require('./validation');
const access=require('./accessService');
const audit=require('./auditService');
function paid(payments) {return payments.filter(p=>p.estado==='registrado').reduce((sum,p)=>sum+v.cents(p.monto),0n);}
exports.summary=order=>{
  const total=v.cents(order.total),totalPaid=paid(order.pagos||[]);
  return {totalPagado:v.decimal(totalPaid),saldoPendiente:order.estado==='cancelado'?'0.00':v.decimal(total-totalPaid),estadoPago:order.estado==='cancelado'?'cancelado':totalPaid===total?'pagado':totalPaid>0n?'parcial':'pendiente'};
};
exports.validateOrder=async(order,lines,prices,state,transaction)=>{
  const payments=await db.Pago.findAll({where:{pedidoId:order.id},transaction});
  const amount=paid(payments);
  if(state==='cancelado'&&amount>0n)v.fail('Anula los pagos antes de cancelar el pedido.',409);
  const total=lines.reduce((sum,d)=>sum+v.cents(prices.get(d.productoId))*BigInt(d.cantidad),0n);
  if(amount>total)v.fail('El total del pedido no puede ser menor que sus pagos registrados.',409);
};
exports.list=async(user,query)=>{
  v.object(query,['pedidoId']);
  const where=query.pedidoId?{pedidoId:v.integer(query.pedidoId)}:{};
  if(query.pedidoId){const order=await db.Pedido.findByPk(where.pedidoId);if(!order)v.fail('Pedido no encontrado.',404);await access.check('pedidos',order,user);}
  return db.Pago.findAll({where,include:[{model:db.Pedido,as:'pedido',attributes:['id','clienteId'],...(user.rol.codigo==='cliente'?{required:true,where:{clienteId:access.clientId(user)}}:{})}],limit:500,order:[['id','DESC']]});
};
exports.create=async(user,body)=>{
  v.object(body,['pedidoId','monto','metodo','referencia']);
  const pedidoId=v.integer(body.pedidoId),monto=v.money(body.monto),referencia=v.text(body.referencia,'referencia',100,true);
  if(v.cents(monto)<=0n)v.fail('El abono debe ser mayor que cero.');
  if(!['efectivo','sinpe','transferencia','tarjeta'].includes(body.metodo))v.fail('Método de pago inválido.');
  return db.sequelize.transaction(async transaction=>{
    const order=await db.Pedido.findByPk(pedidoId,{transaction,lock:transaction.LOCK.UPDATE});
    if(!order)v.fail('Pedido no encontrado.',404);
    await access.check('pedidos',order,user,transaction);
    if(order.estado==='cancelado')v.fail('No se pueden registrar pagos en un pedido cancelado.',409);
    const lines=await db.DetallePedido.findAll({where:{pedidoId},transaction});
    const total=lines.reduce((sum,d)=>sum+v.cents(d.precioUnitario)*BigInt(d.cantidad),0n);
    const payments=await db.Pago.findAll({where:{pedidoId},transaction});
    if(paid(payments)+v.cents(monto)>total)v.fail('El abono supera el saldo pendiente.',409);
    return db.Pago.create({...audit.actor(),pedidoId,monto,metodo:body.metodo,referencia,fecha:new Date()},{transaction});
  });
};
exports.annul=async(user,id,body)=>{
  v.object(body,['motivo']);const motivo=v.text(body.motivo,'motivo',255);
  const original=await db.Pago.findByPk(v.integer(id));if(!original)v.fail('Pago no encontrado.',404);
  return db.sequelize.transaction(async transaction=>{
    const parent=await db.Pedido.findByPk(original.pedidoId,{transaction,lock:transaction.LOCK.UPDATE});
    await access.check('pedidos',parent,user,transaction);
    const row=await db.Pago.findByPk(original.id,{transaction,lock:transaction.LOCK.UPDATE});
    if(row.estado==='anulado')v.fail('El pago ya fue anulado.',409);
    return row.update({estado:'anulado',anulacionMotivo:motivo,anuladoPor:user.nombre,fechaAnulacion:new Date()},{transaction});
  });
};
