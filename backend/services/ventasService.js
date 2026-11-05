const {Op} = require('sequelize');
const db = require('../models');
const v = require('./validation');
const {range} = require('./orderFilters');
const localDay = date => new Date(+date - 21600000).toISOString().slice(0,10);
module.exports = async (query) => {
  v.object(query,['desde','hasta']);
  const today = localDay(new Date());
  const defaults = {desde:localDay(new Date(Date.now()-29*86400000)),hasta:today};
  const dates = {...defaults,...query};
  const {from,until} = range(dates), duration = until-from;
  if (!from || !until || duration < 86400000 || duration > 366*86400000) v.fail('Selecciona un período de 1 a 366 días.');
  const previousFrom = new Date(+from-duration);
  const orders = await db.Pedido.findAll({
    where:{estado:'entregado',fecha:{[Op.gte]:previousFrom,[Op.lt]:until}},
    include:[{model:db.DetallePedido,as:'detalles',include:[{model:db.Producto,as:'producto'}]}],
    order:[['fecha','ASC']],
  });
  const summarize = rows => {
    let cents=0n, unidades=0;
    for(const order of rows) for(const d of order.detalles) {cents+=v.cents(d.precioUnitario)*BigInt(d.cantidad);unidades+=d.cantidad;}
    return {total:v.decimal(cents),pedidos:rows.length,unidades,ticketPromedio:v.decimal(rows.length ? (cents+BigInt(Math.floor(rows.length/2)))/BigInt(rows.length):0n)};
  };
  const current=orders.filter(o=>o.fecha>=from), previous=orders.filter(o=>o.fecha<from);
  const resumen=summarize(current), anterior=summarize(previous), products=new Map(), days=new Map();
  for(let date=+from;date<+until;date+=86400000)days.set(localDay(new Date(date)),0n);
  for(const order of current) for(const d of order.detalles) {
    const amount=v.cents(d.precioUnitario)*BigInt(d.cantidad), day=localDay(order.fecha);
    days.set(day,days.get(day)+amount);
    const item=products.get(d.productoId)||{productoId:d.productoId,nombre:d.producto.nombre,unidades:0,cents:0n};
    item.unidades+=d.cantidad;item.cents+=amount;products.set(d.productoId,item);
  }
  const base=v.cents(anterior.total), difference=v.cents(resumen.total)-base;
  return {periodo:dates,periodoAnterior:{desde:localDay(previousFrom),hasta:localDay(new Date(+from-86400000))},resumen,anterior,
    variacionPorcentaje:base ? Number(difference*10000n/base)/100 : null,
    dias:[...days].map(([fecha,cents])=>({fecha,total:v.decimal(cents)})),
    productos:[...products.values()].sort((a,b)=>b.unidades-a.unidades||a.productoId-b.productoId).slice(0,10).map(({cents,...p})=>({...p,total:v.decimal(cents)}))};
};
