import { useEffect, useState } from "react";
import {operacionService} from "../services/operacionService";
import { currency } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { catalogServices, categoriaService } from "../services/catalogServices";
import {
  Heading,
  Message,
  Empty,
  Modal,
  ConfirmDelete,
  Field,
  Actions,
} from "../components/UI";
const settings = {
  categorias: {
    title: "Categorías",
    one: "categoría",
    description: "Organiza el catálogo para encontrar cada antojo.",
  },
  productos: {
    title: "Productos",
    one: "producto",
    description: "Cada creación, su categoría y su precio al día.",
  },
  clientes: {
    title: "Clientes",
    one: "cliente",
    description: "Las personas que le dan vida a SUGAR MOOD.",
  },
};
const blank = (kind) =>
  kind === "productos"
    ? { nombre: "", categoriaId: "", precio: "", activo: true, stock: 0, stockMinimo: 5, imagen: null }
    : kind === "clientes"
      ? { nombre: "", telefono: "", direccion: "" }
      : { nombre: "", descripcion: "" };
export default function CatalogPage({ kind }) {
  const { usuario, refresh, can } = useAuth();
  const isAdmin=usuario?.rol.codigo !== "cliente";
  const [imageFile,setImageFile]=useState(null);
  const service = catalogServices[kind];
  const s = settings[kind];
  const [rows, setRows] = useState([]),
    [categories, setCategories] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [warning, setWarning] = useState(""),
    [success, setSuccess] = useState(""),
    [form, setForm] = useState(null),
    [target, setTarget] = useState(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [query, setQuery] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    setWarning("");
    setSuccess("");
    try {
      const [items, cats] = await Promise.allSettled([
        service.list(),
        kind === "productos" ? categoriaService.list() : Promise.resolve([]),
      ]);
      if (items.status === "fulfilled") setRows(items.value);
      else setError(items.reason.message);
      if (cats.status === "fulfilled") setCategories(cats.value);
      else {
        setCategories([]);
        setWarning(
          "No se pudieron cargar las categorías. El listado sigue disponible; reintenta antes de guardar productos.",
        );
      }
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
    setImageFile(null);
    setSuccess("");
    setFormError("");
    setForm(
      row
        ? {
            ...blank(kind),
            ...Object.fromEntries(
              Object.keys(blank(kind)).map((k) => [k, row[k] ?? ""]),
            ),
            id: row.id,
          }
        : blank(kind),
    );
  }
  function change(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const { id, ...body } = form;
      if (kind === "productos") body.categoriaId = Number(body.categoriaId);
      if(kind === "productos" && imageFile) body.imagen=(await operacionService.subirImagen(imageFile)).imagen;
      await service.save(id, body);
      if (!isAdmin && kind === "clientes") await refresh();
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
  const filtered = rows.filter((r) =>
    r.nombre.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  return (
    <>
      <Heading
        eyebrow="TU NEGOCIO, EN ORDEN"
        title={!isAdmin && kind === "clientes" ? "Mi perfil" : s.title}
        description={s.description}
        action={
          can(kind,"crear") && (
            <button onClick={() => open()}>
              + {kind === "categorias" ? "Nueva" : "Nuevo"}{" "}
              {s.one === "producto"
                ? "producto"
                : s.one === "cliente"
                  ? "cliente"
                  : "categoría"}
            </button>
          )
        }
      />
      <Message error={error} success={success} />
      {warning && (
        <div>
          <Message error={warning} />
          <button className="secondary" onClick={load}>
            Reintentar categorías
          </button>
        </div>
      )}
      <section className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>
              {s.title} del negocio <span className="count">{rows.length}</span>
            </h2>
            <p>Consulta y administra tus registros.</p>
          </div>
          <label className="search">
            <span className="sr-only">Buscar por nombre</span>
            <input
              placeholder="Buscar por nombre…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <p className="empty" role="status">
            Cargando registros…
          </p>
        ) : error ? (
          <div className="empty">
            <p>No se pudo cargar la información.</p>
            <button onClick={load}>Reintentar</button>
          </div>
        ) : rows.length === 0 ? (
          <Empty>Crea tu primer registro para empezar.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  {kind === "productos" ? (
                    <>
                      <th>Categoría</th>
                      <th>Precio</th><th>Disponibles</th>
                      <th>Estado</th>
                    </>
                  ) : kind === "clientes" ? (
                    <>
                      <th>Teléfono</th>
                      <th>Dirección</th>
                    </>
                  ) : (
                    <th>Descripción</th>
                  )}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {kind === "productos" && r.imagen && <img className="product-thumb" src={r.imagen} alt={r.nombre} loading="lazy" />}
                      <strong>{r.nombre}</strong>
                      <small>#{String(r.id).padStart(3, "0")}</small>
                    </td>
                    {kind === "productos" ? (
                      <>
                        <td>{r.categoria?.nombre}</td>
                        <td>{currency(r.precio)}</td><td><strong>{r.stock ?? 0}</strong><small>{r.stock === 0 ? "Agotado" : r.stock <= r.stockMinimo ? "Stock bajo" : "En stock"}</small></td>
                        <td>
                          <span
                            className={
                              "badge " + (r.activo ? "entregado" : "cancelado")
                            }
                          >
                            {r.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </>
                    ) : kind === "clientes" ? (
                      <>
                        <td>{r.telefono}</td>
                        <td>{r.direccion || "—"}</td>
                      </>
                    ) : (
                      <td>{r.descripcion || "—"}</td>
                    )}
                    <td>
                      {(can(kind,"editar") || can(kind,"eliminar")) && (
                        <Actions
                          onEdit={() => open(r)}
                          onDelete={() => {
                            setSuccess("");
                            setFormError("");
                            setTarget(r);
                          }}
                          canEdit={can(kind,"editar")}
                          canDelete={can(kind,"eliminar")}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={
                        kind === "productos" ? 6 : kind === "clientes" ? 4 : 3
                      }
                    >
                      No hay coincidencias.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {form && (
        <Modal
          title={`${form.id ? "Editar" : "Crear"} ${s.one}`}
          onClose={() => setForm(null)}
          busy={busy}
        >
          <form onSubmit={save}>
            <Message error={formError} />
            <fieldset disabled={busy}>
              <Field label="Nombre">
                <input
                  autoFocus
                  required
                  maxLength={kind === "categorias" ? 80 : 100}
                  name="nombre"
                  value={form.nombre}
                  onChange={change}
                />
              </Field>
              {kind === "categorias" ? (
                <Field label="Descripción (opcional)">
                  <textarea
                    maxLength="255"
                    name="descripcion"
                    value={form.descripcion}
                    onChange={change}
                  />
                </Field>
              ) : kind === "clientes" ? (
                <>
                  <Field label="Teléfono">
                    <input
                      required
                      maxLength="20"
                      type="tel"
                      name="telefono"
                      value={form.telefono}
                      onChange={change}
                    />
                  </Field>
                  <Field label="Dirección (opcional)">
                    <textarea
                      maxLength="255"
                      name="direccion"
                      value={form.direccion}
                      onChange={change}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Categoría">
                    <select
                      required
                      name="categoriaId"
                      value={form.categoriaId}
                      onChange={change}
                    >
                      <option value="">Selecciona una categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {!categories.length && (
                    <p>Crea una categoría antes de guardar productos.</p>
                  )}
                  <Field label="Precio (₡)">
                    <input
                      required
                      type="number"
                      min="0"
                      max="99999999.99"
                      step="0.01"
                      name="precio"
                      value={form.precio}
                      onChange={change}
                    />
                  </Field>
                  <Field label="Unidades disponibles"><input required type="number" min="0" max="2147483647" step="1" name="stock" value={form.stock} onChange={change} /></Field>
                  <Field label="Avisar con esta cantidad o menos"><input required type="number" min="0" max="2147483647" step="1" name="stockMinimo" value={form.stockMinimo} onChange={change} /></Field>
                  <p className="helper">Introduce las unidades disponibles para nuevos pedidos; las unidades reservadas ya están descontadas.</p>
                  <Field label="Imagen del producto (PNG o JPEG, hasta 2 MB)"><input type="file" accept="image/png,image/jpeg" onChange={e=>{
                    const file=e.target.files?.[0];
                    if(file && (file.size>2*1024*1024 || !["image/png","image/jpeg"].includes(file.type))){setFormError("Selecciona un PNG o JPEG de hasta 2 MB.");e.target.value="";setImageFile(null);return;}
                    setFormError("");setImageFile(file||null);
                  }} /></Field>
                  {form.imagen && <div><img className="product-preview" src={form.imagen} alt="Imagen actual"/><button type="button" className="secondary" onClick={()=>setForm({...form,imagen:null})}>Quitar imagen actual</button></div>}
                  {imageFile && <p>Imagen seleccionada: {imageFile.name}</p>}
                  <label className="check">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={form.activo}
                      onChange={change}
                    />
                    Producto activo
                  </label>
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
                <button
                  type="submit"
                  disabled={kind === "productos" && !categories.length}
                >
                  {busy ? "Guardando…" : "Guardar " + s.one}
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
