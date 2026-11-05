import {useEffect,useState} from 'react';
import {operacionService} from '../services/operacionService';
import {localDate} from '../services/api';
import {Heading,Field,Message,Empty,Modal} from '../components/UI';
export default function Auditoria(){
  const [rows,setRows]=useState([]),[entity,setEntity]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[view,setView]=useState(null);
  async function load(){setLoading(true);setError('');try{setRows(await operacionService.auditoria({entidad:entity}));}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[entity]);
  return <><Heading title="Historial de cambios" description="Últimos 100 cambios realizados desde la aplicación. Consulta quién modificó cada registro y sus valores anteriores."/><Message error={error}/><section className="panel"><div className="panel-toolbar"><h2>Auditoría</h2><Field label="Filtrar entidad"><select value={entity} onChange={e=>setEntity(e.target.value)}><option value="">Todas</option>{['categorias','productos','clientes','pedidos','detalles_pedido','usuarios','roles','pagos'].map(e=><option key={e}>{e}</option>)}</select></Field></div>
    {loading?<p className="empty" role="status">Cargando cambios…</p>:error?<button onClick={load}>Reintentar</button>:!rows.length?<Empty>No hay cambios registrados.</Empty>:<div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Responsable</th><th>Entidad / registro</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{localDate(r.fecha)}</td><td>{r.usuarioNombre}</td><td>{r.entidad} #{r.registroId}</td><td>{r.accion}</td><td><button className="text-button" onClick={()=>setView(r)}>Ver cambio</button></td></tr>)}</tbody></table></div>}</section>
    {view&&<Modal title={'Cambio #'+view.id} onClose={()=>setView(null)}><p>{view.usuarioNombre} · {localDate(view.fecha)}</p><div className="audit-values"><section><h3>Antes</h3><pre>{JSON.stringify(view.antes,null,2)}</pre></section><section><h3>Después</h3><pre>{JSON.stringify(view.despues,null,2)}</pre></section></div></Modal>}
  </>;
}
