import { withInnoDB } from "../src/migration-helpers.js";

// Conversation, site-visit and notification tables:
//   enquiry_replies - admin replies on a contact message / property enquiry
//   visit_schedules - site visits an admin books for an enquiry
//   app_notifications - in-app notifications for every role
export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("enquiry_replies", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("message_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("contact_messages")
      .onDelete("CASCADE");
    table
      .bigInteger("author_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.text("body").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["message_id", "created_at"], "idx_replies_message_created");
  });

  await knex.schema.createTable("visit_schedules", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("message_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("contact_messages")
      .onDelete("CASCADE");
    table.string("property_slug", 200).nullable();
    table.string("property_title", 180).nullable();
    table
      .bigInteger("agent_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.dateTime("scheduled_at").notNullable();
    table
      .enu("status", ["scheduled", "completed", "cancelled"])
      .notNullable()
      .defaultTo("scheduled");
    table.text("notes").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.index(["scheduled_at", "status"], "idx_visit_schedules_when");
    table.index(["agent_user_id", "scheduled_at"], "idx_visit_schedules_agent");
    table.index(["message_id"], "idx_visit_schedules_message");
  });

  await knex.schema.createTable("app_notifications", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("type", 40).notNullable();
    table.string("title", 160).notNullable();
    table.string("body", 500).nullable();
    table.string("link", 200).nullable();
    table.timestamp("read_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "read_at", "created_at"], "idx_app_notifications_user");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("app_notifications");
  await knex.schema.dropTableIfExists("visit_schedules");
  await knex.schema.dropTableIfExists("enquiry_replies");
}
