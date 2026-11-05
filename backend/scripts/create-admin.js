const db = require("../models");
const auth = require("../services/authService");
const v = require("../services/validation");
(async () => {
  try {
    auth.settings();
    const nombre = v.text(process.env.ADMIN_NAME, "ADMIN_NAME", 100),
      correo = auth.correo(process.env.ADMIN_EMAIL),
      password = await auth.hash(process.env.ADMIN_PASSWORD);
    await db.sequelize.transaction(async (t) => {
      const role = await db.Rol.findOne({
        where: { codigo: "administrador" },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!role) throw new Error("Ejecute primero las migraciones.");
      if (
        await db.Usuario.count({ where: { id_rol: role.id, activo: true }, transaction: t })
      )
        throw new Error(
          "Ya existe un administrador. Use la administración de usuarios.",
        );
      if (await db.Usuario.findOne({ where: { correo }, transaction: t }))
        throw new Error(
          "El correo ya pertenece a una cuenta; no se promociona automáticamente.",
        );
      await db.Usuario.create(
        { nombre, correo, password, id_rol: role.id },
        { transaction: t },
      );
    });
    console.log("Primer administrador creado. Elimine ADMIN_PASSWORD de .env.");
  } catch (e) {
    console.error(
      e.name === "SequelizeConnectionError"
        ? "No se pudo conectar a MySQL."
        : e.message,
    );
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
