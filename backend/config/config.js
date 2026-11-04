require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
  quiet: true,
});
const base = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  dialect: "mysql",
  logging: false,
  timezone: "-06:00",
  seederStorage: "sequelize",
  define: { timestamps: false },
  dialectOptions: { connectTimeout: 5000 },
};
module.exports = {
  development: { ...base, database: process.env.DB_NAME || "sugar_mood" },
  test: { ...base, database: process.env.DB_TEST_NAME || "sugar_mood_test" },
  production: { ...base, database: process.env.DB_NAME || "sugar_mood" },
};
