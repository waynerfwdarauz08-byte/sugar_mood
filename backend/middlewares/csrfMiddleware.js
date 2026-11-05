const cookies = require("../services/cookieService");
module.exports = (req, res, next) => {
  const safe = ["GET", "HEAD", "OPTIONS"].includes(req.method);
  const origin = req.get("Origin");
  if (
    (!safe || req.path === "/api/auth/csrf") &&
    ((origin && !cookies.allowedOrigin(origin, req)) ||
      (req.get("Sec-Fetch-Site") === "cross-site" &&
        !cookies.allowedOrigin(origin, req)))
  )
    return res.status(403).json({ error: "Origen no autorizado." });
  if (safe) return next();
  // Bearer explícito sigue admitido para Postman. No se utiliza como fallback
  // una cookie cuando el encabezado Authorization es inválido.
  const bearer = /^Bearer [^\s]+$/.test(req.get("Authorization") || "");
  const needsProof =
    cookies.browserMode(req) || (!bearer && !!cookies.sessionToken(req));
  if (!needsProof) return next();
  const stored = req.cookies?.[cookies.config().csrfName],
    header = req.get("X-CSRF-Token");
  if (!cookies.equal(stored, header) || !cookies.validCsrf(req, header))
    return res
      .status(403)
      .json({
        error: "La protección de la solicitud venció. Reintenta.",
        code: "CSRF_INVALID",
      });
  next();
};
