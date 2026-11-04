const service = require("../services/crudService");
module.exports = (kind) => ({
  list: async (req, res) => res.json(await service.list(kind)),
  get: async (req, res) => res.json(await service.get(kind, req.params.id)),
  create: async (req, res) =>
    res.status(201).json(await service.save(kind, null, req.body)),
  update: async (req, res) =>
    res.json(await service.save(kind, req.params.id, req.body)),
  remove: async (req, res) => {
    await service.remove(kind, req.params.id);
    res.status(204).end();
  },
});
