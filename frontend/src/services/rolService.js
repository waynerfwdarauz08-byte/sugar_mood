import { api } from "./api";
export const rolService = {
  list: () => api.list("roles"),
  get: (id) => api.get("roles", id),
  save: (id, body) => api.save("roles", id, body),
  remove: (id) => api.remove("roles", id),
};
