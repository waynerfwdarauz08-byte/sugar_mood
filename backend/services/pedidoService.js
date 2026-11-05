const service = require("./crudService");
module.exports = {
  list: (user) => service.list("pedidos", user),
  get: (id, user) => service.get("pedidos", id, user),
  save: (id, body, user) => service.save("pedidos", id, body, user),
  remove: (id, user) => service.remove("pedidos", id, user),
};
