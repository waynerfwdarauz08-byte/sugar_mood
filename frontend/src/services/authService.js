import { api } from "./api";
export const authService = {
  login: (body) =>
    api.request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) =>
    api.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: (silent401 = false) => api.request("/auth/me", { silent401 }),
  logout: () =>
    api.request("/auth/logout", {
      method: "POST",
      body: "{}",
      silent401: true,
    }),
};
