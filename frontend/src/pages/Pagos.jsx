import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {pedidoService} from '../services/pedidoService';
import {operacionService} from '../services/operacionService';
import {currency,localDate} from '../services/api';
import {Heading,Field,Message,Modal,Empty} from '../components/UI';
export default function Pagos(){
  const {can}=useAuth();
  const [rows,setRows]=useState([]),[orders,setOrders]=useState([]),[error,setError]=useState(''),[success,setSuccess]=useState(''),[loading,setLoading]=useState(true),[form,setForm]=useState(null),[target,setTarget]=useState(null),[motivo,setMotivo]=useState(''),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
  async function load(){setLoading(true);setError('');try{const [r,o]=await Promise.all([operacionService.pagos(),pedidoService.list()]);setRows(r);setOrders(o);}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  async function save(e){e.preventDefault();setBusy(true);setFormError('');try{if(target)await operacionService.anular(target.id,motivo);else await operacionService.pagar({...form,pedidoId:Number(form.pedidoId)});setForm(null);setTarget(null);await load();setSuccess(target?'Pago anulado. El historial se conserva.':'Abono registrado.');}catch(e){setFormError(e.message);}finally{setBusy(false);}}
  const selected=orders.find(o=>o.id===Number(form?.pedidoId));
  return <><Heading title="Pagos y abonos" description="Registra montos recibidos y consulta el saldo de cada pedido. Anular conserva el historial del pago." action={can('pagos','crear')&&<button onClick={()=>{setFormError('');setForm({pedidoId:'',monto:'',metodo:'efectivo',referencia:''});}}>+ Registrar abono</button>}/><Message error={error} success={success}/>
    <section className="panel"><div className="panel-toolbar"><h2>Saldos de pedidos</h2></div><div className="table-wrap"><table><thead><tr><th>Pedido / cliente</th><th>Total</th><th>Pagado</th><th>Pendiente</th><th>Estado de pago</th></tr></thead><tbody>{orders.filter(o=>o.estado!=='cancelado').map(o=><tr key={o.id}><td><Link to={'/pedidos/'+o.id+'/comprobante'}>#{o.id} · {o.cliente?.nombre}</Link></td><td>{currency(o.total)}</td><td>{currency(o.totalPagado||'0.00')}</td><td>{currency(o.saldoPendiente??o.total)}</td><td>{o.estadoPago||'pendiente'}</td></tr>)}</tbody></table></div></section>
    <section className="panel operation-section"><div className="panel-toolbar"><h2>Últimos 500 pagos</h2></div>{loading?<p role="status" className="empty">Cargando pagos…</p>:error?<button onClick={load}>Reintentar</button>:!rows.length?<Empty>No hay pagos registrados.</Empty>:<div className="table-wrap"><table><thead><tr><th>Pedido / fecha</th><th>Monto</th><th>Método / referencia</th><th>Responsable</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>#{r.pedidoId}<small>{localDate(r.fecha)}</small></td><td>{currency(r.monto)}</td><td>{r.metodo}<small>{r.referencia||'—'}</small></td><td>{r.usuarioNombre}</td><td>{r.estado}<small>{r.anulacionMotivo}</small></td><td>{r.estado==='registrado'&&can('pagos','anular')&&<button className="text-button delete" onClick={()=>{setTarget(r);setMotivo('');setFormError('');}}>Anular pago</button>}</td></tr>)}</tbody></table></div>}</section>
    {(form||target)&&<Modal title={target?'Anular pago #'+target.id:'Registrar abono'} onClose={()=>{setForm(null);setTarget(null);}} busy={busy}><Message error={formError}/><form onSubmit={save}><fieldset disabled={busy}>
      {target?<><p>Se anulará {currency(target.monto)} del pedido #{target.pedidoId}.</p><Field label="Motivo de anulación"><textarea required maxLength="255" value={motivo} onChange={e=>setMotivo(e.target.value)}/></Field></>:<>
      <Field label="Pedido"><select required value={form.pedidoId} onChange={e=>setForm({...form,pedidoId:e.target.value})}><option value="">Selecciona un pedido</option>{orders.filter(o=>o.estado!=='cancelado'&&Number(o.saldoPendiente??o.total)>0).map(o=><option key={o.id} value={o.id}>#{o.id} · {o.cliente?.nombre} · Saldo {currency(o.saldoPendiente??o.total)}</option>)}</select></Field>
      {selected&&<p>Saldo pendiente: <strong>{currency(selected.saldoPendiente??selected.total)}</strong></p>}
      <Field label="Monto recibido (₡)"><input required type="number" min="0.01" max={selected?.saldoPendiente||'99999999.99'} step="0.01" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})}/></Field>
      <Field label="Método de pago"><select value={form.metodo} onChange={e=>setForm({...form,metodo:e.target.value})}>{['efectivo','sinpe','transferencia','tarjeta'].map(m=><option key={m}>{m}</option>)}</select></Field>
      <Field label="Referencia (opcional)"><input maxLength="100" value={form.referencia} onChange={e=>setForm({...form,referencia:e.target.value})}/></Field></>}
      <button>{busy?'Guardando…':target?'Confirmar anulación':'Guardar abono'}</button>
    </fieldset></form></Modal>}
  </>;
}
