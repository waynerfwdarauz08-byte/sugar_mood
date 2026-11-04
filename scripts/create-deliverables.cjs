const fs = require("fs");
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const entities = [
  [
    "categorias",
    40,
    40,
    320,
    150,
    "id INT PK AI\nnombre VARCHAR(80) NN UQ\ndescripcion VARCHAR(255) NULL",
  ],
  [
    "productos",
    40,
    300,
    320,
    190,
    "id INT PK AI\ncategoriaId INT FK NN\nnombre VARCHAR(100) NN UQ\nprecio DECIMAL(10,2) NN >= 0\nactivo BOOLEAN NN DEFAULT TRUE",
  ],
  [
    "clientes",
    840,
    40,
    320,
    150,
    "id INT PK AI\nnombre VARCHAR(100) NN\ntelefono VARCHAR(20) NN\ndireccion VARCHAR(255) NULL",
  ],
  [
    "pedidos",
    840,
    300,
    320,
    190,
    "id INT PK AI\nclienteId INT FK NN\nfecha DATETIME NN\nestado ENUM NN DEFAULT pendiente\npendiente / preparado / entregado / cancelado",
  ],
  [
    "detalles_pedido",
    440,
    580,
    360,
    210,
    "id INT PK AI\npedidoId INT FK NN\nproductoId INT FK NN\ncantidad INT NN > 0\nprecioUnitario DECIMAL(10,2) NN >= 0\nUQ (pedidoId, productoId)",
  ],
];
let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';
for (const [name, x, y, w, h, fields] of entities)
  cells += `<mxCell id="${name}" value="${escape(name + "\n\n" + fields)}" style="rounded=0;whiteSpace=wrap;html=0;align=left;verticalAlign=top;spacing=14;fillColor=#eaf2fc;strokeColor=#537ca9;fontSize=14;fontFamily=Arial;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
const edges = [
  ["categorias", "productos", "0..N", 0.5, 1, 0.5, 0],
  ["clientes", "pedidos", "0..N", 0.5, 1, 0.5, 0],
  ["productos", "detalles_pedido", "0..N", 0.5, 1, 0, 0.5],
  ["pedidos", "detalles_pedido", "1..N", 0.5, 1, 1, 0.5],
];
edges.forEach(([a, b, m, ex, ey, ix, iy], i) => {
  cells += `<mxCell id="e${i}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=0;endArrow=none;startArrow=none;strokeColor=#537ca9;exitX=${ex};exitY=${ey};entryX=${ix};entryY=${iy};" edge="1" parent="1" source="${a}" target="${b}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  for (const [side, label, x] of [
    ["a", "1", -0.8],
    ["b", m, 0.8],
  ])
    cells += `<mxCell id="l${i}${side}" value="${label}" style="edgeLabel;html=0;align=center;verticalAlign=middle;resizable=0;fontSize=14;labelBackgroundColor=#ffffff;" vertex="1" connectable="0" parent="e${i}"><mxGeometry x="${x}" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>`;
});
const legend =
  "PK: primaria · FK: foránea · AI: autoincremental · NN: obligatorio · UQ: único\nCada hijo pertenece a un único padre. FK: ON DELETE RESTRICT / ON UPDATE CASCADE.\nTodo pedido tiene al menos un detalle: validado en el servicio dentro de una transacción.\nprecioUnitario conserva el precio histórico. Subtotal y total se calculan, no se almacenan.\nSequelize: timestamps: false.";
