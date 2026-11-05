const db = require("../models");
const v = require("./validation");
const isAdmin = (user) => user?.rol?.codigo === "administrador";
function known(user) {
  if (!user) v.fail("No autorizado", 401);
  if (!["administrador", "cliente"].includes(user.rol?.codigo))
    v.fail("El rol no tiene permisos asignados.", 403);
}
function clientId(user) {
  known(user);
  if (!user.cliente) v.fail("La cuenta no tiene un perfil de cliente.", 403);
  return user.cliente.id;
}
async function check(kind, row, user, t, write = false) {
  known(user);
  if (isAdmin(user)) return;
  if (["categorias", "productos"].includes(kind)) {
    if (write)
      v.fail("Solo el administrador puede modificar el catálogo.", 403);
    if (kind === "productos" && !row.activo)
      v.fail("Registro no encontrado.", 404);
    return;
  }
  if (kind === "clientes") {
    if (row.usuarioId !== user.id) v.fail("Registro no encontrado.", 404);
    return;
  }
  const order =
    kind === "pedidos"
      ? row
      : await db.Pedido.findByPk(row.pedidoId, { transaction: t });
  if (!order || order.clienteId !== clientId(user))
    v.fail("Registro no encontrado.", 404);
  if (write && order.estado !== "pendiente")
    v.fail("Solo puedes modificar o eliminar pedidos pendientes.", 403);
}
module.exports = { isAdmin, known, clientId, check };
