const { Router } = require("express");
const c = require("../controllers/authController");
const authenticated = require("../middlewares/authMiddleware");
const r = Router();
r.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
r.get("/csrf", c.csrf);
r.post("/register", c.register);
r.post("/login", c.login);
r.get("/me", authenticated, c.me);
r.post("/logout", c.logout);
module.exports = r;
