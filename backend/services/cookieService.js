const crypto = require("crypto");
const auth = require("./authService");
function config() {
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true";
  return {
    sessionName: secure ? "__Host-sugar_mood_session" : "sugar_mood_session",
    csrfName: secure ? "__Host-sugar_mood_csrf" : "sugar_mood_csrf",
    options: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 3600000,
    },
  };
}
function browserMode(req) {
  return req.get("X-Session-Mode") === "cookie";
}
function sessionToken(req) {
  return req.cookies?.[config().sessionName];
}
function signature(req, nonce) {
  const binding = crypto
    .createHash("sha256")
    .update(sessionToken(req) || "anonymous")
    .digest("hex");
  return crypto
    .createHmac("sha256", auth.settings().secret)
    .update("csrf|" + binding + "|" + nonce)
    .digest("hex");
}
function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function validCsrf(req, token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token))
    return false;
  const [nonce, sig] = token.split(".");
  return equal(sig, signature(req, nonce));
}
function csrf(req, res) {
  const c = config();
  let token = req.cookies?.[c.csrfName];
  if (!validCsrf(req, token)) {
    const nonce = crypto.randomBytes(32).toString("hex");
    token = nonce + "." + signature(req, nonce);
    res.cookie(c.csrfName, token, c.options);
  }
  return token;
}
function start(req, res, token) {
  const c = config();
  res.cookie(c.sessionName, token, c.options);
  // La prueba CSRF nueva queda vinculada al JWT recién emitido.
  req.cookies = {
    ...req.cookies,
    [c.sessionName]: token,
    [c.csrfName]: undefined,
  };
  return csrf(req, res);
}
function clear(res) {
  const c = config(),
    { maxAge, ...options } = c.options;
  res.clearCookie(c.sessionName, options);
  res.clearCookie(c.csrfName, options);
}
function allowedOrigin(origin, req) {
  if (!origin) return false;
  const configured = (process.env.CORS_ORIGIN || "http://127.0.0.1:5173")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    configured.includes(origin) ||
    origin === req.protocol + "://" + req.get("host")
  )
    return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
module.exports = {
  config,
  browserMode,
  sessionToken,
  equal,
  validCsrf,
  csrf,
  start,
  clear,
  allowedOrigin,
};
