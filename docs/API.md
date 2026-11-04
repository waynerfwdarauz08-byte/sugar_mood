# API REST

Base: http://127.0.0.1:3000/api. JSON, sin autenticación.

| Recurso    | Crear                 | Listar               | Consultar                | Actualizar               | Eliminar                    |
| ---------- | --------------------- | -------------------- | ------------------------ | ------------------------ | --------------------------- |
| Categorías | POST /categorias      | GET /categorias      | GET /categorias/:id      | PUT /categorias/:id      | DELETE /categorias/:id      |
| Productos  | POST /productos       | GET /productos       | GET /productos/:id       | PUT /productos/:id       | DELETE /productos/:id       |
| Clientes   | POST /clientes        | GET /clientes        | GET /clientes/:id        | PUT /clientes/:id        | DELETE /clientes/:id        |
| Pedidos    | POST /pedidos         | GET /pedidos         | GET /pedidos/:id         | PUT /pedidos/:id         | DELETE /pedidos/:id         |
| Detalles   | POST /detalles-pedido | GET /detalles-pedido | GET /detalles-pedido/:id | PUT /detalles-pedido/:id | DELETE /detalles-pedido/:id |

GET /salud comprueba MySQL y responde con estado disponible y nombre del sistema.

## Cuerpos POST y PUT

Categoría:

```json
{ "nombre": "Paletas", "descripcion": "Paletas artesanales" }
```

Producto:

```json
{
  "categoriaId": 1,
  "nombre": "Paleta ChocoVainilla",
  "precio": "700.00",
  "activo": true
}
```

Cliente:

```json
{
  "nombre": "Ana (ejemplo)",
  "telefono": "0000-1234",
  "direccion": "Dirección ficticia"
}
```

Pedido:

```json
{
  "clienteId": 1,
  "fecha": "2026-11-04T10:00:00-06:00",
  "estado": "pendiente",
  "detalles": [{ "productoId": 1, "cantidad": 2 }]
}
```

Detalle POST:

```json
{ "pedidoId": 1, "productoId": 2, "cantidad": 1 }
```

Detalle PUT:

```json
{ "cantidad": 3 }
```

Usar IDs devueltos por las altas. descripcion y direccion admiten null o ausencia; activo predetermina true; estado predetermina pendiente. PUT de catálogos exige los campos obligatorios completos. PUT de pedido reemplaza sus líneas. PUT de detalle solo modifica cantidad, conservando producto y precio histórico.

El valor predeterminado de estado se aplica si el campo está ausente; enviar null se rechaza con 400. Las respuestas de creación, actualización y consulta de productos incluyen categoria.

El cliente no puede escribir id, precioUnitario, subtotal ni total. Campos desconocidos se rechazan. Fechas ISO 8601 con zona; la interfaz muestra hora de Costa Rica.

## Respuestas

POST: 201 con registro. GET/PUT: 200 con objeto; listar devuelve arreglo. DELETE: 204 sin cuerpo. Error: {"error":"Mensaje en español"}.

400 para entradas inválidas o referencias nuevas inexistentes; 404 para registro/ruta inexistente; 409 para duplicados, producto repetido, última línea o dependencias; 500 para fallo inesperado sin traza ni credenciales.

Producto incluye categoria; detalle incluye producto y subtotal; pedido incluye cliente, detalles con producto/subtotal y total. Los importes son textos con dos decimales: dos paletas a "700.00" producen total "1400.00".

Al agregar líneas el backend toma el precio vigente y rechaza productos inactivos. Al editar cantidades mantiene el precio histórico. Al eliminar pedido, borra explícitamente sus detalles y después la cabecera en una sola transacción.

## Postman

Importar SUGAR_MOOD.postman_collection.json. Las altas guardan IDs en variables de colección. Crear categoría, cliente, producto y pedido. Para agregar otro detalle, crear un segundo producto y configurar otroProductoId; no repetir el primero. Eliminar primero pedidos y luego productos/clientes/categorías. Los conflictos esperados responden 409. La colección ofrece ejemplos por verbo; las pruebas automáticas completas están en scripts/test-mysql.cjs.
