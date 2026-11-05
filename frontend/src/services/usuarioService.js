import { api } from "./api";
export const usuarioService = {
  list: () => api.list("usuarios"),
  get: (id) => api.get("usuarios", id),
  save: (id, body) => api.save("usuarios", id, body),
  remove: (id) => api.remove("usuarios", id),
};
