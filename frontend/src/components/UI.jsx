import { useEffect, useRef } from "react";
export function Message({ error, success }) {
  return error ? (
    <div className="notice error" role="alert">
      {error}
    </div>
  ) : success ? (
    <div className="notice success" role="status">
      {success}
    </div>
  ) : null;
}
export function Heading({ eyebrow, title, description, action }) {
  return (
    <header className="heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Empty({ children }) {
  return (
    <div className="empty">
      <span>◇</span>
      <h3>Todavía no hay registros</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({ title, onClose, children, busy = false }) {
  const ref = useRef();
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          disabled={busy}
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ConfirmDelete({ onCancel, onConfirm, busy, error }) {
  return (
    <Modal title="Eliminar registro" onClose={onCancel} busy={busy}>
      <p>¿Deseas eliminar este registro? Esta acción no se puede deshacer.</p>
      <Message error={error} />
      <div className="form-actions">
        <button className="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </Modal>
  );
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Actions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      <button className="text-button" onClick={onEdit}>
        Editar
      </button>
      <button className="text-button delete" onClick={onDelete}>
        Eliminar
      </button>
    </div>
  );
}
