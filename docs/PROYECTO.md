# Propuesta empresarial · SUGAR MOOD

## Tema y problema

SUGAR MOOD vende paletas, postres y minidonitas por encargo. Registrar ventas en conversaciones o notas separadas dificulta consultar qué pidió cada cliente, cantidades, precio aplicado y estado. Usar el precio actual para calcular ventas pasadas altera el historial.

## Justificación y alcance

Centralizar catálogo, clientes y pedidos reduce errores y datos duplicados. Las claves foráneas impiden referencias inexistentes; las transacciones aseguran pedidos completos; los precios históricos conservan el importe pactado. Los estados pendiente, preparado, entregado y cancelado permiten seguir cada encargo.

Incluye CRUD de categorías, productos, clientes, pedidos y detalles, interfaz en español, precios en colones y diseño adaptable. Excluye autenticación, roles, inventario, proveedores, toppings y pagos.

## Entidades

Categoría clasifica productos. Producto guarda nombre único, precio actual y actividad. Cliente mantiene nombre, teléfono textual no único y dirección opcional. Pedido registra cliente, fecha y estado. DetallePedido enlaza pedido y producto, con cantidad positiva y precio histórico.

Categoría 1 → Producto 0..N; Cliente 1 → Pedido 0..N; Producto 1 → DetallePedido 0..N; Pedido 1 → DetallePedido 1..N. Cada hijo tiene un solo padre. La regla del mínimo de una línea se valida en el servicio dentro de transacciones. FK obligatorias: ON DELETE RESTRICT / ON UPDATE CASCADE.

## Normalización

**1FN:** cada celda contiene un valor atómico. Cada producto pedido ocupa una fila de detalles; no hay listas separadas por comas ni columnas producto1/producto2. Cada tabla tiene PK. El teléfono representa un contacto individual en texto.

**2FN:** se revisan todas las claves candidatas, además del id artificial. En detalles, la combinación única (pedidoId, productoId) determina cantidad y precio de esa venta. El nombre del producto depende solo de productoId y permanece en productos. El precioUnitario depende de la venta concreta, por lo que puede diferir entre pedidos.

**3FN:** productos no repite nombre de categoría; pedidos no repite nombre/teléfono/dirección del cliente; detalles no repite nombre del producto. Las dependencias son categoria.id → sus datos; producto.id → categoriaId/nombre/precio/activo; cliente.id → sus datos; pedido.id → clienteId/fecha/estado; detalle.id y (pedidoId,productoId) → cantidad/precioUnitario. Los datos descriptivos relacionados se consultan mediante asociaciones.

productos.precio expresa el precio vigente; detalles_pedido.precioUnitario expresa el precio pactado en una venta. Son hechos diferentes, no datos que deban mantenerse sincronizados. Subtotal y total son cálculos derivados, no columnas persistidas. El valor empresarial es conservar pedidos confiables aun cuando cambie el catálogo.

## Criterios del documento de clase

Modelado: cinco entidades coherentes y cuatro relaciones (35 %). Enfoque empresarial: gestión de encargos (15 %). Estructura: backend/frontend y responsabilidades separadas (20 %). CRUD: sistema completo con pruebas HTTP/MySQL (30 %). Son los pesos de la rúbrica, no una calificación asignada.
