const { Router } = require("express");
const controller = require("../controllers/crudController");
module.exports = (kind) => {
  const r = Router(),
    c = controller(kind);
  r.get("/", c.list);
  r.get("/:id", c.get);
  r.post("/", c.create);
  r.put("/:id", c.update);
  r.delete("/:id", c.remove);
  return r;
};
