const { Sequelize, DataTypes: D } = require("sequelize");
const config =
  require("../config/config")[process.env.NODE_ENV || "development"];
const sequelize = new Sequelize(config);
const id = {
  type: D.INTEGER,
  primaryKey: true,
  autoIncrement: true,
  allowNull: false,
};
const text = (n, optional = false) => ({
  type: D.STRING(n),
  allowNull: optional,
  validate: optional ? { len: [0, n] } : { notEmpty: true, len: [1, n] },
});
const fk = {
  type: D.INTEGER,
  allowNull: false,
  validate: { isInt: true, min: 1 },
};
const money = {
  type: D.DECIMAL(10, 2),
  allowNull: false,
  validate: { min: 0, isDecimal: true },
};
const options = (tableName) => ({ sequelize, tableName, timestamps: false });
const Categoria = sequelize.define(
  "Categoria",
  {
    id: { ...id },
    nombre: { ...text(80), unique: true },
    descripcion: text(255, true),
  },
  options("categorias"),
);
const Producto = sequelize.define(
  "Producto",
  {
    id: { ...id },
    categoriaId: { ...fk },
    nombre: { ...text(100), unique: true },
    precio: { ...money },
    activo: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
  },
  options("productos"),
);
const Cliente = sequelize.define(
  "Cliente",
  {
    id: { ...id },
    nombre: text(100),
    telefono: text(20),
    direccion: text(255, true),
  },
  options("clientes"),
);
const Pedido = sequelize.define(
  "Pedido",
  {
    id: { ...id },
    clienteId: { ...fk },
    fecha: { type: D.DATE, allowNull: false, validate: { isDate: true } },
    estado: {
      type: D.ENUM("pendiente", "preparado", "entregado", "cancelado"),
      allowNull: false,
      defaultValue: "pendiente",
    },
  },
  options("pedidos"),
);
const DetallePedido = sequelize.define(
  "DetallePedido",
  {
    id: { ...id },
    pedidoId: { ...fk },
    productoId: { ...fk },
    cantidad: {
      type: D.INTEGER,
      allowNull: false,
      validate: { isInt: true, min: 1 },
    },
    precioUnitario: { ...money },
  },
  {
    ...options("detalles_pedido"),
    indexes: [{ unique: true, fields: ["pedidoId", "productoId"] }],
  },
);
const relation = (parent, child, key, many, one) => {
  parent.hasMany(child, {
    foreignKey: key,
    as: many,
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
  child.belongsTo(parent, {
    foreignKey: key,
    as: one,
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
};
relation(Categoria, Producto, "categoriaId", "productos", "categoria");
relation(Cliente, Pedido, "clienteId", "pedidos", "cliente");
relation(Pedido, DetallePedido, "pedidoId", "detalles", "pedido");
relation(Producto, DetallePedido, "productoId", "detalles", "producto");
module.exports = {
  sequelize,
  Categoria,
  Producto,
  Cliente,
  Pedido,
  DetallePedido,
};
