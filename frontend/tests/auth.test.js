import { before, after, beforeEach, afterEach, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

// DOM de prueba en memoria: no abre navegador, puertos ni una base real.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
for (const name of [
  "window",
  "document",
  "HTMLElement",
  "HTMLDialogElement",
  "MutationObserver",
])
  globalThis[name] =
    name === "window"
      ? dom.window
      : name === "document"
        ? dom.window.document
        : dom.window[name];
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};
let vite, ui, App, context, session;
const client = {
  id: 2,
  nombre: "Ana",
  correo: "ana@example.com",
  rol: { codigo: "cliente", nombre: "Cliente" },
  cliente: { id: 3, usuarioId: 2, nombre: "Ana", telefono: "0000-7788" },
};
const admin = {
  id: 1,
  nombre: "Administrador",
  rol: { codigo: "administrador", nombre: "Administrador" },
};
const response = (body, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const product = {
  id: 4,
  nombre: "Paleta de prueba",
  categoriaId: 1,
  precio: "700.00",
  activo: true,
  categoria: { id: 1, nombre: "Paletas" },
};
const order = {
  id: 5,
  clienteId: 3,
  cliente: client.cliente,
  fecha: "2026-11-05T16:20:33.000Z",
  estado: "pendiente",
  total: "1400.00",
  detalles: [
    {
      id: 6,
      pedidoId: 5,
      productoId: 4,
      cantidad: 2,
      precioUnitario: "700.00",
      subtotal: "1400.00",
      producto: product,
    },
  ],
};
let cookieUser = null,
  cookieExpiresAt;
let requests = [];
function defaults(path, options = {}) {
  requests.push({ path, options });
  if (path.endsWith("/auth/csrf"))
    return response({ csrfToken: "prueba-csrf" });
  if (path.endsWith("/auth/login")) {
    cookieUser = client;
    cookieExpiresAt = new Date(Date.now() + 3600000).toISOString();
    return response({
      usuario: client,
      expiresAt: cookieExpiresAt,
      csrfToken: "prueba-csrf-login",
    });
  }
  if (path.endsWith("/auth/logout")) {
    cookieUser = null;
    return response(null, 204);
  }
  if (path.endsWith("/auth/me"))
    return cookieUser
      ? response({ ...cookieUser, expiresAt: cookieExpiresAt })
      : response({ error: "No autorizado" }, 401);
  if (path.endsWith("/productos")) return response([product]);
  if (path.endsWith("/categorias"))
    return response([{ id: 1, nombre: "Paletas" }]);
  if (path.endsWith("/clientes")) return response([client.cliente]);
  if (path.endsWith("/pedidos")) return response([order]);
  return response([]);
}
before(async () => {
  ui = await import("@testing-library/react");
  vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  context = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  App = (await vite.ssrLoadModule("/src/App.jsx")).default;
  session = (await vite.ssrLoadModule("/src/services/api.js")).session;
});
beforeEach(() => {
  requests = [];
  session.clear();
  cookieUser = null;
  cookieExpiresAt = new Date(Date.now() + 3600000).toISOString();
  globalThis.fetch = async (...args) => defaults(...args);
});
afterEach(() => {
  ui.cleanup();
  session.clear();
});
after(async () => {
  await vite.close();
  dom.window.close();
});
test("recargar restaura la sesión desde la cookie sin volver a enviar credenciales", async () => {
  await login();
  ui.cleanup();
  session.clear();
  requests = [];
  render("/pedidos", null, true);
  assert.ok(
    ui.screen.getByRole("status").textContent.includes("Recuperando sesión"),
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Mis pedidos." })),
  );
  assert.ok(requests.some((r) => r.path.endsWith("/auth/me")));
  assert.equal(
    requests.some((r) => r.path.endsWith("/auth/login")),
    false,
  );
});
test("logout no deja una sesión recuperable al recargar", async () => {
  await login();
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cerrar sesión" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Un dulce regreso." })),
  );
  ui.cleanup();
  session.clear();
  render("/pedidos", null, true);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Un dulce regreso." })),
  );
  assert.equal(
    ui.screen.queryByRole("heading", { name: "Mis pedidos." }),
    null,
  );
});
test("fallar la conexión durante logout conserva la sesión y muestra un error", async () => {
  await login();
  globalThis.fetch = async (path, options) => {
    if (path.endsWith("/auth/logout")) throw new Error("Sin conexión");
    return defaults(path, options);
  };
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cerrar sesión" }));
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.getByRole("alert").textContent.includes("No se pudo cerrar"),
    ),
  );
  assert.ok(ui.screen.getByRole("heading", { name: "Mis pedidos." }));
  assert.equal(cookieUser, client);
});
test("una prueba CSRF antigua se renueva y reintenta la mutación una sola vez", async () => {
  session.setCsrf("antigua");
  const proofs = [];
  globalThis.fetch = async (path, options = {}) => {
    if (path.endsWith("/auth/csrf")) return response({ csrfToken: "renovada" });
    proofs.push(options.headers["X-CSRF-Token"]);
    return proofs.length === 1
      ? response({ error: "Prueba vencida", code: "CSRF_INVALID" }, 403)
      : response({ id: 1, nombre: "Paletas" }, 201);
  };
  const { api } = await vite.ssrLoadModule("/src/services/api.js");
  await api.save("categorias", null, { nombre: "Paletas" });
  assert.deepEqual(proofs, ["antigua", "renovada"]);
});
function render(path, user = null, real = false) {
  const content = React.createElement(App);
  const wrapper = real
    ? React.createElement(context.AuthProvider, null, content)
    : React.createElement(
        context.AuthContext.Provider,
        {
          value: {
            usuario: user,
            isAdmin: user?.rol.codigo === "administrador",
            logout: () => {},
            refresh: async () => user,
            message: "",
          },
        },
        content,
      );
  return ui.render(
    React.createElement(MemoryRouter, { initialEntries: [path] }, wrapper),
  );
}
async function login() {
  render("/login", null, true);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Un dulce regreso." })),
  );
  ui.fireEvent.change(ui.screen.getByLabelText("Correo electrónico"), {
    target: { value: client.correo },
  });
  ui.fireEvent.change(ui.screen.getByLabelText("Contraseña"), {
    target: { value: "ClaveCliente2026!" },
  });
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Iniciar sesión" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Mis pedidos." })),
  );
}

