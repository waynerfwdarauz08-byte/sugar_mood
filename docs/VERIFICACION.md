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
