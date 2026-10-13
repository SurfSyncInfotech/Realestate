import { withInnoDB } from "../src/migration-helpers.js";

function addTimestamps(table, knex) {
  table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
}

export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("roles", (table) => {
    table.bigIncrements("id");
    table.string("name", 40).notNullable().unique("uq_roles_name");
    table.string("description", 255).notNullable();
    addTimestamps(table, knex);
  });

  await knex.schema.createTable("permissions", (table) => {
    table.bigIncrements("id");
    table.string("name", 80).notNullable().unique("uq_permissions_name");
    table.string("description", 255).notNullable();
    addTimestamps(table, knex);
  });

  await knex.schema.createTable("role_permissions", (table) => {
    table.bigInteger("role_id").unsigned().notNullable();
    table
      .bigInteger("permission_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("permissions")
      .onDelete("CASCADE");
    table
      .foreign("role_id")
      .references("id")
      .inTable("roles")
      .onDelete("CASCADE");
    table.primary(["role_id", "permission_id"]);
  });

  await knex.schema.createTable("users", (table) => {
    table.bigIncrements("id");
    table.string("email", 254).nullable().unique("uq_users_email");
    table.string("phone_e164", 16).nullable().unique("uq_users_phone_e164");
    table.string("password_hash", 255).notNullable();
    table.string("first_name", 80).notNullable();
    table.string("last_name", 80).nullable();
    table
      .enu("status", ["pending", "active", "suspended", "deleted"])
      .notNullable()
      .defaultTo("pending");
    table.timestamp("email_verified_at").nullable();
    table.timestamp("phone_verified_at").nullable();
    table.timestamp("last_login_at").nullable();
    addTimestamps(table, knex);
    table.check(
      "email IS NOT NULL OR phone_e164 IS NOT NULL",
      {},
      "chk_users_contact_method",
    );
    table.index(["status", "created_at"], "idx_users_status_created");
  });

  await knex.schema.createTable("user_roles", (table) => {
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .bigInteger("role_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("roles")
      .onDelete("CASCADE");
    table.primary(["user_id", "role_id"]);
  });

  await knex.schema.createTable("agent_profiles", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .unique("uq_agent_profiles_user")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("agency_name", 160).nullable();
    table
      .string("license_number", 100)
      .nullable()
      .unique("uq_agent_profiles_license");
    table.text("bio").nullable();
    table
      .enu("approval_status", ["pending", "approved", "rejected", "suspended"])
      .notNullable()
      .defaultTo("pending");
    addTimestamps(table, knex);
    table.index(["approval_status"], "idx_agent_profiles_approval");
  });

  await knex.schema.createTable("builder_profiles", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .unique("uq_builder_profiles_user")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("company_name", 180).notNullable();
    table
      .string("company_registration_number", 100)
      .nullable()
      .unique("uq_builder_profiles_registration");
    table.text("description").nullable();
    table
      .enu("approval_status", ["pending", "approved", "rejected", "suspended"])
      .notNullable()
      .defaultTo("pending");
    addTimestamps(table, knex);
    table.index(["approval_status"], "idx_builder_profiles_approval");
  });

  await knex.schema.createTable("sessions", (table) => {
    table.string("id", 128).primary();
    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.text("data").notNullable();
    table.dateTime("expires_at").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["user_id", "expires_at"], "idx_sessions_user_expiry");
    table.index(["expires_at"], "idx_sessions_expiry");
  });

  await knex.schema.createTable("locations", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("parent_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("locations")
      .onDelete("RESTRICT");
    table.string("name", 120).notNullable();
    table.string("slug", 140).notNullable().unique("uq_locations_slug");
    table
      .enu("location_type", ["country", "state", "city", "locality"])
      .notNullable();
    table.string("country_code", 2).nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    addTimestamps(table, knex);
    table.index(["parent_id", "location_type"], "idx_locations_parent_type");
    table.index(["is_active", "location_type"], "idx_locations_active_type");
  });

  await knex.schema.createTable("amenities", (table) => {
    table.bigIncrements("id");
    table.string("name", 100).notNullable().unique("uq_amenities_name");
    table.string("slug", 120).notNullable().unique("uq_amenities_slug");
    table.string("category", 60).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    addTimestamps(table, knex);
    table.index(["category", "is_active"], "idx_amenities_category_active");
  });

  await knex.schema.createTable("properties", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("owner_user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table
      .bigInteger("agent_profile_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("agent_profiles")
      .onDelete("SET NULL");
    table
      .bigInteger("builder_profile_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("builder_profiles")
      .onDelete("SET NULL");
    table
      .bigInteger("location_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("locations")
      .onDelete("RESTRICT");
    table.string("title", 180).notNullable();
    table.string("slug", 200).notNullable().unique("uq_properties_slug");
    table.text("description").notNullable();
    table.enu("listing_type", ["sale", "rent", "lease"]).notNullable();
    table
      .enu("property_type", [
        "apartment",
        "villa",
        "house",
        "plot",
        "office",
        "retail",
        "warehouse",
        "other",
      ])
      .notNullable();
    table
      .enu("status", ["draft", "pending", "published", "rejected", "archived"])
      .notNullable()
      .defaultTo("draft");
    table.decimal("price", 15, 2).unsigned().notNullable();
    table.string("currency", 3).notNullable().defaultTo("INR");
    table.decimal("area_sqft", 12, 2).unsigned().notNullable();
    table.tinyint("bedrooms").unsigned().nullable();
    table.tinyint("bathrooms").unsigned().nullable();
    table.smallint("floor_number").unsigned().nullable();
    table.smallint("total_floors").unsigned().nullable();
    table
      .enu("furnishing", ["unfurnished", "semi_furnished", "furnished"])
      .nullable();
    table.string("possession_status", 80).nullable();
    table.string("rera_number", 100).nullable();
    table.timestamp("rera_verified_at").nullable();
    table.boolean("is_featured").notNullable().defaultTo(false);
    table.boolean("is_demo").notNullable().defaultTo(false);
    table.date("available_from").nullable();
    table.integer("view_count").unsigned().notNullable().defaultTo(0);
    table.timestamp("published_at").nullable();
    addTimestamps(table, knex);
    table.check("price > 0", {}, "chk_properties_positive_price");
    table.check("area_sqft > 0", {}, "chk_properties_positive_area");
    table.check(
      "floor_number IS NULL OR total_floors IS NULL OR floor_number <= total_floors",
      {},
      "chk_properties_floor_range",
    );
    table.index(
      ["status", "listing_type", "property_type", "location_id"],
      "idx_properties_search",
    );
    table.index(["price", "area_sqft"], "idx_properties_price_area");
    table.index(["owner_user_id", "status"], "idx_properties_owner_status");
    table.index(["agent_profile_id", "status"], "idx_properties_agent_status");
    table.index(
      ["builder_profile_id", "status"],
      "idx_properties_builder_status",
    );
    table.index(["is_demo", "status"], "idx_properties_demo_status");
  });

  await knex.schema.createTable("property_images", (table) => {
    table.bigIncrements("id");
    table
      .bigInteger("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table.string("storage_key", 500).notNullable();
    table
      .enu("storage_provider", ["local", "cloudinary"])
      .notNullable()
      .defaultTo("local");
    table.string("alt_text", 255).notNullable();
    table.smallint("sort_order").unsigned().notNullable().defaultTo(0);
    table.boolean("is_cover").notNullable().defaultTo(false);
    addTimestamps(table, knex);
    table.index(["property_id", "sort_order"], "idx_property_images_order");
    table.index(["property_id", "is_cover"], "idx_property_images_cover");
  });

  await knex.schema.createTable("property_amenities", (table) => {
    table
      .bigInteger("property_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table
      .bigInteger("amenity_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("amenities")
      .onDelete("CASCADE");
    table.primary(["property_id", "amenity_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("property_amenities");
  await knex.schema.dropTableIfExists("property_images");
  await knex.schema.dropTableIfExists("properties");
  await knex.schema.dropTableIfExists("amenities");
  await knex.schema.dropTableIfExists("locations");
  await knex.schema.dropTableIfExists("sessions");
  await knex.schema.dropTableIfExists("builder_profiles");
  await knex.schema.dropTableIfExists("agent_profiles");
  await knex.schema.dropTableIfExists("user_roles");
  await knex.schema.dropTableIfExists("users");
  await knex.schema.dropTableIfExists("role_permissions");
  await knex.schema.dropTableIfExists("permissions");
  await knex.schema.dropTableIfExists("roles");
}
