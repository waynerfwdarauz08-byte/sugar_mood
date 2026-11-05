const {Op} = require('sequelize');
const v = require('./validation');
function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) v.fail('Use fechas AAAA-MM-DD.');
  return v.date(value + 'T00:00:00-06:00');
}
function range(query) {
  const from = query.desde ? day(query.desde) : null;
  const last = query.hasta ? day(query.hasta) : null;
  if (from && last && from > last) v.fail('La fecha inicial no puede superar la final.');
  return {from, until: last ? new Date(+last + 86400000) : null};
}
exports.range = range;
exports.where = (query = {}) => {
  v.object(query, ['desde','hasta','estado','clienteId','buscar']);
  const {from, until} = range(query), where = {};
  if (from || until) where.fecha = {...(from ? {[Op.gte]:from}:{}), ...(until ? {[Op.lt]:until}:{})};
  if (query.estado) where.estado = v.state(query.estado);
  if (query.clienteId) where.clienteId = v.integer(query.clienteId,'clienteId');
  if (query.buscar) {
    const term = v.text(query.buscar,'buscar',100);
    // LOCATE evita que % y _ enviados por el usuario se conviertan en comodines.
    const {fn,col,where:expression} = require('sequelize');
    where[Op.or] = [expression(fn('LOCATE',term,col('cliente.nombre')),{[Op.gt]:0}), expression(fn('LOCATE',term,col('cliente.telefono')),{[Op.gt]:0})];
    if (/^\d+$/.test(term) && Number(term) <= 2147483647) where[Op.or].push({id:Number(term)});
  }
  return where;
};
