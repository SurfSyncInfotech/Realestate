import { withInnoDB } from "../src/migration-helpers.js";

// Lead pipeline: every enquiry (contact_messages row) gets one progress row
// with its stage, the property it is about, the agent who owns it and any
// follow-up reminder.   new -> contacted -> visit_scheduled -> follow_up -> closed
export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("lead_progress", (table) => {
    table
      .bigInteger("message_id")
      .unsigned()
      .primary()
      .references("id")
      .inTable("contact_messages")
      .onDelete("CASCADE");
    table
      .enu("stage", ["new", "contacted", "visit_scheduled", "follow_up", "closed_won", "closed_lost"])
      .notNullable()
      .defaultTo("new");
    table.string("property_slug", 200).nullable();
    table
      .bigInteger("owner_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .bigInteger("assigned_agent_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.dateTime("follow_up_at").nullable();
    table.string("follow_up_note", 300).nullable();
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.index(["stage"], "idx_lead_progress_stage");
    table.index(["owner_user_id", "stage"], "idx_lead_progress_owner");
    table.index(["assigned_agent_user_id", "stage"], "idx_lead_progress_agent");
    table.index(["follow_up_at"], "idx_lead_progress_follow_up");
  });

  // Give enquiries that already exist a progress row (property slug read from
  // the "[Property enquiry: Title (slug)]" prefix). Skipped in compile-only tests.
  if (typeof knex.raw === "function") {
    await knex.raw(`
      INSERT INTO lead_progress (message_id, stage, property_slug, owner_user_id)
      SELECT m.id,
             CASE WHEN m.status = 'replied' THEN 'contacted' ELSE 'new' END,
             NULLIF(REGEXP_SUBSTR(REGEXP_SUBSTR(m.message, '\\\\([a-z0-9-]+\\\\)\\\\]'), '[a-z0-9-]+'), ''),
             (SELECT p.owner_user_id FROM properties p
               WHERE p.slug = NULLIF(REGEXP_SUBSTR(REGEXP_SUBSTR(m.message, '\\\\([a-z0-9-]+\\\\)\\\\]'), '[a-z0-9-]+'), '') LIMIT 1)
      FROM contact_messages m
      WHERE NOT EXISTS (SELECT 1 FROM lead_progress lp WHERE lp.message_id = m.id)
    `);
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("lead_progress");
}
