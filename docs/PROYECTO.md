# Propuesta empresarial · SUGAR MOOD

## Tema y problema

SUGAR MOOD vende paletas, postres y minidonitas por encargo. Registrar ventas en conversaciones o notas separadas dificulta consultar qué pidió cada cliente, cantidades, precio aplicado y estado. Usar el precio actual para calcular ventas pasadas altera el historial.

## Justificación y alcance

Centralizar catálogo, clientes y pedidos reduce errores y datos duplicados. Las claves foráneas impiden referencias inexistentes; las transacciones aseguran pedidos completos; los precios históricos conservan el importe pactado. Los estados pendiente, preparado, entregado y cancelado permiten seguir cada encargo.

Incluye CRUD de categorías, productos, clientes, pedidos y detalles, interfaz en español, precios en colones y diseño adaptable. El día 2 añade registro, login, JWT, rutas protegidas, usuarios y roles Administrador/Cliente. Los roles son una ampliación expresamente solicitada por el usuario. Siguen fuera del alcance inventario, proveedores, toppings y pagos.

## Entidades

Categoría clasifica productos. Producto guarda nombre único, precio actual y actividad. Cliente mantiene nombre, teléfono textual no único y dirección opcional. Pedido registra cliente, fecha y estado. DetallePedido enlaza pedido y producto, con cantidad positiva y precio histórico.

Categoría 1 → Producto 0..N; Cliente 1 → Pedido 0..N; Producto 1 → DetallePedido 0..N; Pedido 1 → DetallePedido 1..N. Cada hijo tiene un solo padre. La regla del mínimo de una línea se valida en el servicio dentro de transacciones. FK obligatorias: ON DELETE RESTRICT / ON UPDATE CASCADE.

Se añaden roles(id, codigo, nombre, descripcion) y usuarios(id, nombre, correo, password, fechaCreacion, id_rol). La descripción del rol es opcional, VARCHAR(255). Rol 1 → Usuario 0..N. clientes.usuarioId es FK única opcional: cada cuenta puede tener cero o un perfil y cada perfil cero o una cuenta. Esto conserva los clientes históricos sin asignarles cuentas por coincidencia de datos. Al eliminar una cuenta, se desvincula su perfil y se conserva el historial comercial.

La autenticación identifica una cuenta; la autorización aplica rol y propiedad de datos. Administrador gestiona el negocio y las cuentas. Cliente consulta el catálogo y administra únicamente su perfil y pedidos propios pendientes. El registro público no permite asignar roles.

## Normalización

**1FN:** cada celda contiene un valor atómico. Cada producto pedido ocupa una fila de detalles; no hay listas separadas por comas ni columnas producto1/producto2. Cada tabla tiene PK. El teléfono representa un contacto individual en texto.

**2FN:** se revisan todas las claves candidatas, además del id artificial. En detalles, la combinación única (pedidoId, productoId) determina cantidad y precio de esa venta. El nombre del producto depende solo de productoId y permanece en productos. El precioUnitario depende de la venta concreta, por lo que puede diferir entre pedidos.

**3FN:** productos no repite nombre de categoría; pedidos no repite nombre/teléfono/dirección del cliente; detalles no repite nombre del producto. Las dependencias son categoria.id → sus datos; producto.id → categoriaId/nombre/precio/activo; cliente.id → sus datos; pedido.id → clienteId/fecha/estado; detalle.id y (pedidoId,productoId) → cantidad/precioUnitario. Los datos descriptivos relacionados se consultan mediante asociaciones.

productos.precio expresa el precio vigente; detalles_pedido.precioUnitario expresa el precio pactado en una venta. Son hechos diferentes, no datos que deban mantenerse sincronizados. Subtotal y total son cálculos derivados, no columnas persistidas. El valor empresarial es conservar pedidos confiables aun cuando cambie el catálogo.

Para el día 2, usuarios.id determina los datos de acceso y el identificador de rol; roles.id determina codigo/nombre/descripcion. No se repite el nombre del rol en usuarios. usuario.nombre representa el nombre de presentación de la cuenta; cliente.nombre representa el contacto comercial, editable por separado. No se almacenan listas de roles ni permisos separados por comas.

Los pesos del día 2 son CRUDs 30 %, autenticación 25 %, frontend 20 %, relaciones/validaciones 15 % y organización/documentación 10 %. Los pesos indicados a continuación corresponden únicamente al día 1.

## Criterios del documento de clase

Modelado: cinco entidades coherentes y cuatro relaciones (35 %). Enfoque empresarial: gestión de encargos (15 %). Estructura: backend/frontend y responsabilidades separadas (20 %). CRUD: sistema completo con pruebas HTTP/MySQL (30 %). Son los pesos de la rúbrica, no una calificación asignada.

## Extensión de inventario y operación

La primera ampliación conservó las siete entidades originales. Producto incorpora stock disponible y stockMinimo; Pedido incorpora fechaEntrega, observaciones y stockAplicado interno para distinguir las reservas posteriores a la migración; Usuario incorpora activo y sesionVersion para invalidar accesos. Ventas y comprobantes se calculan desde pedidos y detalles; no crean tablas duplicadas. Los importes siguen usando el precio histórico de cada detalle. Las reservas se ajustan con bloqueo de productos por ID ascendente y se revierten si falla cualquier escritura. Los pedidos entregados son inmutables.
