# Verificación · Día 2 · 5 de noviembre de 2026

## MySQL real

Se ejecutó scripts/test-mysql.cjs con una base temporal aislada. Resultados: cinco pruebas aprobadas, cero fallidas y cero omitidas. Una prueba integra todos los escenarios HTTP y de base de datos; las otras cuatro verifican validaciones.

- Nueve migraciones: creación inicial, reversión completa y reaplicación aprobadas.
- Seeder de ejemplos: carga y segunda ejecución sin duplicación aprobadas.
- CRUDs del negocio: códigos HTTP, relaciones, importes, restricciones únicas y FK aprobados.
- Registro: crea Usuario y Cliente; asigna rol Cliente; rechaza contraseña corta, correo duplicado e intento de enviar id_rol.
- Login, /me y contraseña incorrecta: aprobados. Se comprobaron hashes bcrypt y ausencia de password en respuestas.
- Las cinco operaciones de los siete recursos sin token responden 401. Se probaron tokens alterados, inválidos y vencidos.
- Dos cuentas de cliente: sus listados no incluyen pedidos/detalles ajenos; GET/PUT/DELETE ajenos y POST de detalle en pedido ajeno se rechazan.
- Cliente no puede crear productos, administrar cuentas/roles, asignar otro clienteId ni preparar/entregar pedidos.
- Perfil propio editable; otros perfiles inaccesibles. Pedido propio pendiente editable/cancelable; preparado/cancelado de solo lectura.
- Roles/usuarios: CRUD administrativo, rol en uso, roles del sistema y último administrador protegidos. Cambiar el rol tiene efecto con el token previamente emitido. Borrar cuenta invalida sus siguientes peticiones y conserva el perfil comercial desvinculado.
- Vinculación explícita con cliente preexistente: aprobada.
- Precio histórico, producto inactivo histórico, duplicados, última línea y dos eliminaciones concurrentes: aprobados.
- Fallos después de empezar a escribir: reversión completa aprobada. Los dos 500 del registro de integración son simulados deliberadamente.

Se aplicaron las cuatro migraciones nuevas a la base local y se creó el primer administrador aleatorio. No se borraron registros anteriores. Las credenciales están en backend/.env y permanecen excluidas de Git. El cambio a cookies no agrega migraciones ni tablas.

## Frontend y artefactos

La compilación de producción se completó tras incorporar autenticación, páginas por entidad y administración. Las pruebas DOM verifican redirección sin sesión, permisos de Cliente/Administrador, login con cookies, logout, respuesta 401, registro sin rol editable, conservación de segundos al guardar, carga parcial, vinculación de cuenta con cliente existente, error al borrar último detalle y edición de productos históricos inactivos. La sesión del navegador se conserva en cookie httpOnly; AuthContext la recupera desde /auth/me al recargar.

DER actualizado: siete entidades, seis conexiones, id_rol y cliente.usuarioId, cardinalidades y reglas de integridad. Colección Postman actualizada con autenticación, CRUDs y casos 400/401/403/404, sin credenciales reales. No se afirma haberla ejecutado en la aplicación Postman.

La automatización del navegador no está disponible: el inventario informó que el host de acceso está ausente. No se afirma que haya pasado una prueba visual en un navegador real. Las pruebas DOM y de renderizado, cuando se ejecutan, no sustituyen esa revisión visual.

La auditoría previa de dependencias reportó avisos moderados en la cadena Sequelize/uuid; no se aplicaron degradaciones incompatibles. No se presenta esa auditoría previa como una revisión de seguridad completa del día 2.

## Reproducir

```powershell
npm test --prefix backend
node scripts/test-mysql.cjs
npm test --prefix frontend
npm run build --prefix frontend
```

La prueba MySQL borra exclusivamente la base temporal generada por el runner. La base de desarrollo no se usa para pruebas destructivas.

La descripción de roles es opcional, VARCHAR(255). Se comprobó su creación, actualización y consulta, la aceptación de null y el rechazo de más de 255 caracteres. Los roles iniciales recibieron una descripción mediante la nueva migración.

## Actualización de sesión a cookies

Se verificó con un agente HTTP real que login crea una cookie httpOnly/SameSite=Lax de una hora, que /me y productos funcionan sin Bearer usando esa cookie y que logout la elimina. También se probaron ausencia de prueba CSRF, prueba anterior al login, origen no autorizado, cookie vencida y Authorization inválido sin fallback. La configuración de producción fuerza Secure y prefijo __Host-.

Las pruebas DOM incluyen desmontar y volver a montar la aplicación para simular recarga: se restaura el usuario sin enviar otra vez sus credenciales. Después de logout, la misma recarga vuelve al login. Se comprueba además el fallo de red al cerrar sesión y la renovación controlada de una prueba CSRF antigua.

No se afirmó haber realizado esta comprobación en un navegador visual real. Los escenarios HTTP y DOM se ejecutan sin usar datos comerciales de desarrollo. La colección también incluye ejemplos de sesión por cookies con el cookie jar de Postman activado.

Resultado final de esta actualización: cinco pruebas de backend y dieciséis de frontend aprobadas, sin fallos ni omisiones en la ejecución integrada. Compilación de producción completada correctamente. No se iniciaron servidores permanentes.

## Inventario, entregas, ventas y seguridad de cuentas

