// Genera artefactos de entrega. No contiene ni lee credenciales reales.
const fs = require("fs");
const esc = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "&#10;");
const entities = [
  [
    "categorias",
    40,
    40,
    330,
    150,
    "id INT PK AI\nnombre VARCHAR(80) NN UQ\ndescripcion VARCHAR(255) NULL",
  ],
  [
    "productos",
    40,
    310,
    330,
    200,
    "id INT PK AI\ncategoriaId INT FK NN\nnombre VARCHAR(100) NN UQ\nprecio DECIMAL(10,2) NN >= 0\nactivo BOOLEAN NN DEFAULT TRUE",
  ],
  [
    "detalles_pedido",
    40,
    700,
    370,
    210,
    "id INT PK AI\npedidoId INT FK NN\nproductoId INT FK NN\ncantidad INT NN > 0\nprecioUnitario DECIMAL(10,2) NN >= 0\nUQ (pedidoId, productoId)",
  ],
  [
    "roles",
    480,
    40,
    360,
    150,
    "id INT PK AI\ncodigo VARCHAR(40) NN UQ\nnombre VARCHAR(80) NN UQ\ndescripcion VARCHAR(255) NULL\nIniciales: administrador / cliente",
  ],
  [
    "usuarios",
    480,
    310,
    360,
    250,
    "id INT PK AI\nnombre VARCHAR(100) NN\ncorreo VARCHAR(254) NN UQ\npassword VARCHAR(255) NN (hash bcrypt)\nfechaCreacion DATETIME NN DEFAULT NOW\nid_rol INT FK NN",
  ],
  [
    "clientes",
    960,
    310,
    360,
    180,
    "id INT PK AI\nnombre VARCHAR(100) NN\ntelefono VARCHAR(20) NN\ndireccion VARCHAR(255) NULL\nusuarioId INT FK NULL UQ",
  ],
  [
    "pedidos",
    960,
    700,
    360,
    210,
    "id INT PK AI\nclienteId INT FK NN\nfecha DATETIME NN\nestado ENUM NN DEFAULT pendiente\npendiente / preparado / entregado / cancelado",
  ],
];
let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';
for (const [name, x, y, w, h, fields] of entities)
  cells += `<mxCell id="${name}" value="${esc(name + "\n\n" + fields)}" style="rounded=0;whiteSpace=wrap;html=0;align=left;verticalAlign=top;spacing=14;fillColor=#e7f3ef;strokeColor=#126a6c;fontSize=14;fontFamily=Arial;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
const edges = [
  ["categorias", "productos", "1", "0..N", 0.5, 1, 0.5, 0],
  ["productos", "detalles_pedido", "1", "0..N", 0.5, 1, 0.5, 0],
  ["roles", "usuarios", "1", "0..N", 0.5, 1, 0.5, 0],
  ["usuarios", "clientes", "0..1", "0..1", 1, 0.5, 0, 0.5],
  ["clientes", "pedidos", "1", "0..N", 0.5, 1, 0.5, 0],
  ["pedidos", "detalles_pedido", "1", "1..N", 0, 0.5, 1, 0.5],
];
edges.forEach(([from, to, a, b, ex, ey, ix, iy], i) => {
  cells += `<mxCell id="e${i}" style="edgeStyle=orthogonalEdgeStyle;endArrow=none;startArrow=none;strokeColor=#126a6c;exitX=${ex};exitY=${ey};entryX=${ix};entryY=${iy};" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  for (const [side, label, x] of [
    ["a", a, -0.8],
    ["b", b, 0.8],
  ])
    cells += `<mxCell id="label${i}${side}" value="${label}" style="edgeLabel;html=0;align=center;resizable=0;fontSize=14;labelBackgroundColor=#ffffff;" vertex="1" connectable="0" parent="e${i}"><mxGeometry x="${x}" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>`;
});
const notes =
  "PK: primaria · FK: foránea · AI: autoincremental · NN: obligatorio · UQ: único\nFK: ON DELETE RESTRICT / ON UPDATE CASCADE. Sequelize: timestamps false.\nUsuario pertenece a un rol; puede tener cero o un perfil de cliente. Clientes anteriores pueden no tener cuenta.\nCada pedido tiene al menos un detalle: validado en servicio/transacción. Precio histórico conservado; totales calculados.\nRegistro público: Cliente. Administrador gestiona cuentas; cada cliente solo accede a su perfil, pedidos y detalles.\nfechaCreacion pertenece únicamente a usuarios; no se agregan timestamps a las entidades anteriores.";