cells += `<mxCell id="legend" value="${escape(legend)}" style="text;html=0;align=left;verticalAlign=top;whiteSpace=wrap;fontSize=14;" vertex="1" parent="1"><mxGeometry x="40" y="850" width="1120" height="140" as="geometry"/></mxCell>`;
// Los saltos de línea de atributos XML deben codificarse como referencias numéricas.
const xml = `<mxfile host="app.diagrams.net"><diagram name="SUGAR MOOD" id="sugar-mood"><mxGraphModel grid="1" gridSize="10" page="1" pageWidth="1200" pageHeight="1050"><root>${cells}</root></mxGraphModel></diagram></mxfile>`;
fs.writeFileSync("docs/DER_SUGAR_MOOD.drawio", xml.replaceAll("\n", "&#10;"));
const bodies = {
  categorias: {
    nombre: "Categoría Postman (ejemplo)",
    descripcion: "Datos ficticios",
  },
  productos: {
    categoriaId: "{{categoriaId}}",
    nombre: "Paleta Postman (ejemplo)",
    precio: "700.00",
    activo: true,
  },
  clientes: {
    nombre: "Cliente Postman (ejemplo)",
    telefono: "0000-1234",
    direccion: "Dirección ficticia",
  },
  pedidos: {
    clienteId: "{{clienteId}}",
    fecha: "2026-11-04T10:00:00-06:00",
    estado: "pendiente",
    detalles: [{ productoId: "{{productoId}}", cantidad: 2 }],
  },
  "detalles-pedido": {
    pedidoId: "{{pedidoId}}",
    productoId: "{{otroProductoId}}",
    cantidad: 1,
  },
};
const variables = {
  categorias: "categoriaId",
  productos: "productoId",
  clientes: "clienteId",
  pedidos: "pedidoId",
  "detalles-pedido": "detalleId",
};
const item = [
  { name: "Salud", request: { method: "GET", url: "{{baseUrl}}/salud" } },
];
for (const kind of Object.keys(bodies)) {
  const id = variables[kind],
    group = [];
  for (const [method, label, suffix] of [
    ["POST", "Crear", ""],
    ["GET", "Listar", ""],
    ["GET", "Consultar", "/{{" + id + "}}"],
    ["PUT", "Actualizar", "/{{" + id + "}}"],
    ["DELETE", "Eliminar", "/{{" + id + "}}"],
  ]) {
    const body =
      method === "PUT" && kind === "detalles-pedido"
        ? { cantidad: 3 }
        : bodies[kind];
    const request = { method, url: "{{baseUrl}}/" + kind + suffix, header: [] };
    if (["POST", "PUT"].includes(method)) {
      request.header = [{ key: "Content-Type", value: "application/json" }];
      request.body = {
        mode: "raw",
        raw: JSON.stringify(body, null, 2),
        options: { raw: { language: "json" } },
      };
    }
    const exec = [
      `pm.test('Código HTTP esperado',()=>pm.response.to.have.status(${method === "POST" ? 201 : method === "DELETE" ? 204 : 200}));`,
    ];
    if (method === "POST")
      exec.push(
        `if(pm.response.code===201) pm.collectionVariables.set('${id}',pm.response.json().id);`,
      );
    group.push({
      name: label + " " + kind,
      request,
      event: [{ listen: "test", script: { type: "text/javascript", exec } }],
    });
  }
  item.push({ name: kind, item: group });
}
fs.writeFileSync(
  "docs/SUGAR_MOOD.postman_collection.json",
  JSON.stringify(
    {
      info: {
        name: "SUGAR MOOD · CRUDs",
        description:
          "Ejemplos manuales. Crear categoría, cliente, producto y pedido. Para el detalle se requiere otroProductoId. Eliminar primero pedidos antes que padres. PUT de detalle solo cambia cantidad.",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      variable: [
        { key: "baseUrl", value: "http://127.0.0.1:3000/api" },
        ...[
          "categoriaId",
          "clienteId",
          "productoId",
          "otroProductoId",
          "pedidoId",
          "detalleId",
        ].map((key) => ({ key, value: "" })),
      ],
      item,
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  "backend/.env.example",
  "PORT=3000\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_NAME=sugar_mood\nDB_TEST_NAME=sugar_mood_test\nDB_USER=root\nDB_PASSWORD=\nCORS_ORIGIN=http://127.0.0.1:5173\n",
);
console.log(
  "DER y colección Postman generados. Ejemplo de entorno sin credenciales.",
);
