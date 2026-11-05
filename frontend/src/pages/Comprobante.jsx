import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {pedidoService} from '../services/pedidoService';
import {currency,localDate,decimal,lineCents} from '../services/api';
import {Message} from '../components/UI';
export default function Comprobante() {
  const {id}=useParams(), [order,setOrder]=useState(null), [error,setError]=useState(''), [loading,setLoading]=useState(true);
  async function load() {setLoading(true);setError('');setOrder(null);try {setOrder(await pedidoService.get(id));} catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[id]);
  if(loading)return <p role="status">Cargando comprobante…</p>;
  if(error)return <><Message error={error}/><button onClick={load}>Reintentar</button></>;
  return <><div className="receipt-actions"><Link to="/pedidos">Volver a pedidos</Link><button onClick={()=>window.print()}>Imprimir comprobante</button></div>
    <article className="panel receipt">
      <header className="receipt-header"><img src="/sugar-mood-logo.png" alt="SUGAR MOOD"/><div><h1>Comprobante de pedido</h1><p>Pedido #{String(order.id).padStart(3,'0')}</p><span className={'badge '+order.estado}>{order.estado}</span></div></header>
      <div className="form-grid"><section><h2>Cliente</h2><p>{order.cliente?.nombre}</p><p>{order.cliente?.telefono}</p><p>{order.cliente?.direccion || 'Sin dirección registrada'}</p></section><section><h2>Fechas · Costa Rica</h2><p>Registro: {localDate(order.fecha)}</p><p>Entrega programada: {order.fechaEntrega ? localDate(order.fechaEntrega) : 'Sin programar'}</p></section></div>
      <div className="table-wrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead><tbody>{order.detalles.map(d=><tr key={d.id}><td>{d.producto?.nombre}</td><td>{d.cantidad}</td><td>{currency(d.precioUnitario)}</td><td>{currency(d.subtotal ?? decimal(lineCents(d.precioUnitario,d.cantidad)))}</td></tr>)}</tbody></table></div>
      <div className="order-total">Total<strong>{currency(order.total)}</strong></div>
      <p>Pagado: <strong>{currency(order.totalPagado||'0.00')}</strong> · Saldo pendiente: <strong>{currency(order.saldoPendiente??order.total)}</strong></p>
      {order.pagos?.length>0&&<section><h2>Historial de pagos</h2>{order.pagos.map(p=><p key={p.id}>{localDate(p.fecha)} · {p.metodo} · {currency(p.monto)} · {p.estado}{p.anulacionMotivo?' · '+p.anulacionMotivo:''}</p>)}</section>}
      {order.observaciones && <section><h2>Observaciones</h2><p className="observations">{order.observaciones}</p></section>}
      <p className="helper">Comprobante informativo del pedido. El estado del pedido no acredita su pago. No es una factura electrónica.</p>
      <p>Gracias por elegir SUGAR MOOD.</p>
    </article></>;
}
