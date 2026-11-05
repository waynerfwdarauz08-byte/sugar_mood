import { api } from "./api";
export const authService = {
  forgotPassword:correo=>api.request('/auth/forgot-password',{method:'POST',body:JSON.stringify({correo})}),
  resetPassword:(token,password)=>api.request('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})}),
  login: (body) =>
    api.request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) =>
    api.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: (silent401 = false) => api.request("/auth/me", { silent401 }),
  changePassword: (body) => api.request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  logout: () =>
    api.request("/auth/logout", {
      method: "POST",
      body: "{}",
      silent401: true,
    }),
};
