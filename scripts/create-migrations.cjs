const fs = require("fs");
for (const [i, t] of [
  "categorias",
  "productos",
  "clientes",
  "pedidos",
  "detalles_pedido",
].entries()) {
  let extras = "";
  if (t === "productos")
    extras =
      "await q.sequelize.query('ALTER TABLE productos ADD CONSTRAINT chk_producto_precio CHECK (precio >= 0)');";
  if (t === "detalles_pedido")
    extras =
      "await q.addConstraint('detalles_pedido',{fields:['pedidoId','productoId'],type:'unique',name:'uq_pedido_producto'}); await q.sequelize.query('ALTER TABLE detalles_pedido ADD CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0), ADD CONSTRAINT chk_detalle_precio CHECK (precioUnitario >= 0)');";
  fs.writeFileSync(
    `backend/migrations/20261104000${i + 1}-create-${t}.js`,
    `module.exports={async up(q,S){await q.createTable('${t}',require('../config/migration-schema')(S).${t});${extras}},async down(q){await q.dropTable('${t}');}};\n`,
  );
}
