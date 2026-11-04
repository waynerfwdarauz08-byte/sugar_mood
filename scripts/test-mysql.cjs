// Crea y borra exclusivamente una base nueva con nombre generado aquí.
const { Sequelize } = require("../backend/node_modules/sequelize");
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const config = require("../backend/config/config").test;
const name =
  "sugar_mood_test_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");
const server = new Sequelize({ ...config, database: undefined });
const env = {
  ...process.env,
  NODE_ENV: "test",
  DB_TEST_NAME: name,
  RUN_MYSQL_TESTS: "1",
};
const cwd = path.resolve(__dirname, "../backend");
function run(args) {
  const r = spawnSync(process.execPath, args, { cwd, env, stdio: "inherit" });
  if (r.status !== 0)
    throw new Error("Falló la verificación: " + args.join(" "));
}
(async () => {
  let created = false;
  try {
    await server.authenticate();
    await server.query(
      "CREATE DATABASE `" +
        name +
        "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    created = true;
    const cli = "node_modules/sequelize-cli/lib/sequelize";
    run([cli, "db:migrate"]);
    run([cli, "db:seed:all"]);
    run([cli, "db:seed:all"]);
    run(["--test", "tests/validation.test.js", "tests/mysql.test.js"]);
    run([cli, "db:migrate:undo:all"]);
    run([cli, "db:migrate"]);
    console.log(
      "MySQL: migraciones, semillas, CRUDs, integridad, concurrencia y reversión OK.",
    );
  } catch (e) {
    console.error(e.original?.code || e.message);
    process.exitCode = 1;
  } finally {
    if (created && /^sugar_mood_test_\d+_[a-f0-9]+$/.test(name))
      await server.query("DROP DATABASE `" + name + "`");
    await server.close();
  }
})();
