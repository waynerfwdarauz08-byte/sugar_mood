import { useEffect, useState } from "react";
import { usuarioService } from "../services/usuarioService";
import { rolService } from "../services/rolService";
import { clienteService } from "../services/clienteService";
import {
  Heading,
  Message,
  Modal,
  Field,
  Empty,
  Actions,
  ConfirmDelete,
} from "../components/UI";
export default function AccountPage({ kind }) {
  const isRole = kind === "roles",
    service = isRole ? rolService : usuarioService;
  const [rows, setRows] = useState([]),
    [roles, setRoles] = useState([]),
    [clients, setClients] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [form, setForm] = useState(null),
    [formError, setFormError] = useState(""),
    [target, setTarget] = useState(null),
    [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, s, c] = await Promise.all([
        service.list(),
        isRole ? Promise.resolve([]) : rolService.list(),
        isRole ? Promise.resolve([]) : clienteService.list(),
      ]);
      setRows(r);
      setRoles(s);
      setClients(c);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [kind]);
  function open(row) {
    setSuccess("");
    setFormError("");
    setForm(
      isRole
        ? {
            id: row?.id,
            codigo: row?.codigo || "",
            nombre: row?.nombre || "",
            descripcion: row?.descripcion || "",
          }
        : {
            id: row?.id,
            nombre: row?.nombre || "",
            correo: row?.correo || "",
            password: "",
            id_rol: row?.id_rol || "",
            telefono: row?.cliente?.telefono || "",
            direccion: row?.cliente?.direccion || "",
            clienteId: row?.cliente?.id || "",
          },
    );
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const { id, ...body } = form;
      if (!isRole) {
        body.id_rol = Number(body.id_rol);
        if (id && !body.password) delete body.password;
        if (body.clienteId) {
          body.clienteId = Number(body.clienteId);
          if (!body.telefono) delete body.telefono;
          if (!body.direccion) delete body.direccion;
        } else delete body.clienteId;
      }
      await service.save(id, body);
      setForm(null);
      await load();
      setSuccess("Registro guardado correctamente.");
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
      setSuccess("Registro eliminado correctamente.");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const clientRole =
    roles.find((r) => r.id === Number(form?.id_rol))?.codigo === "cliente";
  return (
    <>
      <Heading
        eyebrow="ADMINISTRACIÓN"
        title={isRole ? "Roles" : "Usuarios"}
        description={
          isRole
            ? "Roles del sistema y sus identificadores. Los permisos nuevos requieren definición en el backend."
            : "Cuentas y roles. El perfil de cliente conserva sus pedidos al eliminar una cuenta."
        }
        action={
          <button onClick={() => open()}>
            + {isRole ? "Nuevo rol" : "Nuevo usuario"}
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
          <Empty>Crea el primer registro.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>{isRole ? "Código" : "Correo"}</th>
                  {isRole && <th>Descripción</th>}
                  {!isRole && <th>Rol</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.nombre}
                      <small>#{row.id}</small>
                    </td>
                    <td>{isRole ? row.codigo : row.correo}</td>
                    {isRole && <td>{row.descripcion || "—"}</td>}
                    {!isRole && <td>{row.rol?.nombre}</td>}
                    <td>
                      <Actions
                        onEdit={() => open(row)}
                        onDelete={() => {
                          setSuccess("");
                          setFormError("");
                          setTarget(row);
                        }}
                        canDelete={
                          !isRole ||
                          !["administrador", "cliente"].includes(row.codigo)
                        }
                      />
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
          title={isRole ? "Rol" : "Usuario"}
          onClose={() => setForm(null)}
          busy={busy}
        >
          <Message error={formError} />
          <form onSubmit={save}>
            <fieldset disabled={busy}>
              <Field label="Nombre">
                <input
                  autoFocus
                  required
                  maxLength={isRole ? 80 : 100}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </Field>
              {isRole ? (
                <>
                  <Field label="Código estable">
                    <input
                      required
                      maxLength="40"
                      pattern="[a-z][a-z0-9_]*"
                      readOnly={
                        !!form.id &&
                        ["administrador", "cliente"].includes(form.codigo)
                      }
                      value={form.codigo}
                      onChange={(e) =>
                        setForm({ ...form, codigo: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Descripción (opcional)">
                    <textarea
                      maxLength="255"
                      value={form.descripcion}
                      onChange={(e) =>
                        setForm({ ...form, descripcion: e.target.value })
                      }
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Correo electrónico">
                    <input
                      required
                      type="email"
                      maxLength="254"
                      value={form.correo}
                      onChange={(e) =>
                        setForm({ ...form, correo: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label={
                      form.id
                        ? "Nueva contraseña (dejar vacía para conservar)"
                        : "Contraseña"
                    }
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      required={!form.id}
                      minLength="8"
                      maxLength="72"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Rol">
                    <select
                      required
                      value={form.id_rol}
                      onChange={(e) =>
                        setForm({ ...form, id_rol: e.target.value })
                      }
                    >
                      <option value="">Selecciona un rol</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Vincular cliente existente (opcional)">
                    <select
                      value={form.clienteId}
                      onChange={(e) =>
                        setForm({ ...form, clienteId: e.target.value })
                      }
                    >
                      <option value="">
                        {form.id
                          ? "Conservar perfil actual / crear si hace falta"
                          : "Crear perfil nuevo si el rol es Cliente"}
                      </option>
                      {clients
                        .filter((c) => !c.usuarioId || c.usuarioId === form.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} · #{c.id}
                          </option>
                        ))}
                    </select>
                  </Field>
                  {clientRole && (
                    <>
                      <Field label="Teléfono del perfil">
                        <input
                          type="tel"
                          required={!form.clienteId}
                          maxLength="20"
                          value={form.telefono}
                          onChange={(e) =>
                            setForm({ ...form, telefono: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Dirección (opcional)">
                        <textarea
                          maxLength="255"
                          value={form.direccion}
                          onChange={(e) =>
                            setForm({ ...form, direccion: e.target.value })
                          }
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setForm(null)}
                >
                  Cancelar
                </button>
                <button type="submit">{busy ? "Guardando…" : "Guardar"}</button>
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
