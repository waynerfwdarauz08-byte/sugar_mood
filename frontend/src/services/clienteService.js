import { api } from "./api";
export const clienteService = {
  list: () => api.list("clientes"),
  get: (id) => api.get("clientes", id),
  save: (id, body) => api.save("clientes", id, body),
  remove: (id) => api.remove("clientes", id),
};
