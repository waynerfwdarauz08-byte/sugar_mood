const service = require("./crudService");
module.exports = {
  list: (user) => service.list("detalles-pedido", user),
  get: (id, user) => service.get("detalles-pedido", id, user),
  save: (id, body, user) => service.save("detalles-pedido", id, body, user),
  remove: (id, user) => service.remove("detalles-pedido", id, user),
};
