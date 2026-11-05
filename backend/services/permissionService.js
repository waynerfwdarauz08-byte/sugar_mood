const v=require('./validation');
const resources={
  categorias:['leer','crear','editar','eliminar'],productos:['leer','crear','editar','eliminar'],
  clientes:['leer','crear','editar','eliminar'],pedidos:['leer','crear','editar','eliminar'],
  'detalles-pedido':['leer','crear','editar','eliminar'],inventario:['leer','crear'],
  pagos:['leer','crear','anular'],agenda:['leer'],ventas:['leer'],auditoria:['leer'],
};
const catalog=Object.entries(resources).flatMap(([r,actions])=>actions.map(a=>r+'.'+a));
const clientAllowed=new Set(['categorias.leer','productos.leer','clientes.leer','clientes.editar','pedidos.leer','pedidos.crear','pedidos.editar','pedidos.eliminar','detalles-pedido.leer','detalles-pedido.crear','detalles-pedido.editar','detalles-pedido.eliminar','pagos.leer','agenda.leer']);
const can=(user,resource,action='leer')=>user?.rol?.codigo==='administrador'||user?.rol?.permisos?.includes(resource+'.'+action);
function requirePermission(user,resource,action='leer') {
  if(!can(user,resource,action)) v.fail('No tienes permiso para realizar esta operación.',403);
}
function validate(permisos,codigo) {
  if(!Array.isArray(permisos)||permisos.some(p=>typeof p!=='string'||!catalog.includes(p))||new Set(permisos).size!==permisos.length) v.fail('Lista de permisos inválida.');
  if(codigo==='administrador') v.fail('El Administrador conserva todos los permisos.',409);
  if(codigo==='cliente'&&permisos.some(p=>!clientAllowed.has(p))) v.fail('El Cliente solo puede recibir permisos sobre su propio perfil y pedidos.',400);
  for(const p of permisos) {
    const [resource,action]=p.split('.');
    if(action!=='leer'&&!permisos.includes(resource+'.leer')) v.fail('Un permiso de escritura requiere consultar el mismo recurso.');
  }
  if(permisos.some(p=>p.startsWith('pagos.')||p.startsWith('agenda.')||p.startsWith('detalles-pedido.'))&&!permisos.includes('pedidos.leer')) v.fail('Pagos, agenda y detalles requieren consultar pedidos.');
  if(permisos.includes('inventario.crear')&&!permisos.includes('productos.leer')) v.fail('Ajustar inventario requiere consultar productos.');
  if(permisos.some(p=>['productos.crear','productos.editar'].includes(p))&&!permisos.includes('categorias.leer'))v.fail('Editar productos requiere consultar categorías.');
  if(permisos.some(p=>['pedidos.crear','pedidos.editar'].includes(p))&&(!permisos.includes('productos.leer')||!permisos.includes('clientes.leer')))v.fail('Crear o editar pedidos requiere consultar productos y clientes.');
  if(permisos.some(p=>p.startsWith('detalles-pedido.'))&&!permisos.includes('productos.leer'))v.fail('Consultar detalles requiere consultar productos.');
  return permisos;
}
module.exports={catalog,can,requirePermission,validate};
