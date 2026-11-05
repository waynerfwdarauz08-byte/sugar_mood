import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { detallePedidoService as service } from "../services/detallePedidoService";
import { pedidoService } from "../services/pedidoService";
import { productoService } from "../services/productoService";
import { currency } from "../services/api";
import {
  Heading,
  Message,
  Empty,
  Actions,
  Modal,
  Field,
  ConfirmDelete,
} from "../components/UI";
export default function DetallesPedido() {
  const { usuario, can } = useAuth();
  const isAdmin=usuario?.rol.codigo !== "cliente";
  const [rows, setRows] = useState([]),
    [orders, setOrders] = useState([]),
    [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [form, setForm] = useState(null),
    [target, setTarget] = useState(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, o, p] = await Promise.all([
        service.list(),
        pedidoService.list(),
        productoService.list(),
      ]);
      setRows(r);
      setOrders(o);
      setProducts(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function open(row) {
    setSuccess("");
    setFormError("");
    setForm(
      row
        ? {
            id: row.id,
            pedidoId: row.pedidoId,
            productoId: row.productoId,
            cantidad: row.cantidad,
            precioUnitario: row.precioUnitario,
          }
        : { pedidoId: "", productoId: "", cantidad: 1 },
    );
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await service.save(
        form.id,
        form.id
          ? { cantidad: Number(form.cantidad) }
          : {
              pedidoId: Number(form.pedidoId),
              productoId: Number(form.productoId),
              cantidad: Number(form.cantidad),
            },
      );
      setForm(null);
      await load();
      setSuccess("Detalle guardado correctamente.");
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
      await service.remove(target.id);
      setTarget(null);
      await load();
      setSuccess("Detalle eliminado.");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const editable = orders.filter((o) =>
    isAdmin ? ["pendiente", "preparado"].includes(o.estado) : o.estado === "pendiente",
  );
  const selectedOrder = orders.find((o) => o.id === Number(form?.pedidoId));
  const available = products.filter(
    (p) =>
      p.activo && !selectedOrder?.detalles.some((d) => d.productoId === p.id),
  );
  return (
    <>
      <Heading
        eyebrow="LÍNEAS DE PEDIDO"
        title={isAdmin ? "Detalles de pedidos" : "Mis detalles"}
        description="Cada producto conserva su precio histórico. El último detalle no puede eliminarse."
        action={
          can("detalles-pedido","crear") && <button disabled={!editable.length} onClick={() => open()}>
            + Agregar detalle
          </button>
        }
      />
      <Message error={error} success={success} />
      <section className="panel">
        {loading ? (
          <p className="empty">Cargando…</p>
        ) : error ? (
          <div className="empty">
            <button onClick={load}>Reintentar</button>
          </div>
        ) : !rows.length ? (
          <Empty>Primero crea un pedido con sus productos.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio histórico</th>
                  <th>Subtotal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.pedidoId}</td>
                    <td>{r.producto?.nombre}</td>
                    <td>{r.cantidad}</td>
                    <td>{currency(r.precioUnitario)}</td>
                    <td>{currency(r.subtotal)}</td>
                    <td>
                      {editable.some((o) => o.id === r.pedidoId) && (
                        <Actions canEdit={can("detalles-pedido","editar")} canDelete={can("detalles-pedido","eliminar")}
                          onEdit={() => open(r)}
                          onDelete={() => {
                            setFormError("");
                            setSuccess("");
                            setTarget(r);
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {form && (
        <Modal
          title={form.id ? "Editar cantidad" : "Agregar detalle"}
          busy={busy}
          onClose={() => setForm(null)}
        >
          <Message error={formError} />
          <form onSubmit={save}>
            <fieldset disabled={busy}>
              {!form.id ? (
                <>
                  <Field label="Pedido existente">
                    <select
                      required
                      value={form.pedidoId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          pedidoId: e.target.value,
                          productoId: "",
                        })
                      }
                    >
                      <option value="">Selecciona un pedido</option>
                      {editable.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.id} · {o.cliente?.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Producto activo">
                    <select
                      required
                      value={form.productoId}
                      onChange={(e) =>
                        setForm({ ...form, productoId: e.target.value })
                      }
                    >
                      <option value="">Selecciona un producto</option>
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} · {currency(p.precio)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {form.pedidoId && !available.length && (
                    <p>No hay productos activos sin agregar en este pedido.</p>
                  )}
                </>
              ) : (
                <p>
                  Pedido #{form.pedidoId} · Precio histórico:{" "}
                  {currency(form.precioUnitario)}
                </p>
              )}
              <Field label="Cantidad">
                <input
                  required
                  type="number"
                  min="1"
                  max="2147483647"
                  step="1"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({ ...form, cantidad: e.target.value })
                  }
                />
              </Field>
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setForm(null)}
                >
                  Cancelar
                </button>
                <button type="submit">
                  {busy ? "Guardando…" : "Guardar detalle"}
                </button>
              </div>
            </fieldset>
          </form>
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
