import {api} from './api';
export const operacionService={
  movimientos:filters=>api.list('inventario/movimientos',filters),
  ajustar:body=>api.save('inventario/movimientos',null,body),
  pagos:filters=>api.list('pagos',filters),
  pagar:body=>api.save('pagos',null,body),
  anular:(id,motivo)=>api.request('/pagos/'+id+'/anular',{method:'POST',body:JSON.stringify({motivo})}),
  agenda:filters=>api.list('agenda',filters),
  auditoria:filters=>api.list('auditoria',filters),
  subirImagen:file=>api.request('/imagenes',{method:'POST',headers:{'Content-Type':file.type},body:file}),
};
