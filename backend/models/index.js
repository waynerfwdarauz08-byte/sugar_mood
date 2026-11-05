const { Sequelize, DataTypes } = require("sequelize");
const config =
  require("../config/config")[process.env.NODE_ENV || "development"];
const sequelize = new Sequelize(config);
const db = { sequelize };
for (const [name, file] of Object.entries({
  Categoria: "categoria",
  Producto: "producto",
  Cliente: "cliente",
  Pedido: "pedido",
  DetallePedido: "detallePedido",
  Rol: "rol",
  Usuario: "usuario",
}))
  db[name] = require("./" + file)(sequelize, DataTypes);
function relation(parent, child, key, many, one) {
  db[parent].hasMany(db[child], {
    foreignKey: key,
    as: many,
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
  db[child].belongsTo(db[parent], {
    foreignKey: key,
    as: one,
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
}
relation("Categoria", "Producto", "categoriaId", "productos", "categoria");
relation("Cliente", "Pedido", "clienteId", "pedidos", "cliente");
relation("Pedido", "DetallePedido", "pedidoId", "detalles", "pedido");
relation("Producto", "DetallePedido", "productoId", "detalles", "producto");
relation("Rol", "Usuario", "id_rol", "usuarios", "rol");
db.Usuario.hasOne(db.Cliente, {
  foreignKey: "usuarioId",
  as: "cliente",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
db.Cliente.belongsTo(db.Usuario, {
  foreignKey: "usuarioId",
  as: "usuario",
  onDelete: "RESTRICT",
  onUpdate: "CASCADE",
});
module.exports = db;
