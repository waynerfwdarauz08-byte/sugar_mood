class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status = 400) => {
  throw new ApiError(status, message);
};
const object = (body, allowed) => {
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail("Se requiere un objeto JSON.");
  const bad = Object.keys(body).filter((k) => !allowed.includes(k));
  if (bad.length) fail("Campos no permitidos: " + bad.join(", "));
};
const integer = (v, name = "id") => {
  if (typeof v !== "number" && typeof v !== "string")
    fail(name + ": debe ser un entero positivo.");
  if (
    !/^\d+$/.test(String(v)) ||
    !Number.isSafeInteger(Number(v)) ||
    Number(v) < 1 ||
    Number(v) > 2147483647
  )
    fail(name + ": debe ser un entero positivo.");
  return Number(v);
};
const text = (v, name, max, optional = false) => {
  if (optional && (v === undefined || v === null)) return null;
  if (
    typeof v !== "string" ||
    (!optional && !v.trim()) ||
    v.trim().length > max
  )
    fail(
      `${name}: texto ${optional ? "opcional" : "obligatorio"} de hasta ${max} caracteres.`,
    );
  return v.trim();
};
const cents = (v) => {
  if (
    !["number", "string"].includes(typeof v) ||
    !/^\d+(\.\d{1,2})?$/.test(String(v))
  )
    fail(
      "Precio inválido: use un importe no negativo de hasta 8 enteros y 2 decimales.",
    );
  const [whole, fraction = ""] = String(v).split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};
const decimal = (c) => `${c / 100n}.${String(c % 100n).padStart(2, "0")}`;
const money = (v) => {
  const c = cents(v);
  if (c > 9999999999n) fail("Precio fuera del rango DECIMAL(10,2).");
  return decimal(c);
};
const date = (v) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
      v,
    ) ||
    !Number.isFinite(Date.parse(v))
  )
    fail("Fecha inválida: use ISO 8601 con zona horaria.");
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  if (
    y < 1000 ||
    y > 9999 ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > new Date(Date.UTC(y, m, 0)).getUTCDate()
  )
    fail("Fecha inexistente.");
  return new Date(v);
};
const state = (v) => {
  if (!["pendiente", "preparado", "entregado", "cancelado"].includes(v))
    fail("Estado inválido.");
  return v;
};
module.exports = {
  ApiError,
  fail,
  object,
  integer,
  text,
  cents,
  decimal,
  money,
  date,
  state,
};
