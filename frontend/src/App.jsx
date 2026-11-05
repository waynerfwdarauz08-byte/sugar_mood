import { NavLink } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { useAuth } from "./context/AuthContext";
import { Message } from "./components/UI";
export default function App() {
  const {usuario,isAdmin,can,logout,message,cerrando}=useAuth();
  const isClient=usuario?.rol.codigo === "cliente";
  const links=[
    ["pedidos","01",isClient?"Mis pedidos":"Pedidos","pedidos"],
    ["productos","02","Productos","productos"],["categorias","03","Categorías","categorias"],
    [isClient?"perfil":"clientes","04",isClient?"Mi perfil":"Clientes","clientes"],
    ["detalles-pedido","05",isClient?"Mis detalles":"Detalles","detalles-pedido"],
    ["agenda","06","Agenda","agenda"],["pagos","07",isClient?"Mis pagos":"Pagos","pagos"],
    ["inventario","08","Inventario","inventario"],["ventas","09","Ventas","ventas"],
    ["auditoria","10","Historial de cambios","auditoria"],
    ...(isAdmin?[["usuarios","11","Usuarios"],["roles","12","Roles"]]:[]),
    ["seguridad","13","Mi contraseña"],
  ].filter(([, , ,resource])=>!resource||can(resource));
  return (
    <div className="app">
      <div className="mood-background" aria-hidden="true">
        <span className="mood-glow glow-gold" />
        <span className="mood-glow glow-teal" />
        <span className="floating-treat treat-pink" />
        <span className="floating-treat treat-purple" />
        <span className="floating-treat treat-yellow" />
        <span className="mood-ring ring-one" />
        <span className="mood-ring ring-two" />
        <span className="mood-sprinkles" />
      </div>
      <aside>
        <NavLink
          className="brand"
          to="/pedidos"
          aria-label="SUGAR MOOD · Ir a pedidos"
        >
          <img src="/sugar-mood-logo.png" alt="SUGAR MOOD" />
        </NavLink>
        <p className="aside-note">
          Un buen día empieza
          <br />
          con algo dulce.
        </p>
        {usuario && (
          <nav aria-label="Navegación principal">
            {links.map(([path, num, label]) => (
              <NavLink key={path} to={"/" + path}>
                <span>{num}</span>
                {label}
                <b>↗</b>
              </NavLink>
            ))}
          </nav>
        )}
        {usuario && (
          <div className="session-info">
            <strong>{usuario.nombre}</strong>
            <small>{usuario.rol?.nombre}</small>
            <button
              className="secondary"
              onClick={() => logout()}
              disabled={cerrando}
            >
              Cerrar sesión
            </button>
          </div>
        )}
        <div className="aside-bottom">
          <i /> Gestión del negocio
          <small>Paletas · Postres · Minidonitas</small>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>
            <i className="mood-status" /> UN DULCE DÍA PARA CREAR
          </span>
          <span>
            SUGAR MOOD <b> / </b> Costa Rica
          </span>
        </div>
        <main>
          {usuario && message && <Message error={message} />}
          <AppRoutes />
        </main>
        <footer>
          Hecho para los pequeños detalles.{" "}
          <span>SUGAR MOOD · Gestión empresarial</span>
        </footer>
      </div>
    </div>
  );
}
