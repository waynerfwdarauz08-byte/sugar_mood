module.exports = (kind) => {
  const service = require(
    "../services/" +
      {
        categorias: "categoria",
        productos: "producto",
        clientes: "cliente",
        pedidos: "pedido",
        "detalles-pedido": "detallePedido",
        usuarios: "usuario",
        roles: "rol",
      }[kind] +
      "Service",
  );
  return {
    list: async (req, res) => res.json(await service.list(req.usuario, req.query)),
    get: async (req, res) =>
      res.json(await service.get(req.params.id, req.usuario)),
    create: async (req, res) =>
      res.status(201).json(await service.save(null, req.body, req.usuario)),
    update: async (req, res) =>
      res.json(await service.save(req.params.id, req.body, req.usuario)),
    remove: async (req, res) => {
      await service.remove(req.params.id, req.usuario);
      res.status(204).end();
    },
  };
};
