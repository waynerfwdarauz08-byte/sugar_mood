# Verificación · 4 de noviembre de 2026

- Node 24.13, MySQL 8 local, Sequelize 6 y Vite 7.
- Build de producción del frontend: aprobado.
- Cuatro pruebas de validación: aprobadas (dinero exacto, IDs, textos/campos y fechas/estados).
- Integración MySQL real: aprobada en una base temporal nueva, eliminada al terminar.
- Cinco migraciones: creación, reversión completa y reaplicación aprobadas.
- Seeder: primera carga aprobada; segunda ejecución no duplica registros gracias a SequelizeData.
- CRUD de las cinco entidades y consultas con relaciones: aprobados.
- Respuestas 400, 404, 409 y eliminaciones 204: aprobadas.
- Pedidos sin detalles, productos repetidos/inactivos nuevos y referencias inexistentes: rechazados.
- Fallos al crear o editar pedidos dejan el estado anterior intacto.
- Precio histórico conservado después de cambiar el precio del catálogo y desactivar el producto.
- Borrado de pedido y detalles, protección de padres relacionados y del último detalle: aprobados.
- Dos eliminaciones concurrentes de líneas: una responde 204 y la otra 409; queda una línea.

La base de desarrollo sugar_mood se creó y recibió migraciones y datos ficticios marcados como ejemplos. No se borraron bases ni datos previos. API y Vite arrancaron correctamente en 127.0.0.1:3000 y 127.0.0.1:5173.

Comprobación HTTP adicional: frontend /, API /api/salud y /api/pedidos respondieron 200. Se verificó la sintaxis de los 16 archivos JavaScript del backend y la validez XML del DER (cinco entidades, cuatro conexiones y etiquetas de cardinalidad). La colección contiene los 25 endpoints CRUD y la solicitud de salud.

La auditoría npm de dependencias de ejecución reportó dos avisos moderados en la cadena Sequelize → uuid. No se aplicó la degradación incompatible de Sequelize sugerida por npm. El proyecto no usa UUID como identificadores: usa INT autoincremental. Conviene revisar estas dependencias antes de un despliegue público.

No se completó la prueba visual/interactiva: el control de Chrome se detuvo porque no pudo determinar la URL activa con suficiente confianza. El build no sustituye esa comprobación. Se recomienda ejecutar el flujo manual descrito en README antes de presentar.

Comandos reproducibles desde la raíz:

```powershell
npm test --prefix backend
node scripts/test-mysql.cjs
npm run build --prefix frontend
```
