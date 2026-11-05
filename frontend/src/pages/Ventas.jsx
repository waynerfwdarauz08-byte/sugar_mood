import {useEffect,useState} from 'react';
import {currency,inputDate} from '../services/api';
import {reporteService} from '../services/reporteService';
import {Heading,Field,Message,Empty} from '../components/UI';
const date = offset => inputDate(new Date(Date.now()+offset*86400000)).slice(0,10);
export default function Ventas() {
  const [filters,setFilters]=useState({desde:date(-29),hasta:date(0)}), [applied,setApplied]=useState(null), [data,setData]=useState(null), [error,setError]=useState(''), [loading,setLoading]=useState(true);
  async function load() {
    setLoading(true);setError('');setData(null);
    try {setData(await reporteService.ventas(applied || filters));}catch(e){setError(e.message);}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[applied]);
  return <><Heading eyebrow="TU NEGOCIO EN NÚMEROS" title="Ventas" description="Pedidos entregados, agrupados por su fecha de registro en Costa Rica. Importes calculados con los precios históricos."/>
    <form className="panel order-filters" onSubmit={e=>{e.preventDefault();setApplied({...filters});}}><Field label="Desde"><input required type="date" value={filters.desde} onChange={e=>setFilters({...filters,desde:e.target.value})}/></Field><Field label="Hasta"><input required type="date" min={filters.desde} value={filters.hasta} onChange={e=>setFilters({...filters,hasta:e.target.value})}/></Field><button>Consultar ventas</button></form>
    <Message error={error}/>{error && <button onClick={load}>Reintentar</button>}{loading && <p role="status">Calculando ventas…</p>}
    {data && <>
      <div className="stats"><article><span>Ventas del período</span><strong>{currency(data.resumen.total)}</strong><small>{data.periodo.desde} al {data.periodo.hasta}</small></article><article><span>Pedidos entregados</span><strong>{data.resumen.pedidos}</strong><small>{data.resumen.unidades} unidades vendidas</small></article><article><span>Promedio por pedido</span><strong>{currency(data.resumen.ticketPromedio)}</strong><small>Solo pedidos entregados</small></article></div>
      <section className="panel sales-comparison"><h2>Comparación con el período anterior</h2><p>{data.periodoAnterior.desde} al {data.periodoAnterior.hasta}: <strong>{currency(data.anterior.total)}</strong> en {data.anterior.pedidos} pedidos.</p><p>{data.variacionPorcentaje === null ? 'Sin ventas anteriores para calcular un porcentaje de variación.' : `Variación de ventas: ${data.variacionPorcentaje > 0 ? '+' : ''}${data.variacionPorcentaje.toLocaleString('es-CR')} %`}</p></section>
      <section className="panel"><div className="panel-toolbar"><h2>Productos más vendidos</h2><span>Hasta 10 · por unidades</span></div>{!data.productos.length ? <Empty>No hay pedidos entregados en este período.</Empty>:<div className="table-wrap"><table><thead><tr><th>Producto</th><th>Unidades</th><th>Ventas</th></tr></thead><tbody>{data.productos.map(p=><tr key={p.productoId}><td>{p.nombre}</td><td>{p.unidades}</td><td>{currency(p.total)}</td></tr>)}</tbody></table></div>}</section>
      <section className="panel"><div className="panel-toolbar"><h2>Ventas por día</h2></div><div className="sales-days">{data.dias.map(d=><div className="sales-day" key={d.fecha}><span>{d.fecha}</span><div className="sales-track"><div style={{width:`${Math.max(0,Number(d.total)/Math.max(1,...data.dias.map(day=>Number(day.total)))*100)}%`}}/></div><strong>{currency(d.total)}</strong></div>)}</div></section>
    </>}
  </>;
}
