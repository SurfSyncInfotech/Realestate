// Loads the shared property catalogue (src/catalogue.js) into MySQL.
// Safe to re-run: rows are matched on slug and updated in place.
import { AMENITY_SLUGS, catalogue } from "../src/catalogue.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    // Remove the placeholder rows an earlier seed created.
    await trx("properties").where({ is_demo: true }).delete();

    const india = await trx("locations").select("id").where({ slug: "india" }).first();
    if (!india) throw new Error("Run the base seed first (001) so locations exist.");

    const amenityRows = await trx("amenities").select("id", "slug");
    const amenityIds = new Map(amenityRows.map((row) => [row.slug, row.id]));
    const cityIds = new Map();

    for (const item of catalogue) {
      const citySlug = slugify(item.city);
      if (!cityIds.has(citySlug)) {
        await trx("locations")
          .insert({ name: item.city, slug: citySlug, location_type: "city", parent_id: india.id, is_active: true })
          .onConflict("slug")
          .merge(["name", "updated_at"]);
        const row = await trx("locations").select("id").where({ slug: citySlug }).first();
        cityIds.set(citySlug, row.id);
      }

      const furnishing = item.furnishing ?? null;
      await trx("properties")
        .insert({
          title: item.title,
          slug: item.id,
          description: item.description,
          listing_type: item.listingType,
          property_type: item.propertyType,
          status: "published",
          price: item.price,
          currency: "INR",
          area_sqft: item.areaSqFt,
          bedrooms: item.beds || null,
          bathrooms: item.baths ?? null,
          furnishing,
          possession_status: item.possession ?? null,
          location_id: cityIds.get(citySlug),
          is_featured: Boolean(item.luxury),
          is_demo: false,
          published_at: trx.fn.now(),
        })
        .onConflict("slug")
        .merge([
          "title", "description", "listing_type", "property_type", "status", "price",
          "area_sqft", "bedrooms", "bathrooms", "furnishing", "possession_status",
          "location_id", "is_featured", "is_demo", "updated_at",
        ]);
      const { id: propertyId } = await trx("properties").select("id").where({ slug: item.id }).first();

      await trx("property_details")
        .insert({
          property_id: propertyId,
          tag: item.tag ?? null,
          type_label: item.type,
          location_label: item.location,
          city_label: item.city,
          is_luxury: Boolean(item.luxury),
          is_new_project: Boolean(item.newProject),
          is_verified: Boolean(item.verified),
          facing: item.facing ?? null,
          floor_label: item.floor ?? null,
          parking: item.parking ?? null,
          age_years: item.ageYears ?? null,
          palette: item.palette ?? null,
          highlights: JSON.stringify(item.highlights ?? []),
        })
        .onConflict("property_id")
        .merge();

      await trx("property_images").where({ property_id: propertyId }).delete();
      await trx("property_images").insert(
        item.images.map((photo, index) => ({
          property_id: propertyId,
          storage_key: `unsplash/${photo}`,
          storage_provider: "local",
          alt_text: `${item.title}, photo ${index + 1}`,
          sort_order: index,
          is_cover: index === 0,
        })),
      );

      await trx("property_amenities").where({ property_id: propertyId }).delete();
      const links = (item.amenities ?? [])
        .map((name) => amenityIds.get(AMENITY_SLUGS[name]))
        .filter(Boolean)
        .map((amenity_id) => ({ property_id: propertyId, amenity_id }));
      if (links.length) await trx("property_amenities").insert(links);
    }
  });
}
