import { api } from "./api";
export const categoriaService = {
  list: () => api.list("categorias"),
  get: (id) => api.get("categorias", id),
  save: (id, body) => api.save("categorias", id, body),
  remove: (id) => api.remove("categorias", id),
};
