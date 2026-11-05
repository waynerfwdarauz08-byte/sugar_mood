const service = require("./crudService");
module.exports = {
  list: (user) => service.list("clientes", user),
  get: (id, user) => service.get("clientes", id, user),
  save: (id, body, user) => service.save("clientes", id, body, user),
  remove: (id, user) => service.remove("clientes", id, user),
};
