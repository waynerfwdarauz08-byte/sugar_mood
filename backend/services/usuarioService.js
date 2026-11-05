const service = require("./accountService");
module.exports = {
  list: (user) => service.list("usuarios", user),
  get: (id, user) => service.get("usuarios", id, user),
  save: (id, body, user) => service.save("usuarios", id, body, user),
  remove: (id, user) => service.remove("usuarios", id, user),
};
