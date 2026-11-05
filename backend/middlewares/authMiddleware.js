const jwt = require("jsonwebtoken");
const auth = require("../services/authService");
const cookies = require("../services/cookieService");
module.exports = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const match = /^Bearer ([^\s]+)$/.exec(authorization || "");
  const token = authorization ? match?.[1] : cookies.sessionToken(req);
  const unauthorized = () => {
    if (!authorization && cookies.sessionToken(req)) cookies.clear(res);
    return res.status(401).json({ error: "No autorizado" });
  };
  if (!token) return unauthorized();
  let payload;
  try {
    const c = auth.settings();
    payload = jwt.verify(token, c.secret, {
      algorithms: ["HS256"],
      issuer: c.issuer,
      audience: c.audience,
    });
  } catch {
    return unauthorized();
  }
  if (!Number.isInteger(payload.ver) || payload.ver < 0 || !/^\d+$/.test(payload.sub || "")) return unauthorized();
  try {
    req.usuario = await auth.current(Number(payload.sub), undefined, payload.ver);
    if(require("../services/auditService").context.getStore()) require("../services/auditService").context.getStore().usuario=req.usuario;
    req.sessionExpiresAt = new Date(payload.exp * 1000).toISOString();
    next();
  } catch (e) {
    if (e.status === 401) return unauthorized();
    next(e);
  }
};
