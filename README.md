# SUGAR MOOD

Sistema empresarial de paletas, postres y minidonitas. Backend Node/Express/Sequelize/MySQL y frontend React/Vite. Cinco entidades con CRUD completo, sin autenticación.

## Ejecutar en PowerShell

Requisitos: Node 22.12 o superior y MySQL 8.0.16 o superior activo. Desde la raíz:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

La configuración local `backend/.env` ya está preparada. En otra computadora, copiar el ejemplo y completar DB_USER y DB_PASSWORD:

```powershell
Copy-Item backend/.env.example backend/.env
```

No sobrescribir un `.env` existente. No publicar sus credenciales.

```powershell
npm run db:create --prefix backend
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev --prefix backend
```

Si la base ya existe, continuar con migraciones; no borrarla. La base local de esta entrega ya quedó creada, migrada y con ejemplos. Las semillas se registran en SequelizeData y no se repiten.

En otra terminal desde la raíz:

```powershell
npm run dev --prefix frontend
```

Abrir la dirección que muestre Vite, normalmente http://127.0.0.1:5173. El frontend usa /api y Vite reenvía las solicitudes al backend en http://127.0.0.1:3000, tanto en desarrollo como en preview. Así funciona también con localhost o si Vite elige otro puerto. Si se cambia el puerto del backend, actualizar el target del proxy en frontend/vite.config.js. VITE_API_URL permite configurar una API externa; en ese caso su origen debe autorizarse mediante CORS_ORIGIN del backend.

## Organización

Backend separado en config, models, migrations, seeders, services, controllers y routes. Los cinco modelos tienen tableName explícito, timestamps desactivados y asociaciones con alias/FK explícitos. Las migraciones crean el esquema; no se usa sync ni alter. El esquema estable de migraciones está en config/migration-schema.js. Controlador y rutas usan fábricas comunes para evitar repetir el mismo CRUD.

Servicios validan entradas, referencias y reglas empresariales. Controllers adaptan HTTP/JSON. app.js configura middleware y arranca después de authenticate().

Frontend: components → pages → routes → App → main → index. En ejecución index carga main, que monta App y sus rutas. Las llamadas Fetch están centralizadas en src/services/api.js. Detalles se administran dentro de pedidos.

## Pedidos e importes

PUT de pedidos recibe la cabecera y el conjunto completo de líneas. Productos conservados mantienen precio histórico e ID de detalle; productos nuevos toman precio actual; líneas omitidas se eliminan en la transacción. No se pueden agregar productos inactivos. PUT de detalles solo cambia cantidad; cambiar producto se hace desde la edición de pedido.

Todas las escrituras de detalles bloquean primero el pedido con SELECT FOR UPDATE para proteger el mínimo de una línea incluso con bajas concurrentes. Borrar pedido elimina explícitamente detalles antes de la cabecera. Otras dependencias se protegen con RESTRICT.

El backend usa centavos BigInt para aritmética monetaria exacta. JSON devuelve importes como textos con dos decimales. No se almacenan subtotal ni total. La vista previa de la interfaz es estimada; el backend confirma los valores definitivos.

## Pruebas

```powershell
npm test --prefix backend
node scripts/test-mysql.cjs
npm run build --prefix frontend
```

El primer comando ejecuta pruebas sin base y omite integración. El segundo crea una base nueva `sugar_mood_test_<fecha>_<aleatorio>`, migra, carga semillas dos veces, ejecuta CRUDs e integridad, revierte/reaplica migraciones y elimina únicamente esa base temporal. Requiere permisos CREATE/DROP DATABASE y las credenciales de backend/.env. No usa la base de desarrollo para pruebas destructivas.

Flujo manual: crear categoría → producto → cliente → pedido de dos líneas; editar cantidades; cambiar precio del catálogo; volver al pedido y comprobar el histórico; consultar detalle y cambiar estado; intentar eliminar un padre con hijos y la última línea; finalmente eliminar un pedido con confirmación.

`npm run db:undo --prefix backend` revierte las tablas del proyecto: usar solo en una base de prueba prescindible. El seeder protege su down para no borrar datos por nombre accidentalmente.

## Entregables

- docs/PROYECTO.md: propuesta y explicación de 1FN, 2FN y 3FN.
- docs/API.md: tabla de endpoints y ejemplos JSON.
- docs/DER_SUGAR_MOOD.drawio: DER editable en diagrams.net.
- docs/SUGAR_MOOD.postman_collection.json: colección importable.
- docs/VERIFICACION.md: resultados y comprobaciones pendientes.
- backend/ y frontend/: código y lockfiles.

Materiales leídos: ambos PDF completos (2 y 15 páginas), ambas presentaciones completas (16 y 17 diapositivas) y DER PNG. Las instrucciones del usuario amplían los mínimos de día 1 a cinco entidades y CRUDs completos. No se recibió Pasos de Realizacion.txt; se aplicaron las correcciones incluidas en la solicitud.
