# API REST · Día 2

Base local http://127.0.0.1:3000/api. JSON UTF-8. Las rutas empresariales requieren una cookie de sesión válida o Authorization: Bearer <token>. Salud, csrf, registro y login son públicos; logout borra cookies y exige prueba CSRF si se utiliza una sesión de navegador.

## Autenticación

- POST /auth/register → 201 con usuario, rol y perfil de cliente; sin password. Acepta nombre, correo, password, telefono y direccion opcional. El rol Cliente se resuelve en backend; id_rol y clienteId se rechazan. Correo duplicado → 400.
- POST /auth/login → 200 con {token, usuario, expiresAt} para clientes API sin modo cookie. Con X-Session-Mode: cookie establece la cookie httpOnly y responde {usuario, expiresAt, csrfToken}, sin JWT en JSON. Acepta correo y password. Credenciales incorrectas → 401. La duración del JWT es una hora.
- GET /auth/me → 200 con usuario/rol/perfil actuales. Token ausente, inválido, alterado o vencido, o cuenta eliminada → 401.
- GET /salud → 200 si MySQL responde. No expone credenciales.
- GET /auth/csrf → 200 con {csrfToken}; prepara o reutiliza la prueba CSRF firmada. No expone el JWT. Cache-Control: no-store.
- POST /auth/logout → 204; borra cookies con el mismo Path y atributos usados al crearlas. Es idempotente y no necesita que el JWT siga vigente.

Las cookies de navegador son httpOnly, host-only, SameSite=Lax, Path=/ y duran una hora. En producción son Secure y sus nombres usan __Host-. /auth/me añade expiresAt al usuario para restaurar la sesión tras recargar sin extender el vencimiento. En modo navegador, todas las mutaciones incluyen X-CSRF-Token; prueba ausente o inválida responde 403 con code CSRF_INVALID. También se comprueba Origin. Fetch utiliza credentials: include y el proxy /api. Las cookies no se autentican mediante un encabezado Authorization inválido: si el encabezado está presente debe ser un Bearer válido.

Registro:

```json
{
  "nombre": "Ana (ejemplo)",
  "correo": "ana@example.com",
  "password": "EjemploSeguro2026!",
  "telefono": "0000-7788",
  "direccion": "Dirección ficticia"
}
```

Login:

```json
{ "correo": "ana@example.com", "password": "EjemploSeguro2026!" }
```

## CRUDs

Cada recurso dispone de POST /recurso, GET /recurso, GET /recurso/:id, PUT /recurso/:id y DELETE /recurso/:id.

| Recurso         | Administrador                                     | Cliente                                                                                      |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| categorias      | CRUD completo                                     | Listar y consultar                                                                           |
| productos       | CRUD completo                                     | Listar y consultar activos; productos históricos siguen visibles en sus pedidos              |
| clientes        | CRUD completo                                     | Listar/consultar/editar solo su perfil; no crear ni borrar perfiles                          |
| pedidos         | CRUD completo                                     | Crear pendiente; listar/consultar propios; editar, cancelar y borrar solo propios pendientes |
| detalles-pedido | CRUD completo                                     | Consultar propios; altas, cambio de cantidad y bajas solo en pedidos propios pendientes      |
| usuarios        | CRUD completo                                     | Sin acceso                                                                                   |
| roles           | CRUD completo con protección de roles del sistema | Sin acceso                                                                                   |

POST → 201; GET/PUT → 200; DELETE → 204. 400 para entrada inválida, 401 sin autenticación válida, 403 sin permiso, 404 inexistente o ajeno, 409 para duplicados/dependencias/reglas de integridad, 500 para fallos inesperados sin traza. Formato de error: {"error":"Mensaje en español"}.

## Cuerpos de negocio

Categoría: {"nombre":"Paletas","descripcion":"Opcional"}.

Producto: {"categoriaId":1,"nombre":"Paleta ChocoVainilla","precio":"700.00","activo":true}.

Cliente: {"nombre":"Ana","telefono":"0000-7788","direccion":"Opcional"}. usuarioId no es editable mediante este recurso: la vinculación se hace desde la administración de usuarios.

Pedido de administrador:

```json
{
  "clienteId": 1,
  "fecha": "2026-11-05T10:20:33-06:00",
  "estado": "pendiente",
  "detalles": [{ "productoId": 1, "cantidad": 2 }]
}
```

