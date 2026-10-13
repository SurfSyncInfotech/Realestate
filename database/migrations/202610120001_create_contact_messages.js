import { withInnoDB } from "../src/migration-helpers.js";

// Messages sent from the public Contact page (not tied to a property).
export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("contact_messages", (table) => {
    table.bigIncrements("id");
    table.string("name", 160).notNullable();
    table.string("email", 254).notNullable();
    table.string("phone", 30).nullable();
    table.string("topic", 60).notNullable().defaultTo("general");
    table.text("message").notNullable();
    table
      .enu("status", ["new", "read", "replied", "archived"])
      .notNullable()
      .defaultTo("new");
    table
      .bigInteger("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.index(["status", "created_at"], "idx_contact_status_created");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("contact_messages");
}
