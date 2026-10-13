import { createDatabase, isDatabaseConfigured } from "../src/index.js";

let database;

if (!isDatabaseConfigured()) {
  console.error(
    "Database configuration is missing or invalid. Set DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in database/.env; DB_PORT defaults to 3306.",
  );
  process.exitCode = 1;
} else
  try {
    database = createDatabase();
    const [{ server_version: serverVersion, database_name: databaseName }] =
      await database.raw(
        "SELECT VERSION() AS server_version, DATABASE() AS database_name",
      );

    console.log(
      JSON.stringify(
        {
          status: "ok",
          serverVersion,
          database: databaseName,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const errorCode = error.code || error.name;
    console.error(
      `Database connection failed (${errorCode}). Check DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in database/.env.`,
    );
    process.exitCode = 1;
  } finally {
    if (database) {
      await database.destroy();
    }
  }
