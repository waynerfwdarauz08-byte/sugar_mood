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
import Ventas from "../pages/Ventas";
import Comprobante from "../pages/Comprobante";
import Seguridad from "../pages/Seguridad";
import Inventario from '../pages/Inventario';
import Pagos from '../pages/Pagos';
import Agenda from '../pages/Agenda';
import Auditoria from '../pages/Auditoria';
import Recuperar from '../pages/Recuperar';
import Restablecer from '../pages/Restablecer';
import {useAuth} from '../context/AuthContext';
function Permit({resource,children}) {
  const {can}=useAuth();
  return can(resource)?children:<section><h1>Acceso restringido</h1><p>Tu cuenta no tiene permisos para esta sección.</p></section>;
}
function Home(){
  const {can,usuario}=useAuth();
  const first=['pedidos','productos','categorias','clientes','agenda','pagos','inventario','ventas','auditoria'].find(r=>can(r));
  return <Navigate to={'/'+(first==='clientes'&&usuario?.rol.codigo==='cliente'?'perfil':first||'seguridad')} replace/>;
}
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar" element={<Recuperar />} />
      <Route path="/restablecer" element={<Restablecer />} />
      <Route element={<RutaProtegida />}>
        <Route path="/" element={<Home />} />
        <Route path="/pedidos" element={<Permit resource="pedidos"><Pedidos /></Permit>} />
        <Route path="/pedidos/:id/comprobante" element={<Permit resource="pedidos"><Comprobante /></Permit>} />
        <Route path="/seguridad" element={<Seguridad />} />
        <Route path="/productos" element={<Permit resource="productos"><Productos /></Permit>} />
        <Route path="/categorias" element={<Permit resource="categorias"><Categorias /></Permit>} />
        <Route path="/perfil" element={<Permit resource="clientes"><Clientes /></Permit>} />
        <Route path="/clientes" element={<Permit resource="clientes"><Clientes /></Permit>} />
        <Route path="/detalles-pedido" element={<Permit resource="detalles-pedido"><DetallesPedido /></Permit>} />
        <Route path="/inventario" element={<Permit resource="inventario"><Inventario /></Permit>} />
        <Route path="/pagos" element={<Permit resource="pagos"><Pagos /></Permit>} />
        <Route path="/agenda" element={<Permit resource="agenda"><Agenda /></Permit>} />
        <Route path="/auditoria" element={<Permit resource="auditoria"><Auditoria /></Permit>} />
        <Route path="/ventas" element={<Permit resource="ventas"><Ventas /></Permit>} />
        <Route element={<RutaProtegida admin />}>
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
