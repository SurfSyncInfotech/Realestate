import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import knex from "knex";
import {
  createDatabase,
  isDatabaseConfigured,
  parseDatabaseConfig,
} from "../src/index.js";

const directory = path.dirname(fileURLToPath(import.meta.url));

test("database configuration validates required values without exposing secrets", () => {
  const result = parseDatabaseConfig({
    DB_HOST: "127.0.0.1",
    DB_PORT: "3306",
    DB_USER: "realestate_app",
    DB_PASSWORD: "local-test-secret",
    DB_NAME: "realestate_test",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.DB_PORT, 3306);
  const defaultPort = parseDatabaseConfig({
    DB_HOST: "127.0.0.1",
    DB_USER: "realestate_app",
    DB_PASSWORD: "local-test-secret",
    DB_NAME: "realestate_test",
  });
  assert.equal(defaultPort.success, true);
  if (defaultPort.success) {
    assert.equal(defaultPort.data.DB_PORT, 3306);
  }
  assert.equal(isDatabaseConfigured({}), false);

  const previousEnvironment = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
  };

  for (const key of Object.keys(previousEnvironment)) {
    delete process.env[key];
  }

  try {
    assert.throws(
      () => createDatabase(),
      (error) =>
        error.message.includes("Missing or invalid database configuration") &&
        !error.message.includes("local-test-secret"),
    );
  } finally {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test("all MySQL migrations compile reversible table statements without a live connection", async () => {
  const migrationsDirectory = path.resolve(directory, "../migrations");
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".js"))
    .sort();
  const expectedTables = new Set([
    "roles",
    "permissions",
    "role_permissions",
    "users",
    "user_roles",
    "agent_profiles",
    "builder_profiles",
    "sessions",
    "locations",
    "amenities",
    "properties",
    "property_images",
    "property_amenities",
    "saved_properties",
    "recently_viewed_properties",
    "leads",
    "lead_assignments",
    "follow_up_activities",
    "site_visits",
    "notifications",
    "subscription_plans",
    "subscriptions",
    "payment_transactions",
    "reviews",
    "blog_posts",
    "banners",
    "audit_logs",
    "contact_messages",
    "property_details",
    "enquiry_replies",
    "visit_schedules",
    "app_notifications",
    "lead_progress",
    "password_resets",
  ]);
  const mysql = knex({
    client: "mysql2",
    connection: {
      host: "127.0.0.1",
      user: "compile_only",
      password: "compile_only",
      database: "compile_only",
    },
    pool: { min: 0, max: 1 },
  });

  try {
    const createdTables = [];
    const droppedTables = [];
    const compiledStatements = [];

    for (const file of migrationFiles) {
      const migration = await import(
        pathToFileURL(path.join(migrationsDirectory, file)).href
      );
      assert.equal(typeof migration.up, "function", `${file} must export up`);
      assert.equal(
        typeof migration.down,
        "function",
        `${file} must export down`,
      );

      const recordStatements =
        (operation, target) =>
        (...args) => {
          const builder = mysql.schema[operation](...args);
          const queries = builder.toSQL();
          assert.ok(
            queries.length > 0,
            `${file} ${operation} must compile SQL`,
          );
          for (const query of queries) {
            compiledStatements.push(query.sql);
            if (operation === "createTable") {
              const match = query.sql.match(/^create table `([^`]+)`/i);
              if (match) {
                assert.match(query.sql, /engine = InnoDB$/i);
                target.push(match[1]);
                continue;
              }
              assert.match(
                query.sql,
                /^alter table `[^`]+` add /i,
                `${file} produced unexpected SQL: ${query.sql}`,
              );
            } else {
              const match = query.sql.match(/^drop table if exists `([^`]+)`/i);
              assert.ok(match, `${file} produced unexpected SQL: ${query.sql}`);
              target.push(match[1]);
            }
          }
          return Promise.resolve();
        };

      const schema = new Proxy(mysql.schema, {
        get(target, property, receiver) {
          if (property === "createTable") {
            return recordStatements("createTable", createdTables);
          }
          if (property === "dropTableIfExists") {
            return recordStatements("dropTableIfExists", droppedTables);
          }
          return Reflect.get(target, property, receiver);
        },
      });

      const migrationKnex = { schema, fn: mysql.fn };
      await migration.up(migrationKnex);
      await migration.down(migrationKnex);
    }

    assert.deepEqual(new Set(createdTables), expectedTables);
    assert.deepEqual(new Set(droppedTables), expectedTables);
    assert.equal(createdTables.length, expectedTables.size);
    assert.equal(droppedTables.length, expectedTables.size);
    assert.ok(
      compiledStatements.some((sql) =>
        /foreign key \(`lead_id`, `property_id`\).*references `leads` \(`id`, `property_id`\)/i.test(
          sql,
        ),
      ),
      "site visits must reference the property recorded on their lead",
    );
    assert.ok(
      compiledStatements.some((sql) =>
        /add unique `uq_leads_id_property`\(`id`, `property_id`\)/i.test(sql),
      ),
      "lead/property composite key must support the site visit foreign key",
    );
  } finally {
    await mysql.destroy();
  }
});
