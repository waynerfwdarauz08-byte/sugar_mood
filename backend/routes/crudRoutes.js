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
  if(!["usuarios","roles"].includes(kind)) r.use((req,res,next)=>{
    const action={GET:"leer",POST:"crear",PUT:"editar",DELETE:"eliminar"}[req.method];
    return require("../middlewares/permissionMiddleware")(kind,action)(req,res,next);
  });
  if(kind==='roles')r.get('/permisos',(req,res)=>res.json(require('../services/permissionService').catalog));
  r.get("/", c.list);
  r.get("/:id", c.get);
  r.post("/", c.create);
  r.put("/:id", c.update);
  r.delete("/:id", c.remove);
  return r;
};
