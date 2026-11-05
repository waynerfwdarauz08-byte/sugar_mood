# SUGAR MOOD · Día 2

Sistema empresarial de paletas, postres y minidonitas. Node.js/Express, Sequelize/MySQL y React/Vite. Incluye catálogo, pedidos, inventario, pagos, auditoría, autenticación JWT y roles configurables.

## Ejecutar · PowerShell

Requisitos: Node 22.12+ y MySQL 8.0.16+ activo. Desde la raíz:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

En esta computadora la base ya recibió las migraciones y el primer administrador ya está creado. Su correo y contraseña aleatorios están únicamente en `backend/.env`, en `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Abrir ese archivo localmente para consultar el acceso; no publicarlo. Después de conservar la contraseña en un lugar seguro, se pueden quitar las variables ADMIN_*: solo se usan para la creación inicial.

Iniciar en dos terminales:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Las dos terminales deben partir de la raíz del proyecto. Abrir la dirección mostrada por Vite (normalmente http://127.0.0.1:5173). La API escucha en http://127.0.0.1:3000. GET /api/salud comprueba MySQL y es público; el navegador se autentica con cookie httpOnly. También se admite Bearer para Postman y otros clientes API.

## Instalar en otra computadora

Desde la raíz, copiar `backend/.env.example` a `backend/.env` únicamente si este último no existe. Completar DB_USER, DB_PASSWORD, DB_NAME y JWT_SECRET. Se puede generar un secreto con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copiar el resultado a JWT_SECRET en el archivo local. Luego:

```powershell
npm run db:create --prefix backend
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
```

Si la base existe, continuar con migraciones sin borrarla. El seeder agrega ejemplos ficticios identificados como tales; SequelizeData evita repetir la misma carga. Los roles iniciales se insertan en su migración. Las cuatro migraciones del día 2 agregan roles, usuarios, clientes.usuarioId y roles.descripcion; no borran los registros del día 1. El cambio a cookies no necesita nuevas tablas ni migraciones.

Para crear el primer administrador, completar ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env y ejecutar:

```powershell
npm run admin:create --prefix backend
```

La contraseña debe tener al menos ocho caracteres y como máximo 72 bytes UTF-8. El comando no promociona cuentas existentes y rechaza ejecutarse cuando ya hay un administrador activo. Las demás cuentas y roles se gestionan desde la interfaz administrativa.

## Sesión y permisos

- Registro público: Cliente; pide nombre, correo, contraseña, teléfono y dirección opcional. Crea cuenta y perfil de cliente en una transacción. No acepta id_rol ni clienteId.
- Administrador: CRUD de categorías, productos, clientes, pedidos, detalles, usuarios y roles. Puede vincular una cuenta a un cliente previo mediante selector explícito.
- Cliente: consulta categorías y productos activos, consulta/edita su propio perfil, crea pedidos pendientes y consulta únicamente sus pedidos y detalles. Puede editar, cancelar o eliminar un pedido propio pendiente. Un pedido preparado, entregado o cancelado queda de solo lectura para el cliente. Solo el administrador prepara o entrega.
- Se conserva al menos un administrador activo. Los códigos administrador y cliente no se pueden cambiar ni borrar. Otros roles comienzan sin permisos; el Administrador los configura desde Roles. Los permisos se validan en el servidor y se consultan en cada petición.
- Borrar una cuenta desvincula su perfil y conserva cliente, pedidos e historial. Eliminar un cliente con pedidos o una entidad con dependencias responde 409.

JWT HS256 de una hora, secreto exclusivamente en .env y verificación de firma, algoritmo, emisor y audiencia. Cada solicitud vuelve a leer el usuario y el rol en MySQL; los cambios de rol no dependen de un claim antiguo. Las contraseñas se guardan con bcrypt, coste 12, y no aparecen en respuestas.

El JWT del navegador se guarda en una cookie httpOnly, SameSite=Lax, host-only y con duración de una hora. **Recargar conserva la sesión mientras el JWT siga vigente.** AuthContext consulta /api/auth/me al arrancar y espera la respuesta antes de decidir si redirige al login; React no lee ni guarda el JWT. Fetch usa credentials: include. El vencimiento original no se extiende al recargar y no se añadieron refresh tokens.

Cerrar sesión realiza POST /api/auth/logout, que borra las cookies en el servidor. Si falla la conexión, la interfaz informa del fallo y permite reintentar, sin afirmar que la cookie se borró. Un 401 invalida el estado local; un 403 de permisos no cierra la sesión. Las operaciones con cookies requieren una prueba CSRF firmada y vinculada a la sesión, obtenida desde /api/auth/csrf y enviada en X-CSRF-Token. Se comprueba además el origen de la solicitud. Si la prueba quedó antigua por otra pestaña, se obtiene una nueva y se reintenta una sola vez.

En producción las cookies llevan Secure y prefijo __Host-; se requiere HTTPS. En desarrollo local se admite HTTP; COOKIE_SECURE=true permite forzar cookies Secure para un entorno de prueba con HTTPS. El frontend debe usar el proxy /api o un despliegue del mismo sitio: SameSite=Lax no habilita cookies entre sitios diferentes. Cambiar o restablecer la contraseña, desactivar una cuenta o eliminarla invalida sus JWT anteriores. Logout borra la cookie de ese navegador; una copia externa continúa válida hasta vencer si la cuenta sigue activa y no cambió su versión de sesión. Consulte [la investigación](docs/INVESTIGACION_JWT.md) para conocer la decisión y sus límites.

## Carpetas y responsabilidades

Backend mantiene config/, models/, migrations/, seeders/, services/, controllers/, routes/, middlewares/, tests/ y scripts/. No se movió a backend/src. Cada entidad tiene modelo, servicio, controlador y rutas propios. Las fábricas compartidas reutilizan los CRUDs sin duplicarlos. El recorrido es rutas → controlador → servicio → modelo.

Frontend mantiene src/components/, pages/, routes/, services/, context/, App.jsx y main.jsx. index.html carga main, que monta BrowserRouter y AuthProvider. RutaProtegida y el menú distinguen roles; el backend valida los permisos independientemente de la interfaz. Cada entidad tiene su página; los detalles también se siguen editando desde el pedido. No hay Fetch en componentes: servicios por entidad usan el cliente común.

Vite reenvía /api al backend en 127.0.0.1:3000 tanto en dev como en preview. Si cambia el puerto del backend, ajustar frontend/vite.config.js. VITE_API_URL permite una API externa; requiere configurar CORS_ORIGIN en el backend.

## Datos e importes

Los cinco modelos originales mantienen tipos, nombres y timestamps:false. Usuario usa exclusivamente fechaCreacion automática. usuarios.id_rol referencia roles.id; clientes.usuarioId es FK única opcional. Un usuario puede tener cero o un cliente; clientes previos pueden no tener cuenta. usuario.nombre es el nombre de presentación de la cuenta y cliente.nombre es el contacto comercial; la vinculación nunca se decide por coincidencia de nombre o teléfono.

Los precios históricos permanecen en detalles_pedido; no se almacenan subtotal ni total. Backend y vista previa usan centavos BigInt. PUT de pedido reemplaza líneas de manera atómica, conserva precio histórico de productos existentes y toma el vigente para productos nuevos. PUT de detalle solo cambia cantidad. Todas las escrituras de líneas bloquean el pedido para proteger la última línea aun con operaciones concurrentes.

## Pruebas

Desde la raíz:

```powershell
npm test --prefix backend
node scripts/test-mysql.cjs
npm test --prefix frontend
npm run build --prefix frontend
```

La prueba de MySQL crea una base nueva sugar_mood_test_<fecha>_<aleatorio>, migra, carga ejemplos, ejecuta los casos de CRUD/autenticación/permisos, revierte y reaplica migraciones y elimina únicamente esa base. No usa los datos de desarrollo para operaciones destructivas. Los dos 500 provocados durante la prueba son fallos simulados para comprobar rollback.

La colección docs/SUGAR_MOOD.postman_collection.json incluye los CRUDs y casos 400/401/403/404. Configurar adminCorreo y adminPassword localmente en Postman; no exportar credenciales o tokens reales. Ejecutar en orden: autenticación, recursos, errores y limpieza. Crea ejemplos y los elimina al final, salvo la cuenta de cliente de prueba registrada.

Flujo manual: login administrador → crear categoría/producto/cliente → registrar cliente nuevo → crear y editar un pedido propio → comprobar que otra cuenta no lo ve → administrador prepara pedido → cliente ya no puede modificarlo → cerrar sesión → acceso protegido redirige al login.

## Entregables

- docs/INVESTIGACION_JWT.md: investigación previa, decisión y fuentes.
- docs/PROYECTO.md: problema empresarial, alcance y normalización.
- docs/API.md: endpoints, cuerpos y permisos.
- docs/DER_SUGAR_MOOD.drawio: diagrama editable con siete entidades y seis conexiones.
- docs/SUGAR_MOOD.postman_collection.json: colección importable sin secretos reales.
- docs/VERIFICACION.md: resultados actuales y límites.

No se agregó stock, pagos ni módulos ajenos al alcance. Los roles se incorporaron a solicitud del usuario aunque el PDF no los exige. Se implementaron también cinco endpoints administrativos de Usuario para cubrir la redacción general de CRUDs del día 2, además de registro/login/me.

`npm run db:undo --prefix backend` elimina las tablas al revertir: usar solo con una base de prueba prescindible. El down del seeder conserva su protección contra borrado de registros por nombre.

## Inventario, entregas, ventas y cuentas

La migración 202611050005 agrega stock y stockMinimo a productos; fechaEntrega, observaciones y stockAplicado a pedidos; activo y sesionVersion a usuarios. Se mantienen las siete tablas y la separación frontend/backend. Para actualizar una instalación existente: npm run db:migrate --prefix backend. No ejecutar db:undo en la base de trabajo. Los JWT emitidos antes de esta actualización requieren iniciar sesión otra vez.

Productos muestra unidades disponibles, agotados y stock bajo (stock <= stockMinimo). El administrador carga el conteo disponible y el umbral desde Editar producto. Un pedido pendiente/preparado reserva stock; cancelar o eliminar devuelve esas unidades. Reactivar vuelve a reservar; entregar conserva el descuento. Los pedidos entregados quedan protegidos contra modificación y borrado, incluidos sus detalles. Se usan transacciones y bloqueos para impedir sobreventa concurrente.

Los productos existentes comienzan con stock 0: introduce sus existencias reales antes de recibir pedidos nuevos. No se inventa inventario ni se descuentan retroactivamente pedidos anteriores. stockAplicado es interno: los pedidos antiguos no devuelven unidades que nunca reservaron; su primera edición no cancelada requiere reservar todas sus unidades. Cuenta como disponibles solo las unidades libres; las reservas anteriores a la actualización deben apartarse al realizar el conteo inicial.

Pedidos permite programar entrega (opcional, posterior al registro), agregar hasta 500 caracteres de observaciones y filtrar por cliente, fechas, estado, nombre/teléfono o número de pedido. Las fechas de filtros corresponden al registro y usan Costa Rica. Comprobante abre una vista protegida con impresión; conserva precios históricos y no sustituye una factura electrónica.

Ventas es exclusivo del administrador: incluye solo pedidos entregados según fecha de registro, total, unidades, promedio por pedido, 10 productos principales, detalle diario y comparación con el período anterior de igual duración. Rango de 1 a 366 días, inicialmente 30. No registra pagos ni beneficios.

Mi contraseña solicita la clave actual y confirmación de la nueva. Guardar cierra las sesiones anteriores. Usuarios permite desactivar/reactivar sin eliminar el historial; la cuenta desactivada no puede iniciar sesión ni usar tokens anteriores. Reactivar no restaura tokens viejos. El último administrador activo queda protegido.

## Operación ampliada

La migración 202611050006 agrega cinco tablas: rol_permisos, movimientos_inventario, pagos, auditoria y recuperaciones_password, además de productos.imagen e índice de entrega. Se mantienen frontend/src/pages y frontend/src/services separados de backend/models, migrations, services, controllers, routes y middlewares.

- Inventario: entradas, salidas y ajustes con motivo, autor, saldo anterior y posterior. Los pedidos generan movimientos de reserva/liberación en su transacción. El saldo inicial de productos anteriores queda documentado; no se reconstruye actividad pasada. El listado muestra los últimos 100 movimientos; la API admite hasta 500 y filtro por producto.
- Pagos: abonos en efectivo, SINPE, transferencia o tarjeta. Muestra saldo, pagado y estado. No admite sobrepago ni saldo negativo, tampoco al editar líneas de pedido. Los pagos se anulan con motivo y se conservan; un pedido con historial de pagos no se elimina. Para cancelar un pedido deben anularse sus pagos activos. El comprobante muestra pagos y saldo. No procesa cobros bancarios ni emite facturas fiscales.
- Agenda: entregas de hoy y próximos seis días, filtro por fechas y estado; máximo 93 días. Cliente solo ve sus entregas.
- Imágenes: selector en Productos, PNG/JPEG de hasta 2 MB. Sharp valida, limita dimensiones, reduce a 1200 px y elimina metadatos al recodificar. Los archivos se guardan en backend/uploads/productos, fuera de Git. Respaldar esa carpeta junto con la base. No se eliminan archivos automáticamente al quitar la imagen del producto.
- Auditoría: cambios de catálogo, cuentas, roles/permisos, pedidos/detalles y pagos; antes/después y responsable. No guarda claves, hashes de contraseña, JWT ni tokens de recuperación. Solo registra operaciones realizadas por la aplicación desde su habilitación, no consultas ni cambios SQL externos. Historial consultable, sin edición ni borrado por API.
- Roles: permisos por recurso para consultar, crear, editar, eliminar y anular pagos. Usuarios y Roles siguen exclusivos del Administrador; ese rol conserva acceso completo. Cliente solo admite permisos de catálogo y datos propios. Los otros roles tienen alcance sobre el negocio según permisos asignados. La interfaz agrega consultas necesarias al marcar escrituras; el backend valida dependencias. Al cambiar permisos, el backend los aplica en la siguiente solicitud; recargar actualiza el menú del navegador.

## Recuperación de contraseña por correo

Olvidé mi contraseña solicita un enlace de un uso y 15 minutos; el token aleatorio se almacena como SHA-256, viaja en el fragmento del enlace y se retira de la barra de direcciones al abrirlo. Restablecer revoca las sesiones anteriores. La respuesta de solicitud no revela si el correo existe. Hay límite por IP de 10 intentos en 15 minutos por proceso y espera de 60 segundos entre correos para una cuenta. No se implementa una cola durable: reiniciar el proceso durante un envío puede requerir solicitar otro enlace.

**El envío real queda pendiente por decisión del usuario.** Para habilitarlo, completar en backend/.env SMTP_HOST, SMTP_PORT (587 STARTTLS o 465 TLS), SMTP_FROM, SMTP_USER, SMTP_PASSWORD y FRONTEND_URL. FRONTEND_URL debe ser la dirección fija del frontend; usar HTTPS en producción. Nunca subir esas credenciales a Git. Sin SMTP la solicitud informa que el servidor requiere configuración; no simula haber enviado el correo. Las pruebas usan un transporte simulado y no envían mensajes externos.

Fuentes técnicas: [Nodemailer SMTP](https://nodemailer.com/smtp) y [OWASP: recuperación de contraseña](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
