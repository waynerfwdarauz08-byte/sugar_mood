const { Router } = require("express");
module.exports = (kind) => {
  const r = Router(),
    c = require(
      "../controllers/" +
        {
          categorias: "categoria",
          productos: "producto",
          clientes: "cliente",
          pedidos: "pedido",
          "detalles-pedido": "detallePedido",
          usuarios: "usuario",
          roles: "rol",
        }[kind] +
        "Controller",
    );
  r.get("/", c.list);
  r.get("/:id", c.get);
  r.post("/", c.create);
  r.put("/:id", c.update);
  r.delete("/:id", c.remove);
  return r;
};
