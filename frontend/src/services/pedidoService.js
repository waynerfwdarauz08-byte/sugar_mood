import { api } from "./api";
export const pedidoService = {
  list: (filters) => api.list("pedidos", filters),
  get: (id) => api.get("pedidos", id),
  save: (id, body) => api.save("pedidos", id, body),
  remove: (id) => api.remove("pedidos", id),
};
