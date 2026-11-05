import { api } from "./api";
export const detallePedidoService = {
  list: () => api.list("detalles-pedido"),
  get: (id) => api.get("detalles-pedido", id),
  save: (id, body) => api.save("detalles-pedido", id, body),
  remove: (id) => api.remove("detalles-pedido", id),
};
