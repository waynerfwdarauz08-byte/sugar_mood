import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {operacionService} from '../services/operacionService';
import {inputDate,localDate} from '../services/api';
import {Heading,Field,Message,Empty} from '../components/UI';
const date=offset=>inputDate(new Date(Date.now()+offset*86400000)).slice(0,10);
export default function Agenda(){
  const [filters,setFilters]=useState({desde:date(0),hasta:date(6),estado:''}),[applied,setApplied]=useState(null),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function load(){setLoading(true);setError('');try{setRows(await operacionService.agenda(applied||filters));}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[applied]);
  return <><Heading title="Agenda de entregas" description="Entregas programadas en Costa Rica. Inicialmente muestra hoy y los próximos seis días; excluye cancelados."/>
    <form className="panel order-filters" onSubmit={e=>{e.preventDefault();setApplied({...filters});}}><Field label="Desde"><input required type="date" value={filters.desde} onChange={e=>setFilters({...filters,desde:e.target.value})}/></Field><Field label="Hasta"><input required type="date" min={filters.desde} value={filters.hasta} onChange={e=>setFilters({...filters,hasta:e.target.value})}/></Field><Field label="Estado"><select value={filters.estado} onChange={e=>setFilters({...filters,estado:e.target.value})}><option value="">Todos excepto cancelados</option>{['pendiente','preparado','entregado','cancelado'].map(s=><option key={s}>{s}</option>)}</select></Field><button>Consultar agenda</button></form>
    <Message error={error}/>{loading?<p role="status">Cargando entregas…</p>:error?<button onClick={load}>Reintentar</button>:!rows.length?<Empty>No hay entregas programadas para este período.</Empty>:<section className="agenda-grid">{rows.map(o=><article className="panel agenda-card" key={o.id}><span className={'badge '+o.estado}>{o.estado}</span><h2>{localDate(o.fechaEntrega)}</h2><p><strong>{o.cliente?.nombre}</strong> · {o.cliente?.telefono}</p><p>{o.cliente?.direccion||'Sin dirección registrada'}</p>{o.observaciones&&<p className="observations">{o.observaciones}</p>}<Link to={'/pedidos/'+o.id+'/comprobante'}>Ver pedido #{o.id}</Link></article>)}</section>}
  </>;
}
