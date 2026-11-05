import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function RutaProtegida({ admin = false, resource }) {
  const { usuario, isAdmin, cargando, can } = useAuth();
  if (cargando) return <p role="status">Recuperando sesión…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if ((admin && !isAdmin) || (resource && !can(resource)))
    return (
      <section>
        <h1>Acceso restringido</h1>
        <p>Tu cuenta no tiene permisos para esta sección.</p>
      </section>
    );
  if (!isAdmin && !usuario.rol?.permisos?.length)
    return (
      <p>
        Este rol todavía no tiene permisos asignados. Contacta al administrador.
      </p>
    );
  return <Outlet />;
}
