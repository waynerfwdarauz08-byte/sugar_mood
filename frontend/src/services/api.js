const base = import.meta.env?.VITE_API_URL || "/api";
let csrfToken = null;
let csrfPromise = null;
let onUnauthorized = () => {};
export const session = {
  setCsrf: (value) => {
    csrfToken = value;
  },
  clear: () => {
    csrfToken = null;
  },
  onUnauthorized: (handler) => {
    onUnauthorized = handler;
  },
};
async function ensureCsrf() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise)
    csrfPromise = request("/auth/csrf", { silent401: true })
      .then((data) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  return csrfPromise;
}
async function request(path, options = {}, retryCsrf = true) {
  const { silent401 = false, ...fetchOptions } = options;
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(
    (fetchOptions.method || "GET").toUpperCase(),
  );
  const proof = unsafe ? await ensureCsrf() : null;
  let response;
  try {
    response = await fetch(base + path, {
      ...fetchOptions,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Mode": "cookie",
        ...(proof ? { "X-CSRF-Token": proof } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "No se pudo conectar con la API. Comprueba que el backend y MySQL estén disponibles.",
    );
  }
  if (response.status === 204) return null;
  const data = await response
    .json()
    .catch(() => ({ error: "Respuesta inválida del servidor." }));
  if (!response.ok) {
    if (response.status === 403 && data.code === "CSRF_INVALID" && retryCsrf) {
      csrfToken = null;
      await ensureCsrf();
      return request(path, options, false);
    }
    if (
      response.status === 401 &&
      !silent401 &&
      !["/auth/login", "/auth/register"].includes(path)
    )
      onUnauthorized();
    const error = new Error(data.error || "No se pudo completar la operación.");
    error.status = response.status;
    throw error;
  }
  if (data.error) throw new Error(data.error);
  return data;
}
export const api = {
  request,
  list: (kind, filters = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([,v]) => v !== "" && v != null)).toString();
    return request("/" + kind + (query ? "?" + query : ""));
  },
  get: (kind, id) => request(`/${kind}/${id}`),
  save: (kind, id, body) =>
    request("/" + kind + (id ? "/" + id : ""), {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    }),
  remove: (kind, id) => request(`/${kind}/${id}`, { method: "DELETE" }),
};
export const currency = (value) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
  }).format(value);
// La vista previa usa centavos enteros; los importes definitivos los devuelve la API.
export const lineCents = (price, quantity) => {
  if (!/^\d+$/.test(String(quantity))) return 0n;
  const [whole, fraction = ""] = String(price).split(".");
  return (
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * BigInt(quantity)
  );
};
export const decimal = (cents) =>
  `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
export const localDate = (value) =>
  new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(new Date(value));
export const inputDate = (value) => {
  const d = value ? new Date(value) : new Date();
  return new Date(d.getTime() - 6 * 3600000).toISOString().slice(0, 19);
};
