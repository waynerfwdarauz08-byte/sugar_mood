import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  currency,
  lineCents,
  decimal,
  localDate,
  inputDate,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { pedidoService } from "../services/pedidoService";
import { clienteService } from "../services/clienteService";
import { productoService } from "../services/productoService";
import {
  Heading,
  Message,
  Empty,
  Modal,
  ConfirmDelete,
  Field,
  Actions,
} from "../components/UI";
const states = ["pendiente", "preparado", "entregado", "cancelado"];
export default function OrdersPage() {
  const { usuario, can } = useAuth();
  const isAdmin=usuario?.rol.codigo !== "cliente";
  const [orders, setOrders] = useState([]),
    [clients, setClients] = useState([]),
    [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [warning, setWarning] = useState(""),
    [success, setSuccess] = useState(""),
    [form, setForm] = useState(null),
    [formError, setFormError] = useState(""),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState(null),
    [view, setView] = useState(null),
    [filter, setFilter] = useState("todos"),
    [filters,setFilters] = useState({buscar:"",clienteId:"",desde:"",hasta:""}),
    [applied,setApplied] = useState({});
  async function load() {
    setLoading(true);
    setError("");
    setWarning("");
    setSuccess("");
    try {
      const [o, c, p] = await Promise.allSettled([
        pedidoService.list(applied),
        clienteService.list(),
        productoService.list(),
      ]);
      if (o.status === "fulfilled") setOrders(o.value);
      else setError(o.reason.message);
      setClients(c.status === "fulfilled" ? c.value : []);
      setProducts(
        p.status === "fulfilled"
          ? [
              ...new Map(
                [
                  ...p.value,
                  ...(o.status === "fulfilled"
                    ? o.value.flatMap((order) =>
                        order.detalles.map((d) => d.producto),
                      )
                    : []),
                ]
                  .filter(Boolean)
                  .map((product) => [product.id, product]),
              ).values(),
            ]
          : [],
      );
      const failed = [
        c.status === "rejected" && "clientes",
        p.status === "rejected" && "productos",
      ].filter(Boolean);
      if (failed.length)
        setWarning(
          "No se pudieron cargar " +
            failed.join(" y ") +
            ". Puedes consultar los pedidos; reintenta antes de guardarlos.",
        );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [applied]);
  function open(order) {
    setSuccess("");
    setFormError("");
    setForm(
      order
        ? {
            id: order.id,
            clienteId: order.clienteId,
            fecha: inputDate(order.fecha),
            fechaEntrega: order.fechaEntrega ? inputDate(order.fechaEntrega) : "",
            observaciones: order.observaciones || "",
            estado: order.estado,
            detalles: order.detalles.map((d) => ({
              productoId: d.productoId,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              historical: true,
            })),
          }
        : {
            clienteId: isAdmin ? "" : usuario.cliente?.id || "",
            fecha: inputDate(),
            fechaEntrega: "",
            observaciones: "",
            estado: "pendiente",
            detalles: [{ productoId: "", cantidad: 1, precioUnitario: "0.00" }],
          },
    );
  }
  function updateLine(i, patch) {
    setForm((f) => ({
      ...f,
      detalles: f.detalles.map((d, j) => (i === j ? { ...d, ...patch } : d)),
    }));
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const body = {
        clienteId: Number(form.clienteId),
        fecha: new Date(form.fecha + "-06:00").toISOString(),
        estado: form.estado,
        fechaEntrega: form.fechaEntrega ? new Date(form.fechaEntrega + "-06:00").toISOString() : null,
        observaciones: form.observaciones,
        detalles: form.detalles.map((d) => ({
          productoId: Number(d.productoId),
          cantidad: Number(d.cantidad),
        })),
      };
      if (
        new Set(body.detalles.map((d) => d.productoId)).size !==
        body.detalles.length
      )
        throw new Error("No repitas productos en el pedido.");
      const saved = await pedidoService.save(form.id, body);
      setForm(null);
      await load();
      setSuccess(
        `Pedido #${saved.id} guardado. Total: ${currency(saved.total)}.`,
      );
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setFormError("");
    try {
      await pedidoService.remove(target.id);
      setTarget(null);
      await load();
      setSuccess("Pedido y detalles eliminados correctamente.");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = orders.filter(
      (o) => filter === "todos" || o.estado === filter,
    ),
    preview =
      form?.detalles.reduce(
        (sum, d) => sum + lineCents(d.precioUnitario, d.cantidad || 0),
        0n,
      ) || 0n;
  return (
    <>
      <Heading
        eyebrow="CADA PEDIDO, UN MOMENTO DULCE"
        title={isAdmin ? "Pedidos" : "Mis pedidos"}
        description="Del primer antojo a la entrega. Todo en un solo lugar."
        action={can("pedidos","crear") && <button onClick={() => open()}>+ Nuevo pedido</button>}
      />
      <div className="stats">
        <article>
          <span>Pedidos registrados</span>
          <strong>
            {loading ? "—" : orders.length.toString().padStart(2, "0")}
          </strong>
          <small>Todos tus pedidos</small>
        </article>
        <article>
          <span>Por preparar</span>
          <strong>
            {loading
              ? "—"
              : orders
                  .filter((o) => o.estado === "pendiente")
                  .length.toString()
                  .padStart(2, "0")}
          </strong>
          <small>El siguiente momento dulce</small>
        </article>
        <article className="blue-card">
          <span>Listos para entregar</span>
          <strong>
            {loading
              ? "—"
              : orders
                  .filter((o) => o.estado === "preparado")
                  .length.toString()
                  .padStart(2, "0")}
          </strong>
          <small>Un detalle que alegra el día ↗</small>
        </article>
      </div>
      <Message error={error} success={success} />
      {warning && (
        <div>
          <Message error={warning} />
          <button className="secondary" onClick={load}>
            Reintentar datos del pedido
          </button>
        </div>
      )}
      <form className="panel order-filters" onSubmit={e=>{e.preventDefault();setApplied({...filters,estado:filter === "todos" ? "" : filter});}}>
        <Field label="Buscar cliente, teléfono o pedido"><input maxLength="100" value={filters.buscar} onChange={e=>setFilters({...filters,buscar:e.target.value})} /></Field>
        {isAdmin && <Field label="Cliente del pedido"><select value={filters.clienteId} onChange={e=>setFilters({...filters,clienteId:e.target.value})}><option value="">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>}
        <Field label="Desde (fecha del pedido)"><input type="date" value={filters.desde} onChange={e=>setFilters({...filters,desde:e.target.value})} /></Field>
        <Field label="Hasta (Costa Rica)"><input type="date" min={filters.desde} value={filters.hasta} onChange={e=>setFilters({...filters,hasta:e.target.value})} /></Field>
        <button type="submit">Aplicar filtros</button><button type="button" className="secondary" onClick={()=>{setFilters({buscar:"",clienteId:"",desde:"",hasta:""});setFilter("todos");setApplied({});}}>Limpiar</button>
      </form>
      <section className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>
              Listado de pedidos <span className="count">{orders.length}</span>
            </h2>
            <p>Consulta los detalles y mantén cada pedido al día.</p>
          </div>
          <label className="filter">
            <span className="sr-only">Filtrar por estado</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="todos">Todos los estados</option>
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p className="empty" role="status">
            Cargando pedidos…
          </p>
        ) : error ? (
          <div className="empty">
            <p>No se pudo cargar la información.</p>
            <button onClick={load}>Reintentar</button>
          </div>
        ) : !orders.length ? (
          <Empty>
            Agrega un cliente y productos, y registra tu primer pedido.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido / Fecha</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total / Saldo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <button className="order-link" onClick={() => setView(o)}>
                        #{String(o.id).padStart(3, "0")}
                      </button>
                      <small>{localDate(o.fecha)}</small><small>Entrega: {o.fechaEntrega ? localDate(o.fechaEntrega) : "Sin programar"}</small>
                    </td>
                    <td>
                      <strong>{o.cliente?.nombre}</strong>
                      <small>
                        {o.detalles.length}{" "}
                        {o.detalles.length === 1 ? "producto" : "productos"}
                      </small>
                    </td>
                    <td>
                      <span className={"badge " + o.estado}>{o.estado}</span>
                    </td>
                    <td className="amount">{currency(o.total)}<small>Saldo: {currency(o.saldoPendiente ?? o.total)}</small></td>
                    <td>
                      <Link className="order-link" to={`/pedidos/${o.id}/comprobante`}>Comprobante</Link>
                      {o.estado !== "entregado" && (isAdmin || o.estado === "pendiente") && (
                        <Actions canEdit={can("pedidos","editar")} canDelete={can("pedidos","eliminar")}
                          onEdit={() => open(o)}
                          onDelete={() => {
                            setSuccess("");
                            setFormError("");
                            setTarget(o);
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan="5">No hay pedidos con este estado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="bottom-note">Un pequeño detalle. Una gran sonrisa.</p>
      {form && (
        <Modal
          title={form.id ? `Editar pedido #${form.id}` : "Nuevo pedido"}
          onClose={() => setForm(null)}
          busy={busy}
        >
          <form onSubmit={save}>
            <Message error={formError} />
            <fieldset disabled={busy}>
              <div className="form-grid">
                <Field label="Cliente">
                  <select
                    required
                    value={form.clienteId}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setForm({ ...form, clienteId: e.target.value })
                    }
                  >
                    <option value="">Selecciona un cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha y hora · Costa Rica">
                  <input
                    required
                    type="datetime-local"
                    step="1"
                    min="1000-01-01T00:00"
                    max="9999-12-31T23:59"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm({ ...form, fecha: e.target.value })
                    }
                  />
                </Field>
                <Field label="Entrega programada · Costa Rica (opcional)"><input type="datetime-local" step="1" min={form.fecha} value={form.fechaEntrega} onChange={e=>setForm({...form,fechaEntrega:e.target.value})} /></Field>
                <Field label="Observaciones (opcional)"><textarea maxLength="500" value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})} /></Field>
                <Field label="Estado">
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm({ ...form, estado: e.target.value })
                    }
                  >
                    {(isAdmin
                      ? states
                      : form.id
                        ? ["pendiente", "cancelado"]
                        : ["pendiente"]
                    ).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {!clients.length && (
                <p>Crea un cliente antes de guardar pedidos.</p>
              )}
              {!products.some((p) => p.activo) && (
                <p role="status">
                  No hay productos activos disponibles. Crea o activa un
                  producto para agregar nuevas líneas. Los productos históricos
                  del pedido se conservan.
                </p>
              )}
              <div className="lines-heading">
                <h3>Productos del pedido</h3>
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    !products.some(
                      (p) =>
                        p.activo &&
                        !form.detalles.some(
                          (d) => Number(d.productoId) === p.id,
                        ),
                    )
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      detalles: [
                        ...form.detalles,
                        { productoId: "", cantidad: 1, precioUnitario: "0.00" },
                      ],
                    })
                  }
                >
                  + Agregar línea
                </button>
              </div>
              {form.detalles.map((d, i) => (
                <div className="order-line" key={i}>
                  <Field label="Producto">
                    <select
                      required
                      value={d.productoId}
                      onChange={(e) => {
                        const p = products.find(
                          (p) => p.id === Number(e.target.value),
                        );
                        const original = orders
                          .find((o) => o.id === form.id)
                          ?.detalles.find((l) => l.productoId === p?.id);
                        updateLine(i, {
                          productoId: e.target.value,
                          precioUnitario:
                            original?.precioUnitario || p?.precio || "0.00",
                          historical: !!original,
                        });
                      }}
                    >
                      <option value="">Selecciona un producto</option>
                      {products
                        .filter(
                          (p) =>
                            (p.activo || p.id === Number(d.productoId)) &&
                            !form.detalles.some(
                              (l, j) =>
                                j !== i && Number(l.productoId) === p.id,
                            ),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                            {` · ${p.stock ?? 0} disponibles`}
                            {!p.activo ? " (inactivo)" : ""}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="Cantidad">
                    <input
                      required
                      type="number"
                      min="1"
                      max="2147483647"
                      step="1"
                      value={d.cantidad}
                      onChange={(e) =>
                        updateLine(i, { cantidad: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label={
                      d.historical ? "Precio histórico" : "Precio unitario"
                    }
                  >
                    <output>{currency(d.precioUnitario)}</output>
                  </Field>
                  <Field label="Subtotal">
                    <output>
                      {currency(
                        decimal(lineCents(d.precioUnitario, d.cantidad || 0)),
                      )}
                    </output>
                  </Field>
                  <button
                    className="text-button delete"
                    type="button"
                    disabled={form.detalles.length === 1}
                    onClick={() =>
                      setForm({
                        ...form,
                        detalles: form.detalles.filter((_, j) => i !== j),
                      })
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="order-total">
                <span>Total estimado</span>
                <strong>{currency(decimal(preview))}</strong>
              </div>
              <p className="helper">
                El servidor confirma los precios al guardar. Los productos
                existentes conservan el precio de su pedido.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setForm(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !clients.length ||
                    !products.length ||
                    (!form.id && !products.some((p) => p.activo))
                  }
                >
                  {busy ? "Guardando…" : "Guardar pedido"}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
      {view && (
        <Modal title={`Pedido #${view.id}`} onClose={() => setView(null)}>
          <p>
            <strong>{view.cliente?.nombre}</strong> · {view.cliente?.telefono}
          </p>
          <p>
            {localDate(view.fecha)} ·{" "}
            <span className={"badge " + view.estado}>{view.estado}</span>
          </p>
          <p>Entrega: {view.fechaEntrega ? localDate(view.fechaEntrega) : "Sin programar"}</p>
          {view.observaciones && <p className="observations">{view.observaciones}</p>}
          <Link to={"/pedidos/" + view.id + "/comprobante"}>Ver comprobante para imprimir</Link>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio histórico</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {view.detalles.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.producto?.nombre}
                      {!d.producto?.activo && (
                        <small>Actualmente inactivo</small>
                      )}
                    </td>
                    <td>{d.cantidad}</td>
                    <td>{currency(d.precioUnitario)}</td>
                    <td>{currency(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-total">
            Total<strong>{currency(view.total)}</strong>
          </div>
        </Modal>
      )}
      {target && (
        <ConfirmDelete
          busy={busy}
          error={formError}
          onCancel={() => setTarget(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}
