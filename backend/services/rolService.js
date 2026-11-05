const service = require("./accountService");
module.exports = {
  list: (user) => service.list("roles", user),
  get: (id, user) => service.get("roles", id, user),
  save: (id, body, user) => service.save("roles", id, body, user),
  remove: (id, user) => service.remove("roles", id, user),
};
