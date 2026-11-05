import { api } from "./api";
export const pedidoService = {
  list: () => api.list("pedidos"),
  get: (id) => api.get("pedidos", id),
  save: (id, body) => api.save("pedidos", id, body),
  remove: (id) => api.remove("pedidos", id),
};