Cliente usa el mismo cuerpo sin clienteId: el backend lo obtiene de su cuenta. Enviar otro clienteId se rechaza con 403. Solo puede crear pendiente y cambiar un pendiente a pendiente/cancelado. Solo un administrador asigna preparado/entregado. Una vez cancelado, preparado o entregado no puede modificarlo el cliente.

POST de detalle: {"pedidoId":1,"productoId":2,"cantidad":1}. PUT: {"cantidad":3}. No se puede borrar la última línea. No se permite repetir producto en un pedido ni agregar productos inactivos. Editar cantidades conserva el precio histórico.

PUT de catálogos exige los campos obligatorios completos. Descripción y dirección admiten null. Activo predetermina true; estado predetermina pendiente solo cuando está ausente, no al enviar null. Fechas ISO 8601 con zona. ID, precioUnitario, subtotal y total no son campos editables. Importes devueltos como textos con dos decimales y calculados con centavos BigInt.

## Usuarios y roles

POST /usuarios y PUT /usuarios/:id aceptan nombre, correo, id_rol y password (obligatorio al crear; omitido al editar para conservar hash). Si el rol es Cliente y no hay perfil, se exige telefono y se admite direccion. clienteId opcional permite vincular explícitamente un cliente existente no asociado a otra cuenta. No se busca automáticamente por nombre. Se rechaza vincular otro perfil cuando la cuenta ya tiene uno diferente.

Ejemplo de alta de cuenta de cliente administrada:

```json
{
  "nombre": "Cuenta de ejemplo",
  "correo": "cuenta@example.com",
  "password": "EjemploSeguro2026!",
  "id_rol": 2,
  "telefono": "0000-7788"
}
```

Los IDs del ejemplo son ilustrativos; usar los consultados en GET /roles. Todas las respuestas de usuarios excluyen password. Borrar una cuenta desvincula su perfil y conserva su historial comercial. El último administrador no puede borrarse ni cambiar a otro rol.

No se permite borrar un perfil de cliente mientras esté vinculado a una cuenta: responde 409. Así no queda una cuenta de Cliente sin perfil. Se elimina primero la cuenta, que conserva y desvincula el perfil; después se aplican sus restricciones comerciales normales.

Rol: {"codigo":"consulta_futura","nombre":"Consulta futura","descripcion":"Explica la función del rol"}. Descripción opcional, hasta 255 caracteres, admite null. Código único, minúsculas, números y guion bajo; nombre único. administrador y cliente son códigos reservados: no pueden modificarse ni eliminarse. No se puede borrar un rol utilizado. Un rol nuevo comienza sin permisos; el Administrador los asigna mediante permisos en POST/PUT de roles.

## Colección Postman

Importar SUGAR_MOOD.postman_collection.json y configurar adminCorreo/adminPassword sin exportarlos. Login guarda token; registro/login de cliente guardan tokenCliente y IDs. La colección contiene los 35 endpoints de CRUD y los tres de autenticación, además de salud y casos negativos. Ejecutar las carpetas en orden; la limpieza respeta dependencias. La cuenta de cliente registrada se conserva para inspección manual.

Un cliente que cambie IDs para consultar o modificar pedidos/detalles/perfiles ajenos recibe 404. No basta con ocultar botones: la misma política se ejecuta en servicios y middleware. El usuario y su rol se consultan en cada solicitud.

## Inventario y seguimiento de pedidos

Producto acepta stock y stockMinimo: enteros no negativos (máximo INT). Al crear predeterminan 0 y 5; al editar, omitirlos conserva los valores. Respuesta agrega stockBajo. Stock expresa unidades disponibles; los pedidos nuevos pendientes/preparados/entregados descuentan unidades y los cancelados no. Stock insuficiente responde 409. Pedido entregado no se modifica ni elimina (409), tampoco sus detalles. Cancelar/eliminar libera solo reservas efectivamente aplicadas. Cambiar cantidades o líneas ajusta la diferencia dentro de la misma transacción. stockAplicado es interno y no se acepta en el cuerpo.

Pedido acepta fechaEntrega (ISO con zona, opcional/null, no anterior a fecha) y observaciones (opcional/null, máximo 500). Omitirlas en PUT conserva su valor. GET /pedidos acepta buscar, clienteId, estado, desde y hasta. Fechas AAAA-MM-DD, inclusivas en Costa Rica, aplicadas a fecha de registro. buscar consulta nombre/teléfono del cliente o id exacto. El cliente sigue limitado a sus propios pedidos y no puede filtrar otro clienteId.