cells += `<mxCell id="notes" value="${esc(notes)}" style="text;html=0;align=left;whiteSpace=wrap;fontSize=14;" vertex="1" parent="1"><mxGeometry x="40" y="990" width="1280" height="170" as="geometry"/></mxCell>`;
fs.writeFileSync(
  "docs/DER_SUGAR_MOOD.drawio",
  `<mxfile host="app.diagrams.net"><diagram name="SUGAR MOOD · Día 2" id="sugar-mood"><mxGraphModel grid="1" page="1" pageWidth="1380" pageHeight="1200"><root>${cells}</root></mxGraphModel></diagram></mxfile>`,
);
const noAuth = { type: "noauth" };
const tests = (status, extra = []) => [
  {
    listen: "test",
    script: {
      type: "text/javascript",
      exec: [
        `pm.test('HTTP ${status}',()=>pm.response.to.have.status(${status}));`,
        ...extra,
      ],
    },
  },
];
function req(
  name,
  method,
  path,
  body,
  status = 200,
  { publicRoute = false, token = "token", extra = [] } = {},
) {
  return {
    name,
    request: {
      method,
      url: "{{baseUrl}}/" + path,
      auth: publicRoute
        ? noAuth
        : {
            type: "bearer",
            bearer: [
              { key: "token", value: "{{" + token + "}}", type: "string" },
            ],
          },
      header: body ? [{ key: "Content-Type", value: "application/json" }] : [],
      ...(body
        ? {
            body: {
              mode: "raw",
              raw: JSON.stringify(body, null, 2),
              options: { raw: { language: "json" } },
            },
          }
        : {}),
    },
    event: tests(status, extra),
  };
}
const items = [req("Salud", "GET", "salud", null, 200, { publicRoute: true })];
const register = {
  nombre: "Cliente Postman (ejemplo)",
  correo: "{{clienteCorreo}}",
  password: "{{clientePassword}}",
  telefono: "0000-7788",
  direccion: "Dirección ficticia",
};
const registration = req(
  "Registrar cliente",
  "POST",
  "auth/register",
  register,
  201,
  {
    publicRoute: true,
    extra: [
      "pm.collectionVariables.set('perfilClienteId',pm.response.json().cliente.id);",
      "pm.test('Nunca expone password',()=>pm.expect(pm.response.json()).not.to.have.property('password'));",
    ],
  },
);
registration.event.unshift({
  listen: "prerequest",
  script: {
    type: "text/javascript",
    exec: [
      "pm.collectionVariables.set('clienteCorreo','cliente.'+Date.now()+'@postman.local');",
    ],
  },
});
items.push({
  name: "01 · Autenticación",
  item: [
    req(
      "Login administrador (configurar variables)",
      "POST",
      "auth/login",
      { correo: "{{adminCorreo}}", password: "{{adminPassword}}" },
      200,
      {
        publicRoute: true,
        extra: [
          "if(pm.response.code===200)pm.collectionVariables.set('token',pm.response.json().token);",
        ],
      },
    ),
    registration,
    req("Registro duplicado", "POST", "auth/register", register, 400, {
      publicRoute: true,
    }),
    req(
      "Contraseña corta",
      "POST",
      "auth/register",
      { ...register, password: "corta" },
      400,
      { publicRoute: true },
    ),
    req(
      "Login cliente",
      "POST",
      "auth/login",
      { correo: "{{clienteCorreo}}", password: "{{clientePassword}}" },
      200,
      {
        publicRoute: true,
        extra: [
          "if(pm.response.code===200)pm.collectionVariables.set('tokenCliente',pm.response.json().token);",
        ],
      },
    ),
    req(
      "Login incorrecto",
      "POST",
      "auth/login",
      { correo: "{{clienteCorreo}}", password: "incorrecta" },
      401,
      { publicRoute: true },
    ),
    req("Mi perfil autenticado", "GET", "auth/me"),
    req("Perfil sin token", "GET", "auth/me", null, 401, { publicRoute: true }),
    req("Token inválido", "GET", "auth/me", null, 401, {
      token: "tokenInvalido",
    }),
  ],
});
const bodies = {
  categorias: {
    nombre: "Categoría {{$timestamp}} (ejemplo)",
    descripcion: "Datos ficticios",
  },
  clientes: {
    nombre: "Cliente admin Postman (ejemplo)",
    telefono: "0000-9999",
  },
  productos: {
    categoriaId: "{{categoriaId}}",
    nombre: "Paleta {{$timestamp}} (ejemplo)",
    precio: "700.00",
    activo: true,
  },
  pedidos: {
    clienteId: "{{clienteId}}",
    fecha: "2026-11-05T10:00:00-06:00",
    estado: "pendiente",
    detalles: [{ productoId: "{{productoId}}", cantidad: 2 }],
  },
  "detalles-pedido": {
    pedidoId: "{{pedidoId}}",
    productoId: "{{otroProductoId}}",
    cantidad: 1,
  },
  roles: {
    nombre: "Consulta futura {{$timestamp}}",
    codigo: "consulta_{{$timestamp}}",
    descripcion: "Descripción de un rol de ejemplo",
  },
  usuarios: {
    nombre: "Cuenta de ejemplo",
    correo: "cuenta.{{$timestamp}}@postman.local",
    password: "{{clientePassword}}",
    id_rol: "{{rolId}}",
  },
};
const vars = {
  categorias: "categoriaId",
  clientes: "clienteId",
  productos: "productoId",
  pedidos: "pedidoId",
  "detalles-pedido": "detalleId",
  roles: "rolId",
  usuarios: "usuarioId",
};
const cleanup = [];
for (const kind of Object.keys(bodies)) {
  const id = vars[kind],
    body = bodies[kind],
    group = [
      req("Crear", "POST", kind, body, 201, {
        extra: [
          `if(pm.response.code===201)pm.collectionVariables.set('${id}',pm.response.json().id);`,
        ],
      }),
    ];
  if (kind === "productos")
    group.push(
      req(
        "Crear segundo producto para detalle",
        "POST",
        "productos",
        { ...body, nombre: "Otro producto {{$timestamp}} (ejemplo)" },
        201,
        {
          extra: [
            "pm.collectionVariables.set('otroProductoId',pm.response.json().id);",
          ],
        },
      ),
    );
  group.push(
    req("Listar", "GET", kind),
    req("Consultar", "GET", kind + "/{{" + id + "}}"),
    req(
      "Actualizar",
      "PUT",
      kind + "/{{" + id + "}}",
      kind === "detalles-pedido"
        ? { cantidad: 3 }
        : kind === "roles"
          ? {
              codigo: "{{codigoRol}}",
              nombre: "Nombre de rol actualizado",
              descripcion: "Descripción actualizada",
            }
          : body,
    ),
  );
  if (kind === "roles")
    group[0].event[0].script.exec.push(
      "if(pm.response.code===201)pm.collectionVariables.set('codigoRol',pm.response.json().codigo);",
    );
  items.push({ name: "CRUD · " + kind, item: group });
  cleanup.push(
    req("Eliminar " + kind, "DELETE", kind + "/{{" + id + "}}", null, 204),
  );
}
items.push({
  name: "02 · Acceso y errores",
  item: [
    req("Sin token en productos", "GET", "productos", null, 401, {
      publicRoute: true,
    }),
    req("Producto inexistente", "GET", "productos/2147483647", null, 404),
    req("Nombre obligatorio", "POST", "categorias", { nombre: " " }, 400),
    req("Cliente no administra usuarios", "GET", "usuarios", null, 403, {
      token: "tokenCliente",
    }),
    req(
      "Cliente no crea productos",
      "POST",
      "productos",
      bodies.productos,
      403,
      { token: "tokenCliente" },
    ),
    req(
      "Cliente no consulta pedido ajeno",
      "GET",
      "pedidos/{{pedidoId}}",
      null,
      404,
      { token: "tokenCliente" },
    ),
    req(
      "Crear pedido propio sin enviar clienteId",
      "POST",
      "pedidos",
      {
        fecha: "2026-11-05T12:00:00-06:00",
        detalles: [{ productoId: "{{productoId}}", cantidad: 1 }],
      },
      201,
      {
        token: "tokenCliente",
        extra: [
          "pm.collectionVariables.set('pedidoPropioId',pm.response.json().id);",
        ],
      },
    ),
    req(
      "Consultar pedido propio",
      "GET",
      "pedidos/{{pedidoPropioId}}",
      null,
      200,
      { token: "tokenCliente" },
    ),
    req(
      "Eliminar pedido propio pendiente",
      "DELETE",
      "pedidos/{{pedidoPropioId}}",
      null,
      204,
      { token: "tokenCliente" },
    ),
  ],
});
const order = [
  "detalles-pedido",
  "pedidos",
  "usuarios",
  "roles",
  "productos",
  "clientes",
  "categorias",
];
items.push({
  name: "03 · Limpieza de ejemplos",
  item: order.flatMap((kind) => {
    const item = cleanup.find((x) => x.name === "Eliminar " + kind);
    return kind === "productos"
      ? [
          item,
          req(
            "Eliminar segundo producto",
            "DELETE",
            "productos/{{otroProductoId}}",
            null,
            204,
          ),
        ]
      : [item];
  }),
});
const cookieExample = (
  name,
  method,
  path,
  body,
  status,
  proof = false,
  extra = [],
) => {
  const item = req(name, method, path, body, status, {
    publicRoute: true,
    extra,
  });
  item.request.header.push({ key: "X-Session-Mode", value: "cookie" });
  if (proof)
    item.request.header.push({ key: "X-CSRF-Token", value: "{{cookieCsrf}}" });
  return item;
};
items.push({
  name: "04 · Sesión persistente con cookies (cookie jar activo)",
  item: [
    cookieExample("Preparar CSRF", "GET", "auth/csrf", null, 200, false, [
      "pm.collectionVariables.set('cookieCsrf',pm.response.json().csrfToken);",
    ]),
    cookieExample(
      "Login con cookie httpOnly",
      "POST",
      "auth/login",
      { correo: "{{adminCorreo}}", password: "{{adminPassword}}" },
      200,
      true,
      [
        "pm.collectionVariables.set('cookieCsrf',pm.response.json().csrfToken);",
        "pm.test('JWT no expuesto en modo cookie',()=>pm.expect(pm.response.json()).not.to.have.property('token'));",
      ],
    ),
    cookieExample("Restaurar sesión sin Bearer", "GET", "auth/me", null, 200),
    cookieExample(
      "Mutación sin prueba CSRF",
      "POST",
      "categorias",
      { nombre: "Solicitud sin prueba" },
      403,
    ),
    cookieExample(
      "Cerrar sesión y borrar cookie",
      "POST",
      "auth/logout",
      {},
      204,
      true,
    ),
    cookieExample("Perfil después de logout", "GET", "auth/me", null, 401),
  ],
});
fs.writeFileSync(
  "docs/SUGAR_MOOD.postman_collection.json",
  JSON.stringify(
    {
      info: {
        name: "SUGAR MOOD · Día 2 · Autenticación y roles",
        description:
          "Configurar adminCorreo y adminPassword localmente. Ejecutar en orden. Crea datos ficticios; los elimina al final salvo la cuenta de cliente registrada. Los roles nuevos no reciben permisos automáticamente. No contiene credenciales ni tokens reales.",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      variable: [
        { key: "baseUrl", value: "http://127.0.0.1:3000/api" },
        { key: "adminCorreo", value: "" },
        { key: "adminPassword", value: "" },
        { key: "clientePassword", value: "EjemploPostman2026!" },
        { key: "tokenInvalido", value: "token-no-valido" },
        ...[
          "token",
          "tokenCliente",
          "clienteCorreo",
          ...Object.values(vars),
          "otroProductoId",
          "perfilClienteId",
          "pedidoPropioId",
          "codigoRol",
          "cookieCsrf",
        ].map((key) => ({ key, value: "" })),
      ],
      item: items,
    },
    null,
    2,
  ),
);
console.log("DER de siete entidades y colección del día 2 generados.");
