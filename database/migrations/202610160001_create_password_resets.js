import { withInnoDB } from "../src/migration-helpers.js";

// One row per password-reset request. Only a SHA-256 hash of the emailed token is
// stored, so a database leak cannot be used to take over accounts.
export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("password_resets", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("token_hash", 64).notNullable().unique("uq_password_resets_token");
    table.dateTime("expires_at").notNullable();
    table.dateTime("used_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "used_at"], "idx_password_resets_user");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("password_resets");
}
