import { NavLink } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
export default function App() {
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
        <NavLink className="brand" to="/pedidos" aria-label="SUGAR MOOD · Ir a pedidos">
          <img src="/sugar-mood-logo.png" alt="SUGAR MOOD" />
        </NavLink>
        <p className="aside-note">
          Un buen día empieza
          <br />
          con algo dulce.
        </p>
        <nav aria-label="Navegación principal">
          {[
            ["pedidos", "01", "Pedidos"],
            ["productos", "02", "Productos"],
            ["categorias", "03", "Categorías"],
            ["clientes", "04", "Clientes"],
          ].map(([path, num, label]) => (
            <NavLink key={path} to={"/" + path}>
              <span>{num}</span>
              {label}
              <b>↗</b>
            </NavLink>
          ))}
        </nav>
        <div className="aside-bottom">
          <i /> Gestión del negocio
          <small>Paletas · Postres · Minidonitas</small>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span><i className="mood-status" /> UN DULCE DÍA PARA CREAR</span>
          <span>
            SUGAR MOOD <b> / </b> Costa Rica
          </span>
        </div>
        <main>
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
