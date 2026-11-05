import {useEffect,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {productoService} from '../services/productoService';
import {operacionService} from '../services/operacionService';
import {localDate} from '../services/api';
import {Heading,Field,Message,Modal,Empty} from '../components/UI';
export default function Inventario(){
  const {can}=useAuth();
  const [rows,setRows]=useState([]),[products,setProducts]=useState([]),[filter,setFilter]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(''),[loading,setLoading]=useState(true),[form,setForm]=useState(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
  async function load(){setLoading(true);setError('');try{const [r,p]=await Promise.all([operacionService.movimientos({productoId:filter}),can('productos')?productoService.list():Promise.resolve([])]);setRows(r);setProducts(p);}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[filter]);
  async function save(e){e.preventDefault();setBusy(true);setFormError('');try{await operacionService.ajustar({...form,productoId:Number(form.productoId),cantidad:Number(form.cantidad)});setForm(null);await load();setSuccess('Movimiento registrado.');}catch(e){setFormError(e.message);}finally{setBusy(false);}}
  return <><Heading title="Inventario" description="Entradas, salidas, ajustes y reservas de pedidos. Cada movimiento conserva su motivo y responsable." action={can('inventario','crear')&&<button onClick={()=>{setFormError('');setForm({productoId:'',tipo:'entrada',cantidad:1,motivo:''});}}>+ Registrar movimiento</button>}/>
    <Message error={error} success={success}/><section className="panel"><div className="panel-toolbar"><h2>Últimos 100 movimientos</h2><Field label="Filtrar producto"><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos</option>{products.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field></div>
    {loading?<p className="empty" role="status">Cargando inventario…</p>:error?<button onClick={load}>Reintentar</button>:!rows.length?<Empty>No hay movimientos.</Empty>:<div className="table-wrap"><table><thead><tr><th>Fecha / responsable</th><th>Producto / motivo</th><th>Tipo</th><th>Variación</th><th>Antes → después</th><th>Pedido</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{localDate(r.fecha)}<small>{r.usuarioNombre}</small></td><td>{r.productoNombre}<small>{r.motivo}</small></td><td>{r.tipo}</td><td>{r.cantidad>0?'+':''}{r.cantidad}</td><td>{r.stockAnterior} → {r.stockPosterior}</td><td>{r.pedidoId?'#'+r.pedidoId:'—'}</td></tr>)}</tbody></table></div>}</section>
    {form&&<Modal title="Movimiento de inventario" onClose={()=>setForm(null)} busy={busy}><Message error={formError}/><form onSubmit={save}><fieldset disabled={busy}>
      <Field label="Producto"><select required value={form.productoId} onChange={e=>setForm({...form,productoId:e.target.value})}><option value="">Selecciona un producto</option>{products.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.stock} disponibles</option>)}</select></Field>
      <Field label="Tipo de movimiento"><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option value="entrada">Entrada de unidades</option><option value="salida">Salida de unidades</option><option value="ajuste">Ajustar conteo disponible</option></select></Field>
      <Field label={form.tipo==='ajuste'?'Nuevo conteo disponible':'Unidades'}><input required type="number" min={form.tipo==='ajuste'?0:1} max="2147483647" step="1" value={form.cantidad} onChange={e=>setForm({...form,cantidad:e.target.value})}/></Field>
      <Field label="Motivo"><textarea required maxLength="255" value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})}/></Field>
      <p className="helper">El conteo disponible excluye unidades que ya están reservadas por pedidos.</p><button>{busy?'Guardando…':'Guardar movimiento'}</button>
    </fieldset></form></Modal>}
  </>;
}
