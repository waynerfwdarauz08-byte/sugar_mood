const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Validator } = require("sequelize");
const db = require("../models");
const v = require("./validation");
function settings() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new Error("Configure JWT_SECRET con al menos 32 bytes.");
  return { secret, issuer: "sugar-mood", audience: "sugar-mood-web" };
}
function correo(value) {
  const email = v.text(value, "correo", 254).toLowerCase();
  if (!Validator.isEmail(email))
    v.fail("El correo no tiene un formato válido.");
  return email;
}
async function hash(value) {
  if (
    typeof value !== "string" ||
    [...value].length < 8 ||
    Buffer.byteLength(value) > 72
  )
    v.fail(
      "La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes UTF-8.",
    );
  return bcrypt.hash(value, 12);
}
function publicUser(row) {
  const u = row.toJSON ? row.toJSON() : row;
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    fechaCreacion: u.fechaCreacion,
    id_rol: u.id_rol,
    rol: u.rol,
    cliente: u.cliente || null,
  };
}
const include = [
  { model: db.Rol, as: "rol" },
  { model: db.Cliente, as: "cliente" },
];
async function current(id, t) {
  const u = await db.Usuario.findByPk(id, { include, transaction: t });
  if (!u) v.fail("No autorizado", 401);
  return publicUser(u);
}
async function register(body) {
  v.object(body, ["nombre", "correo", "password", "telefono", "direccion"]);
  const data = {
    nombre: v.text(body.nombre, "nombre", 100),
    correo: correo(body.correo),
    password: await hash(body.password),
  };
  const telefono = v.text(body.telefono, "telefono", 20),
    direccion = v.text(body.direccion, "direccion", 255, true);
  try {
    return await db.sequelize.transaction(async (t) => {
      const role = await db.Rol.findOne({
        where: { codigo: "cliente" },
        transaction: t,
      });
      if (!role) throw new Error("Falta el rol Cliente: ejecute migraciones.");
      const u = await db.Usuario.create(
        { ...data, id_rol: role.id },
        { transaction: t },
      );
      await db.Cliente.create(
        { nombre: data.nombre, telefono, direccion, usuarioId: u.id },
        { transaction: t },
      );
      return current(u.id, t);
    });
  } catch (e) {
    if (e.name === "SequelizeUniqueConstraintError")
      v.fail("El correo ya está registrado.", 400);
    throw e;
  }
}
async function login(body) {
  v.object(body, ["correo", "password"]);
  const email = correo(body.correo);
  if (
    typeof body.password !== "string" ||
    Buffer.byteLength(body.password) > 72
  )
    v.fail("Credenciales incorrectas.", 401);
  const row = await db.Usuario.scope("conPassword").findOne({
    where: { correo: email },
  });
  const fallback =
    "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxQzZVmB6hJqaqP9FCljM0N0GWe";
  const valid = await bcrypt.compare(body.password, row?.password || fallback);
  if (!row || !valid) v.fail("Credenciales incorrectas.", 401);
  const config = settings();
  return {
    token: jwt.sign({}, config.secret, {
      subject: String(row.id),
      algorithm: "HS256",
      expiresIn: "1h",
      issuer: config.issuer,
      audience: config.audience,
    }),
    usuario: await current(row.id),
  };
}
module.exports = {
  settings,
  correo,
  hash,
  publicUser,
  current,
  register,
  login,
  include,
};