La ejecución integrada actual aprobó seis pruebas de backend (dos escenarios amplios de integración y cuatro de validación) y 23 pruebas DOM de frontend. El runner creó una base aislada, aplicó las diez migraciones, cargó las semillas sin duplicarlas, verificó los CRUDs y las mejoras, revirtió todas las migraciones, volvió a aplicarlas y eliminó únicamente su base temporal.

Se verificaron reservas concurrentes de la última unidad con clientes diferentes; stock insuficiente; ajuste por cantidades, detalles, cancelación y reactivación; cancelación repetida sin duplicar existencias; protección de pedidos entregados; y tratamiento de pedidos anteriores sin reserva. Un fallo deliberado después de reservar y escribir la primera línea revirtió inventario y pedido parcial. Los tres errores internos de esa ejecución fueron simulados por las pruebas de rollback.

Entregas anteriores al registro y observaciones excesivas se rechazan. Se comprobaron filtros por cliente, fechas de Costa Rica, estado y búsqueda literal, aislamiento entre clientes, informe exclusivo de Administrador, ventas entregadas con precios históricos, comparación entre períodos y período vacío. Los importes se verificaron con centavos exactos.

Cambiar contraseña invalida sesiones anteriores y borra la cookie; desactivar bloquea login y JWT, y reactivar no recupera tokens viejos. El último administrador activo queda protegido. Las pruebas DOM incluyen existencias, entrega/observaciones, envío de filtros, comprobante y llamada a imprimir, ventas y sus permisos, confirmación de clave y desactivación de usuarios.

La migración 202611050005 se aplicó también a la base local, sin borrar datos. Los productos anteriores quedan con stock disponible 0 para que se cargue un conteo real. Los JWT anteriores al cambio requieren iniciar sesión otra vez. No se iniciaron servidores permanentes. La impresión fue probada mediante DOM y llamada a window.print; el aspecto del papel no fue verificado en un navegador visual real.

Se actualizaron API, README, modelo editable y colección Postman. La colección contiene ejemplos de stock, filtros, ventas, contraseña incorrecta y desactivación/reactivación de una cuenta temporal. No se afirma haber ejecutado la colección en Postman.

## Ampliación de operación, permisos y recuperación

Resultado final: siete pruebas de backend (tres escenarios amplios de integración y cuatro de validación) y 30 pruebas DOM, sin fallos ni omisiones en el runner integrado. Compilación de producción aprobada. Se aplicaron, revirtieron y reaplicaron las once migraciones en una base temporal; las semillas se verificaron sin duplicación. La base y los archivos de imágenes generados exclusivamente para pruebas se eliminaron al finalizar.

Se comprobaron entradas, salidas, ajuste de conteo y reserva de pedido con responsable y saldos; rechazo de inventario insuficiente; pagos parciales, saldo exacto, sobrepago y dos abonos concurrentes; prohibición de cancelar con pagos vigentes y de borrar historial de pagos; anulación con motivo; rollback del stock al intentar reducir el total por debajo de los abonos; agenda por fecha de entrega y alcance de Cliente.

Imágenes: carga PNG real, lectura por hash, cabecera nosniff, actualización de producto, rechazo de archivos inválidos, JPEG truncado y URL externa. Sharp valida y recodifica. Los archivos de prueba se almacenaron en una carpeta temporal aislada, no en las imágenes del negocio.

Auditoría: autor, precio anterior/posterior, ausencia de hashes de contraseña en la respuesta y autoeliminación de un administrador cuando existe otro, conservando su nombre histórico. Los cambios usan la misma transacción del registro original. Roles: catálogo, dependencias entre permisos, nuevo rol con consulta/edición limitada, rechazo de creación y administración no autorizadas, revocación con el mismo JWT, Cliente sin permisos globales y acceso completo de Administrador protegido.

Recuperación: transporte de correo simulado; respuesta sin token y equivalente para cuenta inexistente; hash almacenado; espera entre solicitudes; token de un uso y caducidad; invalidez tras cambio de versión de sesión; cierre de sesiones y límite por IP. No se enviaron mensajes externos. El usuario decidió dejar pendiente SMTP, por lo que no se afirma entrega de correos reales. Sin configuración, la interfaz muestra la necesidad de habilitar correo en el servidor.

Las siete pruebas DOM nuevas cubren movimiento de inventario, abono y consulta de Cliente, agenda, detalle de auditoría con contenido escapado, solicitud/restablecimiento de contraseña, selección de permisos y un rol de consulta, y carga de archivo de producto. Se mantienen los 23 escenarios anteriores. No se realizó una prueba visual en navegador real.

La migración 202611050006 se aplicó a la base local sin borrar registros; documenta el saldo inicial de cada producto existente. El proyecto conserva frontend y backend separados, con modelos y controladores de cada nuevo recurso en sus carpetas. DER actualizado a doce tablas y colección de API ampliada con consultas y casos negativos. No se iniciaron servidores permanentes.

Actualización de SMTP: el usuario configuró Gmail localmente y Nodemailer verificó conexión y autenticación correctamente. La comprobación no envió correos; la entrega real y el recorrido desde la bandeja de entrada requieren la prueba del usuario. Las credenciales permanecen exclusivamente en backend/.env, excluido de Git. Esta verificación sustituye el estado anterior de configuración pendiente.
