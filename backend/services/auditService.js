const {AsyncLocalStorage}=require('node:async_hooks');
const context=new AsyncLocalStorage();
const fields={
  Categoria:['nombre','descripcion'],Producto:['categoriaId','nombre','precio','activo','stock','stockMinimo','imagen'],
  Cliente:['nombre','telefono','direccion','usuarioId'],Pedido:['clienteId','fecha','estado','fechaEntrega','observaciones','stockAplicado'],
  DetallePedido:['pedidoId','productoId','cantidad','precioUnitario'],Usuario:['nombre','correo','id_rol','activo'],
  Rol:['codigo','nombre','descripcion'],Pago:['pedidoId','monto','metodo','referencia','estado','anulacionMotivo','anuladoPor'],
};
const actor=()=>{const u=context.getStore()?.usuario;return {usuarioId:u?.id||null,usuarioNombre:u?.nombre||'Sistema / acceso público'};};
async function record(db,entidad,registroId,accion,antes,despues,transaction) {
  const responsible=actor();
  if(entidad==='usuarios'&&accion==='eliminar'&&registroId===responsible.usuarioId)responsible.usuarioId=null;
  await db.Auditoria.create({...responsible,fecha:new Date(),entidad,registroId,accion,antes,despues},{transaction});
}
function install(db) {
  for(const [name,keys] of Object.entries(fields)) {
    const pick=data=>data?Object.fromEntries(keys.filter(k=>data[k]!==undefined).map(k=>[k,data[k]])):null;
    for(const [hook,action] of [['afterCreate','crear'],['afterUpdate','editar'],['afterDestroy','eliminar']]) {
      db[name].addHook(hook,async(row,options)=>{
        if(options.audit===false)return;
        const after=action==='eliminar'?null:pick(row.get());
        if(name==='Usuario'&&row.changed('password')&&after)after.passwordActualizada=true;
        await record(db,row.constructor.tableName,row.id,action,action==='crear'?null:pick(row._previousDataValues),after,options.transaction);
      });
    }
  }
}
module.exports={context,actor,record,install};