test("sin sesión, una ruta protegida redirige al login", async () => {
  render("/usuarios");
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Un dulce regreso." })),
  );
  assert.equal(requests.length, 0);
});
test("Cliente no ve enlaces administrativos ni formularios para crear productos", async () => {
  render("/productos", client);
  await ui.waitFor(() => assert.ok(ui.screen.getByText("Paleta de prueba")));
  assert.equal(ui.screen.queryByRole("link", { name: /Usuarios/ }), null);
  assert.equal(
    ui.screen.queryByRole("button", { name: /Nuevo producto/ }),
    null,
  );
  assert.equal(ui.screen.queryByRole("button", { name: "Editar" }), null);
});
test("ruta administrativa rechaza al Cliente aunque escriba la URL", () => {
  render("/usuarios", client);
  assert.ok(ui.screen.getByRole("heading", { name: "Acceso restringido" }));
  assert.equal(requests.length, 0);
});
test("Administrador dispone de las acciones del catálogo", async () => {
  render("/productos", admin);
  await ui.waitFor(() => assert.ok(ui.screen.getByText("Paleta de prueba")));
  assert.ok(ui.screen.getByRole("button", { name: /Nuevo producto/ }));
  assert.ok(ui.screen.getByRole("button", { name: "Editar" }));
});
test("login utiliza cookies, envía prueba CSRF y logout vuelve al login", async () => {
  await login();
  const signIn = requests.find((r) => r.path.endsWith("/auth/login"));
  assert.equal(JSON.parse(signIn.options.body).correo, client.correo);
  assert.equal(signIn.options.headers.Authorization, undefined);
  assert.equal(signIn.options.credentials, "include");
  assert.equal(signIn.options.headers["X-CSRF-Token"], "prueba-csrf");
  assert.equal(
    requests.find((r) => r.path.endsWith("/pedidos")).options.credentials,
    "include",
  );
  assert.equal(
    requests.find((r) => r.path.endsWith("/pedidos")).options.headers
      .Authorization,
    undefined,
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Cerrar sesión" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Un dulce regreso." })),
  );
});
test("respuesta 401 borra sesión y muestra el aviso al volver al login", async () => {
  await login();
  globalThis.fetch = async () => response({ error: "No autorizado" }, 401);
  const { api } = await vite.ssrLoadModule("/src/services/api.js");
  await ui.act(async () => {
    await assert.rejects(api.get("pedidos", 5));
  });
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Un dulce regreso." })),
  );
  assert.ok(ui.screen.getByRole("alert").textContent.includes("sesión"));
});
test("registro no permite escoger rol y usa los endpoints de registro y login", async () => {
  globalThis.fetch = async (path, options = {}) =>
    path.endsWith("/auth/register")
      ? (requests.push({ path, options }), response(client, 201))
      : defaults(path, options);
  render("/registro", null, true);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Crea tu cuenta." })),
  );
  for (const [label, value] of [
    ["Nombre", "Ana"],
    ["Correo electrónico", client.correo],
    ["Teléfono", "0000-7788"],
    ["Contraseña", "ClaveCliente2026!"],
  ])
    ui.fireEvent.change(ui.screen.getByLabelText(label), { target: { value } });
  assert.equal(ui.screen.queryByLabelText("Rol"), null);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Crear cuenta" }));
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("heading", { name: "Mis pedidos." })),
  );
  const body = JSON.parse(
    requests.find((r) => r.path.endsWith("/auth/register")).options.body,
  );
  assert.equal(body.id_rol, undefined);
  assert.equal(body.telefono, "0000-7788");
});
test("editar pedido conserva segundos y limita estados para Cliente", async () => {
  globalThis.fetch = async (path, options = {}) => {
    if (options.method === "PUT") {
      requests.push({ path, options });
      return response(order);
    }
    return defaults(path, options);
  };
  render("/pedidos", client);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("button", { name: "Editar" })),
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Editar" }));
  const date = ui.screen.getByLabelText("Fecha y hora · Costa Rica");
  assert.equal(new Date(date.value + "-06:00").toISOString(), order.fecha);
  assert.equal(ui.screen.getByLabelText("Cliente").disabled, true);
  const state = ui.screen.getByLabelText("Estado");
  assert.deepEqual(
    [...state.options].map((o) => o.value),
    ["pendiente", "cancelado"],
  );
  ui.fireEvent.change(ui.screen.getByLabelText("Cantidad"), {
    target: { value: "4" },
  });
  ui.fireEvent.submit(
    ui.screen.getByRole("button", { name: "Guardar pedido" }).closest("form"),
  );
  await ui.waitFor(() =>
    assert.ok(requests.find((r) => r.options.method === "PUT")),
  );
  const body = JSON.parse(
    requests.find((r) => r.options.method === "PUT").options.body,
  );
  assert.equal(body.fecha, order.fecha);
  assert.equal(body.detalles[0].cantidad, 4);
  await ui.waitFor(() => assert.ok(ui.screen.getByText(/Pedido #5 guardado/)));
});
test("fallar categorías no oculta productos ya consultados", async () => {
  globalThis.fetch = async (path, options) =>
    path.endsWith("/categorias")
      ? response({ error: "Fallo de categorías" }, 500)
      : defaults(path, options);
  render("/productos", admin);
  await ui.waitFor(() => assert.ok(ui.screen.getByText("Paleta de prueba")));
  assert.ok(ui.screen.getByRole("button", { name: "Reintentar categorías" }));
});

test("Administrador crea una cuenta y vincula un cliente existente sin sobrescribir su contacto vacío", async () => {
  globalThis.fetch = async (path, options = {}) => {
    if (path.endsWith("/roles"))
      return response([
        { id: 1, codigo: "administrador", nombre: "Administrador" },
        { id: 2, codigo: "cliente", nombre: "Cliente" },
      ]);
    if (path.endsWith("/usuarios")) {
      requests.push({ path, options });
      return options.method === "POST"
        ? response(
            {
              id: 9,
              nombre: "Cuenta",
              correo: "cuenta@example.com",
              id_rol: 2,
            },
            201,
          )
        : response([]);
    }
    if (path.endsWith("/clientes"))
      return response([{ ...client.cliente, usuarioId: null }]);
    return defaults(path, options);
  };
  render("/usuarios", admin);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByText("Crea el primer registro.")),
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: /Nuevo usuario/ }));
  for (const [label, value] of [
    ["Nombre", "Cuenta"],
    ["Correo electrónico", "cuenta@example.com"],
    ["Contraseña", "CuentaEjemplo2026!"],
    ["Rol", "2"],
    ["Vincular cliente existente (opcional)", "3"],
  ])
    ui.fireEvent.change(ui.screen.getByLabelText(label), { target: { value } });
  ui.fireEvent.submit(
    ui.screen.getByRole("button", { name: "Guardar" }).closest("form"),
  );
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByText("Registro guardado correctamente.")),
  );
  const body = JSON.parse(
    requests.find((r) => r.options.method === "POST").options.body,
  );
  assert.equal(body.id_rol, 2);
  assert.equal(body.clienteId, 3);
  assert.equal(body.telefono, undefined);
});
test("un error 409 al quitar el último detalle se muestra sin eliminar la fila", async () => {
  globalThis.fetch = async (path, options = {}) => {
    if (path.includes("/detalles-pedido"))
      return options.method === "DELETE"
        ? response(
            { error: "No se puede eliminar el último detalle del pedido." },
            409,
          )
        : response(order.detalles);
    return defaults(path, options);
  };
  render("/detalles-pedido", client);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("button", { name: "Eliminar" })),
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Eliminar" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Sí, eliminar" }));
  await ui.waitFor(() =>
    assert.ok(
      ui.screen.getByRole("alert").textContent.includes("último detalle"),
    ),
  );
  assert.ok(ui.screen.getByText("Paleta de prueba"));
});
test("producto histórico inactivo sigue visible al editar y no habilita productos nuevos", async () => {
  const historical = {
    ...order,
    detalles: [
      { ...order.detalles[0], producto: { ...product, activo: false } },
    ],
  };
  globalThis.fetch = async (path, options = {}) =>
    path.endsWith("/productos")
      ? response([])
      : path.endsWith("/pedidos")
        ? response([historical])
        : defaults(path, options);
  render("/pedidos", client);
  await ui.waitFor(() =>
    assert.ok(ui.screen.getByRole("button", { name: "Editar" })),
  );
  ui.fireEvent.click(ui.screen.getByRole("button", { name: "Editar" }));
  assert.ok(
    ui.screen.getByRole("option", { name: "Paleta de prueba (inactivo)" }),
  );
  assert.equal(
    ui.screen.getByRole("button", { name: "+ Agregar línea" }).disabled,
    true,
  );
  assert.equal(
    ui.screen.getByRole("button", { name: "Guardar pedido" }).disabled,
    false,
  );
});
