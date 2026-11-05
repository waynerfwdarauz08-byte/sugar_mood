const db = require("../models");
const v = require("./validation");
const auth = require("./authService");
async function find(kind, id, t) {
  const model = kind === "roles" ? db.Rol : db.Usuario;
  const row = await model.findByPk(v.integer(id), {
    transaction: t,
    ...(kind === "usuarios" ? { include: auth.include } : {}),
  });
  if (!row) v.fail("Registro no encontrado.", 404);
  return row;
}
async function adminLock(t) {
  const role = await db.Rol.findOne({
    where: { codigo: "administrador" },
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!role) throw new Error("Falta rol administrador.");
  return role;
}
async function lastAdmin(row, newRole, t) {
  const role = await adminLock(t);
  if (
    row?.id_rol === role.id &&
    newRole !== role.id &&
    (await db.Usuario.count({ where: { id_rol: role.id }, transaction: t })) <=
      1
  )
    v.fail("Debe conservarse al menos un administrador.", 409);
}
function output(kind, row) {
  return kind === "roles" ? row.toJSON() : auth.publicUser(row);
}
async function list(kind) {
  return (
    await (kind === "roles" ? db.Rol : db.Usuario).findAll({
      ...(kind === "usuarios" ? { include: auth.include } : {}),
      order: [["id", "DESC"]],
    })
  ).map((row) => output(kind, row));
}
async function get(kind, id) {
  return output(kind, await find(kind, id));
}
async function save(kind, id, body) {
  if (kind === "roles") {
    v.object(body, ["codigo", "nombre", "descripcion"]);
    const codigo = v.text(body.codigo, "codigo", 40);
    if (!/^[a-z][a-z0-9_]*$/.test(codigo))
      v.fail("El código del rol debe usar minúsculas, números o guion bajo.");
    const data = {
      codigo,
      nombre: v.text(body.nombre, "nombre", 80),
      descripcion: v.text(body.descripcion, "descripcion", 255, true),
    };
    return db.sequelize.transaction(async (t) => {
      const row = id ? await find(kind, id, t) : null;
      if (
        row &&
        ["administrador", "cliente"].includes(row.codigo) &&
        row.codigo !== codigo
      )
        v.fail("No puedes cambiar el código de un rol del sistema.", 409);
      return output(
        kind,
        row
          ? await row.update(data, { transaction: t })
          : await db.Rol.create(data, { transaction: t }),
      );
    });
  }
  v.object(body, [
    "nombre",
    "correo",
    "password",
    "id_rol",
    "telefono",
    "direccion",
    "clienteId",
  ]);
  const data = {
    nombre: v.text(body.nombre, "nombre", 100),
    correo: auth.correo(body.correo),
    id_rol: v.integer(body.id_rol, "id_rol"),
  };
  if (!id || body.password !== undefined)
    data.password = await auth.hash(body.password);
  const uid = await db.sequelize.transaction(async (t) => {
    await adminLock(t);
    const row = id ? await find(kind, id, t) : null;
    const role = await db.Rol.findByPk(data.id_rol, { transaction: t });
    if (!role) v.fail("El rol no existe.");
    if (row) await lastAdmin(row, data.id_rol, t);
    const saved = row
      ? await row.update(data, { transaction: t })
      : await db.Usuario.create(data, { transaction: t });
    let profile = await db.Cliente.findOne({
      where: { usuarioId: saved.id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (body.clienteId !== undefined) {
      if (profile && profile.id !== v.integer(body.clienteId, "clienteId"))
        v.fail("La cuenta ya tiene un perfil de cliente.", 409);
      const existing = await db.Cliente.findByPk(
        v.integer(body.clienteId, "clienteId"),
        { transaction: t, lock: t.LOCK.UPDATE },
      );
      if (!existing) v.fail("El cliente no existe.");
      if (existing.usuarioId && existing.usuarioId !== saved.id)
        v.fail("Ese cliente ya está vinculado a una cuenta.", 409);
      await existing.update({ usuarioId: saved.id }, { transaction: t });
      profile = existing;
    }
    if (role.codigo === "cliente" && !profile) {
      await db.Cliente.create(
        {
          usuarioId: saved.id,
          nombre: data.nombre,
          telefono: v.text(body.telefono, "telefono", 20),
          direccion: v.text(body.direccion, "direccion", 255, true),
        },
        { transaction: t },
      );
    } else if (
      profile &&
      (body.telefono !== undefined || body.direccion !== undefined)
    ) {
      await profile.update(
        {
          ...(body.telefono !== undefined
            ? { telefono: v.text(body.telefono, "telefono", 20) }
            : {}),
          ...(body.direccion !== undefined
            ? { direccion: v.text(body.direccion, "direccion", 255, true) }
            : {}),
        },
        { transaction: t },
      );
    }
    return saved.id;
  });
  return get(kind, uid);
}
async function remove(kind, id) {
  await db.sequelize.transaction(async (t) => {
    await adminLock(t);
    const row = await find(kind, id, t);
    if (kind === "roles" && ["administrador", "cliente"].includes(row.codigo))
      v.fail("No puedes eliminar los roles del sistema.", 409);
    if (kind === "usuarios") {
      await lastAdmin(row, null, t);
      const profile = await db.Cliente.findOne({
        where: { usuarioId: row.id },
        transaction: t,
      });
      if (profile)
        await profile.update({ usuarioId: null }, { transaction: t });
    }
    await row.destroy({ transaction: t });
  });
}
module.exports = { list, get, save, remove };
