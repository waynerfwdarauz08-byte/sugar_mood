const { QueryTypes } = require("sequelize");
module.exports = {
  async up(q) {
    await q.sequelize.transaction(async (t) => {
      const options = { transaction: t };
      await q.bulkInsert(
        "categorias",
        [
          {
            nombre: "Paletas (ejemplo)",
            descripcion: "Datos ficticios de demostración",
          },
          {
            nombre: "Postres (ejemplo)",
            descripcion: "Datos ficticios de demostración",
          },
          { nombre: "Minidonitas (ejemplo)", descripcion: "Venta por caja" },
        ],
        options,
      );
      const categories = await q.sequelize.query(
        "SELECT id,nombre FROM categorias WHERE nombre IN (:names)",
        {
          ...options,
          replacements: {
            names: [
              "Paletas (ejemplo)",
              "Postres (ejemplo)",
              "Minidonitas (ejemplo)",
            ],
          },
          type: QueryTypes.SELECT,
        },
      );
      const cat = (n) => categories.find((c) => c.nombre === n).id;
      await q.bulkInsert(
        "productos",
        [
          {
            categoriaId: cat("Paletas (ejemplo)"),
            nombre: "Paleta ChocoVainilla (ejemplo)",
            precio: "700.00",
            activo: true,
            stock:100,
            stockMinimo:5,
          },
          {
            categoriaId: cat("Postres (ejemplo)"),
            nombre: "Cheesecake de fresa (ejemplo)",
            precio: "1000.00",
            activo: true,
            stock:100,
            stockMinimo:5,
          },
          {
            categoriaId: cat("Minidonitas (ejemplo)"),
            nombre: "Caja de 8 minidonitas (ejemplo)",
            precio: "1500.00",
            activo: true,
            stock:100,
            stockMinimo:5,
          },
        ],
        options,
      );
      await q.bulkInsert(
        "clientes",
        [
          {
            nombre: "Ana Demo (ejemplo)",
            telefono: "0000-0001",
            direccion: "Dirección ficticia de ejemplo",
          },
          {
            nombre: "Luis Demo (ejemplo)",
            telefono: "0000-0002",
            direccion: null,
          },
        ],
        options,
      );
      const [client] = await q.sequelize.query(
        "SELECT id FROM clientes WHERE nombre = :name",
        {
          ...options,
          replacements: { name: "Ana Demo (ejemplo)" },
          type: QueryTypes.SELECT,
        },
      );
      const [product] = await q.sequelize.query(
        "SELECT id FROM productos WHERE nombre = :name",
        {
          ...options,
          replacements: { name: "Paleta ChocoVainilla (ejemplo)" },
          type: QueryTypes.SELECT,
        },
      );
      const orderId = await q.bulkInsert(
        "pedidos",
        [
          {
            clienteId: client.id,
            fecha: new Date("2026-11-04T15:00:00Z"),
            estado: "pendiente",
            stockAplicado:true,
          },
        ],
        options,
      );
      await q.sequelize.query("UPDATE productos SET stock=98 WHERE id=:id",{...options,replacements:{id:product.id}});
      await q.bulkInsert(
        "detalles_pedido",
        [
          {
            pedidoId: orderId,
            productoId: product.id,
            cantidad: 2,
            precioUnitario: "700.00",
          },
        ],
        options,
      );
      await q.sequelize.query("INSERT INTO movimientos_inventario (productoId,productoNombre,usuarioNombre,fecha,tipo,cantidad,stockAnterior,stockPosterior,motivo) SELECT id,nombre,'Sistema',NOW(),'saldo_inicial',stock,0,stock,'Saldo inicial de datos ficticios' FROM productos WHERE categoriaId IN (:ids)",{...options,replacements:{ids:categories.map(c=>c.id)}});
    });
  },
  async down() {
    throw new Error(
      "Por seguridad, los datos de ejemplo se eliminan desde los CRUDs; no se borran registros por nombre.",
    );
  },
};
