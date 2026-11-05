module.exports = {
  async up(q, S) {
    await q.addColumn("roles", "descripcion", {
      type: S.STRING(255),
      allowNull: true,
    });
    await q.bulkUpdate(
      "roles",
      {
        descripcion:
          "Administra el catálogo, los pedidos, los usuarios y los roles del sistema.",
      },
      { codigo: "administrador" },
    );
    await q.bulkUpdate(
      "roles",
      {
        descripcion:
          "Consulta el catálogo y gestiona su perfil y sus pedidos propios pendientes.",
      },
      { codigo: "cliente" },
    );
  },
  async down(q) {
    await q.removeColumn("roles", "descripcion");
  },
};
