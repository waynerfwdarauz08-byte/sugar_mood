import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Field, Message } from "../components/UI";
export default function Login() {
  const { usuario, login, message, cargando, restaurar } = useAuth(),
    navigate = useNavigate();
  const [form, setForm] = useState({ correo: "", password: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (cargando) return <p role="status">Recuperando sesión…</p>;
  if (usuario) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card">
      <p className="eyebrow">BIENVENIDO A SUGAR MOOD</p>
      <h1>Un dulce regreso.</h1>
      <p>Inicia sesión para consultar tus productos y pedidos.</p>
      <Message error={error || message} />
      {message && (
        <button type="button" className="secondary" onClick={restaurar}>
          Reintentar sesión
        </button>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <Field label="Correo electrónico">
            <input
              required
              autoFocus
              type="email"
              maxLength="254"
              autoComplete="username"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
            />
          </Field>
          <Field label="Contraseña">
            <input
              required
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <button type="submit">
            {busy ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </fieldset>
      </form>
      <p>
        ¿Primera vez? <Link to="/registro">Crear cuenta de cliente</Link>
      </p>
      <p><Link to="/recuperar">Olvidé mi contraseña</Link></p>
      <small>
        La sesión se conserva al recargar y vence una hora después de iniciar
        sesión.
      </small>
    </section>
  );
}