GET /reportes/ventas?desde=2026-11-01&hasta=2026-11-30 requiere Administrador. Devuelve periodo, periodoAnterior, resumen y anterior (total, pedidos, unidades, ticketPromedio), variacionPorcentaje (null sin ventas previas), dias y productos (hasta 10, ordenados por unidades). Solo pedidos entregados y sus precios históricos; período entre 1 y 366 días, inicialmente últimos 30 días. Importes como textos de dos decimales. El comprobante del frontend reutiliza GET /pedidos/:id, con la misma autorización.

## Cambio de contraseña y desactivación

POST /auth/change-password autenticado acepta únicamente passwordActual y passwordNueva. Comprueba la actual, aplica los límites existentes a la nueva, invalida todas las sesiones anteriores mediante sesionVersion y borra las cookies del navegador; responde 204. La interfaz confirma la nueva clave antes de enviarla. No implementa recuperación de claves por correo.

POST/PUT /usuarios acepta activo booleano (true inicial, omitido en PUT conserva). Desactivar impide login y uso de JWT; tanto desactivar como reactivar incrementa la versión de sesión. Cambiar password desde administración también la incrementa. La respuesta de usuario incluye activo; no incluye hash ni sesionVersion. Nunca se permite desactivar, degradar o eliminar el último administrador activo.

## Nuevos módulos de operación

GET /roles/permisos (Administrador) devuelve el catálogo de códigos. POST/PUT /roles acepta permisos: lista única de códigos, por ejemplo ["productos.leer","categorias.leer","productos.editar"]. Omitir permisos en PUT conserva asignaciones; [] los elimina. Administrador no permite sobrescribir su acceso completo. Cliente no acepta permisos administrativos/globales. Los nuevos roles operan sobre el negocio según sus asignaciones.

GET /inventario/movimientos?productoId=1&limite=100 (inventario.leer), máximo 500. POST /inventario/movimientos (inventario.crear): {"productoId":1,"tipo":"entrada","cantidad":5,"motivo":"Producción diaria"}. Tipos entrada/salida usan cantidad positiva; ajuste usa el nuevo conteo no negativo. Insuficiencia o fuera de rango: 409. Historial inmutable por API.

GET /pagos?pedidoId=1 (pagos.leer): últimos 500 pagos, limitado a pedidos propios de Cliente. POST /pagos (pagos.crear): {"pedidoId":1,"monto":"500.00","metodo":"sinpe","referencia":"Opcional"}, responde 201. Métodos efectivo/sinpe/transferencia/tarjeta; monto positivo, hasta saldo pendiente. POST /pagos/:id/anular (pagos.anular): {"motivo":"Abono devuelto"}. No hay edición ni borrado de pagos. GET /pedidos agrega pagos, totalPagado, saldoPendiente y estadoPago. Pedidos con historial de pagos no se eliminan; cancelar exige anular pagos vigentes.

GET /agenda?desde=2026-11-05&hasta=2026-11-11&estado=preparado (agenda.leer): usa fechaEntrega y Costa Rica. Omisión de estado excluye cancelados. Máximo 93 días. Cliente solo propios. GET /auditoria?entidad=productos&limite=100 (auditoria.leer): máximo 500, orden reciente primero; antes/despues sin secretos.

POST /imagenes requiere permiso productos.crear o productos.editar, cuerpo binario Content-Type image/png o image/jpeg, máximo 2 MB; devuelve {"imagen":"/api/imagenes/hash.png"}. La API valida y recodifica el archivo. GET /imagenes/:file publica únicamente nombres hash de PNG/JPEG guardados. Producto acepta imagen con la ruta devuelta o null para quitar la referencia. Archivos locales, sin URLs externas ni SVG.

POST /auth/forgot-password acepta {"correo":"cuenta@example.com"}; respuesta genérica 200 sin token si SMTP está configurado, 503 si falta configuración. POST /auth/reset-password acepta {"token":"token-del-enlace","password":"NuevaClave2026!"}; éxito 204, token inválido/usado/vencido 400. Tokens aleatorios de 40 bytes, guardados como hash, un uso, 15 minutos y vinculados a versión de sesión. Ambos endpoints aplican límite por IP; el modo navegador conserva protección CSRF. El envío real queda pendiente de configurar SMTP.
