const base = import.meta.env?.VITE_API_URL || "/api";
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Comprueba que el backend y MySQL estén disponibles.",
    );
  }
  if (response.status === 204) return null;
  const data = await response
    .json()
    .catch(() => ({ error: "Respuesta inválida del servidor." }));
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}
export const api = {
  list: (kind) => request("/" + kind),
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
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) * BigInt(quantity);
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
  return new Date(d.getTime() - 6 * 3600000).toISOString().slice(0, 16);
};
