import { withInnoDB } from "../src/migration-helpers.js";

// One row per property with the display fields the website needs on top of the
// core `properties` row: tag, labels, flags and the highlight list.
export async function up(knex) {
  knex = withInnoDB(knex);

  await knex.schema.createTable("property_details", (table) => {
    table
      .bigInteger("property_id")
      .unsigned()
      .primary()
      .references("id")
      .inTable("properties")
      .onDelete("CASCADE");
    table.string("tag", 80).nullable();
    table.string("type_label", 80).notNullable();
    table.string("location_label", 180).notNullable();
    table.string("city_label", 80).notNullable();
    table.boolean("is_luxury").notNullable().defaultTo(false);
    table.boolean("is_new_project").notNullable().defaultTo(false);
    table.boolean("is_verified").notNullable().defaultTo(false);
    table.string("facing", 80).nullable();
    table.string("floor_label", 80).nullable();
    table.string("parking", 80).nullable();
    table.smallint("age_years").unsigned().nullable();
    table.string("palette", 20).nullable();
    table.text("highlights").nullable();
    table.index(["city_label"], "idx_property_details_city");
    table.index(["is_luxury", "is_new_project"], "idx_property_details_flags");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("property_details");
}
