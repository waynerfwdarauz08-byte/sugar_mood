module.exports =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.usuario?.rol?.codigo)
      ? next()
      : res
          .status(403)
          .json({ error: "No tienes permiso para realizar esta operación." });
