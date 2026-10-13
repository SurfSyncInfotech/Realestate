import { withInnoDB } from "../src/migration-helpers.js";

function addTimestamps(table, knex) {
  table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
}

export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("subscription_plans", (table) => {
    table.bigIncrements("id");
    table
      .string("name", 100)
      .notNullable()
      .unique("uq_subscription_plans_name");
    table
      .string("slug", 120)
      .notNullable()
      .unique("uq_subscription_plans_slug");
    table.text("description").notNullable();
    table
      .enu("billing_cycle", ["monthly", "quarterly", "annual"])
      .notNullable();
    table.decimal("price", 12, 2).unsigned().notNullable();
    table.string("currency", 3).notNullable().defaultTo("INR");
    table.smallint("listing_limit").unsigned().notNullable().defaultTo(0);
    table.json("features").notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.boolean("is_demo").notNullable().defaultTo(false);
    addTimestamps(table, knex);
    table.index(
      ["is_active", "billing_cycle"],
      "idx_subscription_plans_active_cycle",
    );
  });

  await knex.schema.createTable("subscriptions", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .bigInteger("plan_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("subscription_plans")
      .onDelete("RESTRICT");
    table
      .enu("status", [
        "pending",
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ])
      .notNullable()
      .defaultTo("pending");
    table.timestamp("starts_at").nullable();
    table.timestamp("ends_at").nullable();
    table.timestamp("cancelled_at").nullable();
    addTimestamps(table, knex);
    table.index(["user_id", "status"], "idx_subscriptions_user_status");
    table.index(["status", "ends_at"], "idx_subscriptions_status_expiry");
  });

  await knex.schema.createTable("payment_transactions", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("subscription_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("subscriptions")
      .onDelete("SET NULL");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("provider", 40).notNullable();
    table
      .string("provider_order_id", 180)
      .nullable()
      .unique("uq_payments_provider_order");
    table
      .string("provider_payment_id", 180)
      .nullable()
      .unique("uq_payments_provider_payment");
    table
      .string("idempotency_key", 128)
      .nullable()
      .unique("uq_payments_idempotency");
    table.decimal("amount", 15, 2).unsigned().notNullable();
    table.string("currency", 3).notNullable().defaultTo("INR");
    table
      .enu("status", [
        "created",
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ])
      .notNullable()
      .defaultTo("created");
    table.timestamp("signature_verified_at").nullable();
    table.timestamp("paid_at").nullable();
    table.json("provider_metadata").nullable();
    addTimestamps(table, knex);
    table.index(["user_id", "created_at"], "idx_payments_user_date");
    table.index(
      ["subscription_id", "status"],
      "idx_payments_subscription_status",
    );
  });

  await knex.schema.createTable("reviews", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.tinyint("rating").unsigned().notNullable();
    table.string("title", 160).notNullable();
    table.text("body").notNullable();
    table
      .enu("status", ["pending", "published", "rejected", "hidden"])
      .notNullable()
      .defaultTo("pending");
    table.timestamp("moderated_at").nullable();
    table.bigInteger("moderated_by_user_id").unsigned().nullable();
    table
      .foreign("moderated_by_user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    addTimestamps(table, knex);
    table.check("rating BETWEEN 1 AND 5", {}, "chk_reviews_rating_range");
    table.unique(["property_id", "user_id"], "uq_reviews_property_user");
    table.index(
      ["property_id", "status", "created_at"],
      "idx_reviews_property_status",
    );
  });

  await knex.schema.createTable("blog_posts", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("author_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("title", 220).notNullable();
    table.string("slug", 240).notNullable().unique("uq_blog_posts_slug");
    table.text("excerpt").notNullable();
    table.longText("body").notNullable();
    table.string("cover_image_key", 500).nullable();
    table
      .enu("status", ["draft", "scheduled", "published", "archived"])
      .notNullable()
      .defaultTo("draft");
    table.timestamp("published_at").nullable();
    addTimestamps(table, knex);
    table.index(["status", "published_at"], "idx_blog_posts_publish");
  });

  await knex.schema.createTable("banners", (table) => {
    table.bigIncrements("id");
    table.string("title", 180).notNullable();
    table.string("subtitle", 255).nullable();
    table.string("image_key", 500).notNullable();
    table.string("alt_text", 255).notNullable();
    table.string("target_url", 500).nullable();
    table
      .enu("placement", ["home_hero", "home_featured", "search", "other"])
      .notNullable();
    table.boolean("is_active").notNullable().defaultTo(false);
    table.timestamp("starts_at").nullable();
    table.timestamp("ends_at").nullable();
    table.bigInteger("created_by_user_id").unsigned().nullable();
    table
      .foreign("created_by_user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    addTimestamps(table, knex);
    table.check(
      "ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at",
      {},
      "chk_banners_schedule_range",
    );
    table.index(
      ["placement", "is_active", "starts_at", "ends_at"],
      "idx_banners_active_schedule",
    );
  });

  await knex.schema.createTable("audit_logs", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("actor_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("action", 100).notNullable();
    table.string("entity_type", 80).notNullable();
    table.string("entity_id", 80).nullable();
    table.json("before_data").nullable();
    table.json("after_data").nullable();
    table.string("ip_address", 45).nullable();
    table.string("request_id", 100).nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(
      ["entity_type", "entity_id", "created_at"],
      "idx_audit_entity_date",
    );
    table.index(["actor_user_id", "created_at"], "idx_audit_actor_date");
    table.index(["action", "created_at"], "idx_audit_action_date");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("audit_logs");
  await knex.schema.dropTableIfExists("banners");
  await knex.schema.dropTableIfExists("blog_posts");
  await knex.schema.dropTableIfExists("reviews");
  await knex.schema.dropTableIfExists("payment_transactions");
  await knex.schema.dropTableIfExists("subscriptions");
  await knex.schema.dropTableIfExists("subscription_plans");
}
