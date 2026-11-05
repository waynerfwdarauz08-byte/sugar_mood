import { api } from "./api";
export const productoService = {
  list: () => api.list("productos"),
  get: (id) => api.get("productos", id),
  save: (id, body) => api.save("productos", id, body),
  remove: (id) => api.remove("productos", id),
};
