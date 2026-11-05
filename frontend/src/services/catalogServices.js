import { categoriaService } from "./categoriaService";
import { productoService } from "./productoService";
import { clienteService } from "./clienteService";
export { categoriaService };
export const catalogServices = {
  categorias: categoriaService,
  productos: productoService,
  clientes: clienteService,
};
