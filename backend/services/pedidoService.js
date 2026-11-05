const service = require("./crudService");
module.exports = {
  list: (user, query) => service.list("pedidos", user, query),
  get: (id, user) => service.get("pedidos", id, user),
  save: (id, body, user) => service.save("pedidos", id, body, user),
  remove: (id, user) => service.remove("pedidos", id, user),
};
