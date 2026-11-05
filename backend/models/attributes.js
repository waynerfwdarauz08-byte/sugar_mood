module.exports = (sequelize, D) => ({
  id: {
    type: D.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  text: (n, optional = false) => ({
    type: D.STRING(n),
    allowNull: optional,
    validate: optional ? { len: [0, n] } : { notEmpty: true, len: [1, n] },
  }),
  fk: { type: D.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
  money: {
    type: D.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0, isDecimal: true },
  },
  options: (tableName) => ({ sequelize, tableName, timestamps: false }),
});
