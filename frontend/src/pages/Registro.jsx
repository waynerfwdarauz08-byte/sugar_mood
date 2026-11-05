import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import { Field, Message } from "../components/UI";
export default function Registro() {
  const { usuario, login, cargando } = useAuth(),
    navigate = useNavigate();
  const [form, setForm] = useState({
      nombre: "",
      correo: "",
      password: "",
      telefono: "",
      direccion: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (cargando) return <p role="status">Recuperando sesión…</p>;
  if (usuario) return <Navigate to="/pedidos" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await authService.register(form);
      await login({ correo: form.correo, password: form.password });
      navigate("/pedidos", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-card">
      <p className="eyebrow">TU PRÓXIMO MOMENTO DULCE</p>
      <h1>Crea tu cuenta.</h1>
      <p>Regístrate como cliente para gestionar tus pedidos.</p>
      <Message error={error} />
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {[
            ["nombre", "Nombre", "text", 100],
            ["correo", "Correo electrónico", "email", 254],
            ["telefono", "Teléfono", "tel", 20],
            ["password", "Contraseña", "password", 72],
          ].map(([name, label, type, max]) => (
            <Field key={name} label={label}>
              <input
                required
                name={name}
                type={type}
                maxLength={max}
                minLength={name === "password" ? 8 : undefined}
                autoComplete={
                  name === "password"
                    ? "new-password"
                    : name === "correo"
                      ? "email"
                      : name === "nombre"
                        ? "name"
                        : "tel"
                }
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="Dirección (opcional)">
            <textarea
              maxLength="255"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </Field>
          <p className="helper">
            Contraseña de al menos 8 caracteres y hasta 72 bytes UTF-8.
          </p>
          <button type="submit">
            {busy ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </fieldset>
      </form>
      <p>
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </section>
  );
}
