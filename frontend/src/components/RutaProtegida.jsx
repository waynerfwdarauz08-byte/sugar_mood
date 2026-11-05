import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function RutaProtegida({ admin = false }) {
  const { usuario, isAdmin, cargando } = useAuth();
  if (cargando) return <p role="status">Recuperando sesión…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (admin && !isAdmin)
    return (
      <section>
        <h1>Acceso restringido</h1>
        <p>Tu cuenta no tiene permisos para esta sección.</p>
      </section>
    );
  if (!["cliente", "administrador"].includes(usuario.rol?.codigo))
    return (
      <p>
        Este rol todavía no tiene permisos asignados. Contacta al administrador.
      </p>
    );
  return <Outlet />;
}
