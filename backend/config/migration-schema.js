// Esquema compartido exclusivamente por migraciones: no depende de los modelos vivos.
module.exports = (S) => {
  const id = () => ({
    type: S.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  });
  const fk = (table) => ({
    type: S.INTEGER,
    allowNull: false,
    references: { model: table, key: "id" },
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  });
  const str = (n, allowNull = false) => ({ type: S.STRING(n), allowNull });
  return {
    categorias: {
      id: id(),
      nombre: { ...str(80), unique: true },
      descripcion: str(255, true),
    },
    productos: {
      id: id(),
      categoriaId: fk("categorias"),
      nombre: { ...str(100), unique: true },
      precio: { type: S.DECIMAL(10, 2), allowNull: false },
      activo: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
    },
    clientes: {
      id: id(),
      nombre: str(100),
      telefono: str(20),
      direccion: str(255, true),
    },
    pedidos: {
      id: id(),
      clienteId: fk("clientes"),
      fecha: { type: S.DATE, allowNull: false },
      estado: {
        type: S.ENUM("pendiente", "preparado", "entregado", "cancelado"),
        allowNull: false,
        defaultValue: "pendiente",
      },
    },
    detalles_pedido: {
      id: id(),
      pedidoId: fk("pedidos"),
      productoId: fk("productos"),
      cantidad: { type: S.INTEGER, allowNull: false },
      precioUnitario: { type: S.DECIMAL(10, 2), allowNull: false },
    },
  };
};
