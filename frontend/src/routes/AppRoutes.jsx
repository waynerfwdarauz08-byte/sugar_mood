import { Routes, Route, Navigate } from "react-router-dom";
import CatalogPage from "../pages/CatalogPage";
import OrdersPage from "../pages/OrdersPage";
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pedidos" replace />} />
      <Route path="/pedidos" element={<OrdersPage />} />
      {["categorias", "productos", "clientes"].map((kind) => (
        <Route
          key={kind}
          path={"/" + kind}
          element={<CatalogPage key={kind} kind={kind} />}
        />
      ))}
      <Route
        path="*"
        element={
          <section>
            <h1>Página no encontrada</h1>
            <a href="/pedidos">Ir a pedidos</a>
          </section>
        }
      />
    </Routes>
  );
}
