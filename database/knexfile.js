import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const migrationsDirectory = fileURLToPath(
  new URL("./migrations", import.meta.url),
);
const seedsDirectory = fileURLToPath(new URL("./seeds", import.meta.url));

function mysqlConfig() {
  return {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: "utf8mb4",
      timezone: "Z",
    },
    pool: { min: 0, max: 10 },
    migrations: {
      directory: migrationsDirectory,
      extension: "js",
      loadExtensions: [".js"],
      tableName: "knex_migrations",
    },
    seeds: {
      directory: seedsDirectory,
      extension: "js",
    },
  };
}

const configuration = {
  development: mysqlConfig(),
  test: mysqlConfig(),
  production: mysqlConfig(),
};

export default configuration;
export { configuration };
