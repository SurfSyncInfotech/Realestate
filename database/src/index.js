import knex from "knex";
import { z } from "zod";
import { configuration } from "../knexfile.js";

const databaseEnvSchema = z.object({
  DB_HOST: z.string().trim().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().trim().min(1),
});

export function parseDatabaseConfig(environment = process.env) {
  return databaseEnvSchema.safeParse(environment);
}

export function isDatabaseConfigured(environment = process.env) {
  return parseDatabaseConfig(environment).success;
}

export function createDatabase(
  environment = process.env.NODE_ENV || "development",
) {
  const config = configuration[environment];

  if (!config) {
    throw new Error(`Unsupported database environment: ${environment}`);
  }

  const result = parseDatabaseConfig();
  if (!result.success) {
    const missing = [
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ].join(", ");
    throw new Error(`Missing or invalid database configuration: ${missing}`);
  }

  config.connection = {
    host: result.data.DB_HOST,
    port: result.data.DB_PORT,
    user: result.data.DB_USER,
    password: result.data.DB_PASSWORD,
    database: result.data.DB_NAME,
    charset: "utf8mb4",
    timezone: "Z",
  };
  // Keep every connection on UTC so MySQL's CURRENT_TIMESTAMP defaults and the
  // driver's UTC reading agree (otherwise times drift by the server's offset,
  // e.g. +5:30 in India, and "5 hours ago" shows as "just now").
  config.pool = {
    ...config.pool,
    afterCreate: (connection, done) => {
      connection.query("SET time_zone = '+00:00'", (error) => done(error, connection));
    },
  };
  return knex(config);
}
export * from "./catalogue.js";
