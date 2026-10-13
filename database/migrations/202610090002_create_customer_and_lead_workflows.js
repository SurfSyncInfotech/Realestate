import { withInnoDB } from "../src/migration-helpers.js";

function addTimestamps(table, knex) {
  table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
}

export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("saved_properties", (table) => {
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .bigInteger("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.primary(["user_id", "property_id"]);
    table.index(["property_id", "created_at"], "idx_saved_property_created");
  });

  await knex.schema.createTable("recently_viewed_properties", (table) => {
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .bigInteger("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table.timestamp("viewed_at").notNullable().defaultTo(knex.fn.now());
    table.primary(["user_id", "property_id"]);
    table.index(["user_id", "viewed_at"], "idx_recent_views_user_viewed");
  });

  await knex.schema.createTable("leads", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("properties")
      .onDelete("RESTRICT");
    table
      .bigInteger("customer_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("contact_name", 160).notNullable();
    table.string("phone_e164", 16).notNullable();
    table.string("email", 254).nullable();
    table.text("message").nullable();
    table
      .enu("source", ["callback", "inquiry", "whatsapp", "site_visit", "other"])
      .notNullable();
    table
      .enu("status", [
        "new",
        "contacted",
        "qualified",
        "site_visit_scheduled",
        "closed_won",
        "closed_lost",
        "spam",
      ])
      .notNullable()
      .defaultTo("new");
    table.timestamp("consent_at").notNullable();
    table.string("consent_text_version", 40).notNullable();
    table
      .string("idempotency_key", 128)
      .nullable()
      .unique("uq_leads_idempotency");
    table.timestamp("closed_at").nullable();
    addTimestamps(table, knex);
    table.unique(["id", "property_id"], "uq_leads_id_property");
    table.index(
      ["property_id", "status", "created_at"],
      "idx_leads_property_status_created",
    );
    table.index(
      ["customer_user_id", "created_at"],
      "idx_leads_customer_created",
    );
    table.index(["phone_e164", "created_at"], "idx_leads_phone_created");
  });

  await knex.schema.createTable("lead_assignments", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("lead_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("leads")
      .onDelete("CASCADE");
    table
      .bigInteger("agent_profile_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("agent_profiles")
      .onDelete("RESTRICT");
    table
      .bigInteger("assigned_by_user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("assigned_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("unassigned_at").nullable();
    table.text("notes").nullable();
    table.index(["lead_id", "assigned_at"], "idx_lead_assignments_lead_date");
    table.index(
      ["agent_profile_id", "unassigned_at"],
      "idx_lead_assignments_agent_active",
    );
  });

  await knex.schema.createTable("follow_up_activities", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("lead_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("leads")
      .onDelete("CASCADE");
    table
      .bigInteger("actor_user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .enu("activity_type", [
        "call",
        "email",
        "message",
        "note",
        "status_change",
        "visit_update",
      ])
      .notNullable();
    table.text("notes").notNullable();
    table.dateTime("next_follow_up_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["lead_id", "created_at"], "idx_followups_lead_date");
    table.index(["actor_user_id", "created_at"], "idx_followups_actor_date");
  });

  await knex.schema.createTable("site_visits", (table) => {
    table.bigIncrements("id");
    table.bigInteger("lead_id").unsigned().notNullable();
    table.bigInteger("property_id").unsigned().notNullable();
    table
      .bigInteger("requested_by_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .bigInteger("assigned_agent_profile_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("agent_profiles")
      .onDelete("SET NULL");
    table
      .foreign(["lead_id", "property_id"])
      .references(["id", "property_id"])
      .inTable("leads")
      .onDelete("RESTRICT");
    table.dateTime("starts_at").notNullable();
    table.dateTime("ends_at").nullable();
    table
      .enu("status", [
        "requested",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ])
      .notNullable()
      .defaultTo("requested");
    table.text("notes").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.check(
      "ends_at IS NULL OR ends_at > starts_at",
      {},
      "chk_site_visits_time_range",
    );
    table.index(
      ["property_id", "starts_at", "status"],
      "idx_visits_property_schedule",
    );
    table.index(
      ["assigned_agent_profile_id", "starts_at"],
      "idx_visits_agent_schedule",
    );
    table.index(["lead_id", "created_at"], "idx_visits_lead_created");
  });

  await knex.schema.createTable("notifications", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.enu("channel", ["in_app", "email", "sms", "whatsapp"]).notNullable();
    table.string("provider", 60).nullable();
    table.string("provider_reference", 180).nullable();
    table.string("subject", 200).nullable();
    table.text("body").notNullable();
    table
      .enu("status", ["queued", "sent", "delivered", "failed", "read"])
      .notNullable()
      .defaultTo("queued");
    table.timestamp("sent_at").nullable();
    table.timestamp("read_at").nullable();
    table.json("metadata").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(
      ["user_id", "status", "created_at"],
      "idx_notifications_user_status_date",
    );
    table.index(
      ["channel", "status", "created_at"],
      "idx_notifications_delivery",
    );
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.dropTableIfExists("site_visits");
  await knex.schema.dropTableIfExists("follow_up_activities");
  await knex.schema.dropTableIfExists("lead_assignments");
  await knex.schema.dropTableIfExists("leads");
  await knex.schema.dropTableIfExists("recently_viewed_properties");
  await knex.schema.dropTableIfExists("saved_properties");
}
