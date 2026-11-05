const service = require("./crudService");
module.exports = {
  list: (user) => service.list("productos", user),
  get: (id, user) => service.get("productos", id, user),
  save: (id, body, user) => service.save("productos", id, body, user),
  remove: (id, user) => service.remove("productos", id, user),
};
