// One-command local setup:  npm run db:setup
//
// 1. Asks for your MySQL *root* password (hidden; or set MYSQL_ROOT_PASSWORD).
// 2. Creates the database and a dedicated app user with a random password.
// 3. Writes database/.env for the app.
// 4. Runs migrations, loads the property catalogue and creates the admin and
//    customer accounts (credentials go to database/.local-credentials.txt).
//
// The root password is used once and never stored.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const root = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const envPath = root("../.env");

const HOST = process.env.DB_HOST || "127.0.0.1";
const PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME || "realestate_dev";
const APP_USER = process.env.DB_USER || "realestate_app";

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = rl._writeToOutput;
    rl._writeToOutput = (text) => {
      if (text.startsWith(question)) write.call(rl, text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function run(label, args) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, args, { cwd: root(".."), stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\nStep failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

async function main() {
  let rootPassword = process.env.MYSQL_ROOT_PASSWORD;
  if (rootPassword === undefined) {
    if (!process.stdin.isTTY) {
      console.error("Run this in a terminal (it asks for your MySQL root password), or set MYSQL_ROOT_PASSWORD.");
      process.exit(1);
    }
    rootPassword = await askHidden(`MySQL root password for ${HOST}:${PORT} (input hidden): `);
  }

  let connection;
  try {
    connection = await mysql.createConnection({ host: HOST, port: PORT, user: "root", password: rootPassword });
  } catch (error) {
    console.error(`\nCould not sign in to MySQL as root: ${error.code || error.message}`);
    console.error("Check the password and that the MySQL80 service is running.");
    process.exit(1);
  }

  // Reuse the existing app password if database/.env already has one.
  const existing = existsSync(envPath) ? dotenv.parse(readFileSync(envPath)) : {};
  const appPassword = existing.DB_PASSWORD || randomBytes(18).toString("base64url");

  const id = (name) => connection.escapeId(name);
  const str = (value) => connection.escape(value);
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${id(DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`CREATE USER IF NOT EXISTS ${str(APP_USER)}@'localhost' IDENTIFIED BY ${str(appPassword)}`);
  await connection.query(`ALTER USER ${str(APP_USER)}@'localhost' IDENTIFIED BY ${str(appPassword)}`);
  await connection.query(`CREATE USER IF NOT EXISTS ${str(APP_USER)}@'127.0.0.1' IDENTIFIED BY ${str(appPassword)}`);
  await connection.query(`ALTER USER ${str(APP_USER)}@'127.0.0.1' IDENTIFIED BY ${str(appPassword)}`);
  await connection.query(`GRANT ALL PRIVILEGES ON ${id(DB_NAME)}.* TO ${str(APP_USER)}@'localhost'`);
  await connection.query(`GRANT ALL PRIVILEGES ON ${id(DB_NAME)}.* TO ${str(APP_USER)}@'127.0.0.1'`);
  await connection.query("FLUSH PRIVILEGES");
  await connection.end();
  console.log(`Database "${DB_NAME}" and user "${APP_USER}" are ready.`);

  writeFileSync(
    envPath,
    `DB_HOST=${HOST}\nDB_PORT=${PORT}\nDB_USER=${APP_USER}\nDB_PASSWORD=${appPassword}\nDB_NAME=${DB_NAME}\n`,
    "utf8",
  );
  console.log("Wrote database/.env (git-ignored).");

  const knexBin = root("../../node_modules/knex/bin/cli.js");
  run("Creating tables (migrations)", [knexBin, "--knexfile", "knexfile.js", "migrate:latest"]);
  run("Loading roles, locations and plans", [knexBin, "--knexfile", "knexfile.js", "seed:run"]);
  run("Creating the admin and customer accounts", ["scripts/create-accounts.js"]);

  console.log("\nAll done.");
  console.log("Sign-in details: database/.local-credentials.txt");
  console.log("Start the site with:  npm run dev:backend   and   npm run dev:frontend");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
