const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./models");
const authenticated = require("./middlewares/authMiddleware");
const allowed = require("./middlewares/roleMiddleware");
const auth = require("./services/authService");
const cookies = require("./services/cookieService");
const app = express();
app.disable("x-powered-by");
app.use(
  cors((req, callback) =>
    callback(null, {
      origin: cookies.allowedOrigin(req.get("Origin"), req)
        ? req.get("Origin")
        : false,
      credentials: true,
    }),
  ),
);
app.use(cookieParser());
app.use(require("./middlewares/csrfMiddleware"));
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", require("./routes/authRoutes"));
app.get("/api/salud", async (req, res) => {
  await sequelize.authenticate();
  res.json({ estado: "disponible", sistema: "SUGAR MOOD" });
});
for (const kind of [
  "categorias",
  "productos",
  "clientes",
  "pedidos",
  "detalles-pedido",
])
  app.use(
    "/api/" + kind,
    authenticated,
    allowed("administrador", "cliente"),
    require(
      "./routes/" +
        {
          categorias: "categoria",
          productos: "producto",
          clientes: "cliente",
          pedidos: "pedido",
          "detalles-pedido": "detallePedido",
        }[kind] +
        "Routes",
    ),
  );
for (const kind of ["usuarios", "roles"])
  app.use(
    "/api/" + kind,
    authenticated,
    allowed("administrador"),
    require("./routes/" + (kind === "usuarios" ? "usuario" : "rol") + "Routes"),
  );
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
app.use((err, req, res, next) => {
  let status = err.status || 500,
    message = err.message;
  if (err.name === "SequelizeUniqueConstraintError") {
    status = 409;
    message = "Ya existe un registro con esos datos únicos.";
  } else if (err.name === "SequelizeForeignKeyConstraintError") {
    status = 409;
    message =
      "No se puede completar la operación: existen registros relacionados.";
  } else if (err.name === "SequelizeValidationError") {
    status = 400;
    message = "Los datos no cumplen las validaciones del modelo.";
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "El cuerpo JSON no es válido.";
  } else if (
    err.name === "SequelizeDatabaseError" &&
    err.parent?.code === "ER_CHECK_CONSTRAINT_VIOLATED"
  ) {
    status = 400;
    message = "Los valores incumplen las restricciones de la base de datos.";
  }
  if (status >= 500) {
    message = "Error interno del servidor.";
    console.error(
      "Fallo interno:",
      err.name,
      err.original?.code,
      err.original?.sqlMessage,
    );
  }
  res.status(status).json({ error: message });
});
if (require.main === module) {
  auth.settings();
  sequelize
    .authenticate()
    .then(() =>
      app.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
        console.log(
          "SUGAR MOOD API: http://127.0.0.1:" + (process.env.PORT || 3000),
        ),
      ),
    )
    .catch((err) => {
      console.error(
        "No se pudo conectar a MySQL. Revise backend/.env. Código:",
        err.original?.code || err.name,
      );
      process.exitCode = 1;
    });
}
module.exports = app;
