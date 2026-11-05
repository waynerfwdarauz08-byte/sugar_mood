import { Routes, Route, Navigate } from "react-router-dom";
import RutaProtegida from "../components/RutaProtegida";
import Login from "../pages/Login";
import Registro from "../pages/Registro";
import Categorias from "../pages/Categorias";
import Productos from "../pages/Productos";
import Clientes from "../pages/Clientes";
import Pedidos from "../pages/Pedidos";
import DetallesPedido from "../pages/DetallesPedido";
import Usuarios from "../pages/Usuarios";
import Roles from "../pages/Roles";
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route element={<RutaProtegida />}>
        <Route path="/" element={<Navigate to="/pedidos" replace />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/perfil" element={<Clientes />} />
        <Route path="/detalles-pedido" element={<DetallesPedido />} />
        <Route element={<RutaProtegida admin />}>
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/roles" element={<Roles />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <section>
            <h1>Página no encontrada</h1>
            <a href="/">Ir al inicio</a>
          </section>
        }
      />
    </Routes>
  );
}
