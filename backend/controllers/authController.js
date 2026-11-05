const auth = require("../services/authService");
const cookies = require("../services/cookieService");
exports.register = async (req, res) =>
  res.status(201).json(await auth.register(req.body));
exports.login = async (req, res) => {
  const result = await auth.login(req.body);
  const payload = require("jsonwebtoken").decode(result.token);
  const expiresAt = new Date(payload.exp * 1000).toISOString();
  if (cookies.browserMode(req)) {
    const csrfToken = cookies.start(req, res, result.token);
    return res.json({ usuario: result.usuario, expiresAt, csrfToken });
  }
  return res.json({ ...result, expiresAt });
};
exports.me = async (req, res) =>
  res.json({ ...req.usuario, expiresAt: req.sessionExpiresAt });
exports.csrf = (req, res) => res.json({ csrfToken: cookies.csrf(req, res) });
exports.changePassword = async (req,res) => {
  await auth.changePassword(req.usuario.id,req.body);
  cookies.clear(res);
  res.status(204).end();
};
exports.logout = (req, res) => {
  cookies.clear(res);
  res.status(204).end();
};
