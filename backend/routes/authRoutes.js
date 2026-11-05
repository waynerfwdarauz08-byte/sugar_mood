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
r.post("/change-password", authenticated, c.changePassword);
r.post("/forgot-password",require('../middlewares/recoveryLimiter'),async(req,res)=>res.json(await require('../services/passwordRecoveryService').request(req.body)));
r.post("/reset-password",require('../middlewares/recoveryLimiter'),async(req,res)=>{
  await require('../services/passwordRecoveryService').reset(req.body);
  require('../services/cookieService').clear(res);
  res.status(204).end();
});
module.exports = r;
