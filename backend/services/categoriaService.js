const service = require("./crudService");
module.exports = {
  list: (user) => service.list("categorias", user),
  get: (id, user) => service.get("categorias", id, user),
  save: (id, body, user) => service.save("categorias", id, body, user),
  remove: (id, user) => service.remove("categorias", id, user),
};
