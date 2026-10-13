import { randomBytes } from "node:crypto";
import {
  AMENITY_SLUGS,
  catalogue,
  createDatabase,
  formatArea,
  formatPriceLabel,
  isDatabaseConfigured,
  searchCatalogue,
} from "@realestate/database";
import logger from "../config/logger.js";

const MODE_TO_LISTING = { buy: "sale", rent: "rent", commercial: "lease" };
const LISTING_TO_MODE = { sale: "buy", rent: "rent", lease: "commercial" };
const COVER_FALLBACK = "1600596542815-ffad4c1539a9";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export class CatalogueError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "CatalogueError";
    this.status = status;
    this.code = code;
  }
}

const unavailable = () =>
  new CatalogueError(
    503,
    "DATABASE_UNAVAILABLE",
    "This feature needs the database. Configure database/.env and run the migrations.",
  );

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const imageId = (key) => key.replace(/^unsplash\//, "");

function toProperty(row, images = [], amenities = []) {
  const listingType = row.listing_type;
  const price = Number(row.price);
  const areaSqFt = Math.round(Number(row.area_sqft));
  return {
    id: row.slug,
    status: row.status,
    title: row.title,
    type: row.type_label,
    propertyType: row.property_type,
    listingType,
    mode: LISTING_TO_MODE[listingType],
    location: row.location_label,
    city: row.city_label,
    price,
    priceLabel: formatPriceLabel(price, listingType),
    beds: row.bedrooms ?? 0,
    baths: row.bathrooms ?? 0,
    area: formatArea(areaSqFt),
    areaSqFt,
    tag: row.tag,
    palette: row.palette,
    luxury: Boolean(row.is_luxury),
    newProject: Boolean(row.is_new_project),
    verified: Boolean(row.is_verified),
    furnishing: row.furnishing,
    possession: row.possession_status,
    facing: row.facing,
    floor: row.floor_label,
    parking: row.parking,
    ageYears: row.age_years,
    description: row.description,
    highlights: parseJson(row.highlights, []),
    amenities,
    images: images.map(imageId),
    agent: {
      name: "Estate & Co. Advisory Desk",
      role: "Dedicated property advisor",
    },
    rera: row.rera_number ?? null,
    source: "catalogue",
  };
}

const BASE_SELECT = [
  "p.id as pk",
  "p.slug",
  "p.title",
  "p.description",
  "p.listing_type",
  "p.property_type",
  "p.status",
  "p.price",
  "p.area_sqft",
  "p.bedrooms",
  "p.bathrooms",
  "p.furnishing",
  "p.possession_status",
  "p.rera_number",
  "p.owner_user_id",
  "p.created_at",
  "d.tag",
  "d.type_label",
  "d.location_label",
  "d.city_label",
  "d.is_luxury",
  "d.is_new_project",
  "d.is_verified",
  "d.facing",
  "d.floor_label",
  "d.parking",
  "d.age_years",
  "d.palette",
  "d.highlights",
];

export function createPropertyService({
  databaseProvider = createDatabase,
  configured = isDatabaseConfigured,
} = {}) {
  let database;
  const db = () => (database ??= databaseProvider());
  const useDatabase = () => configured();

  const baseQuery = () =>
    db()("properties as p").join("property_details as d", "d.property_id", "p.id");

  async function hydrate(rows) {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.pk);
    const [imageRows, amenityRows] = await Promise.all([
      db()("property_images")
        .select("property_id", "storage_key")
        .whereIn("property_id", ids)
        .orderBy("sort_order"),
      db()("property_amenities as pa")
        .join("amenities as a", "a.id", "pa.amenity_id")
        .select("pa.property_id", "a.name")
        .whereIn("pa.property_id", ids),
    ]);
    return rows.map((row) =>
      toProperty(
        row,
        imageRows.filter((i) => i.property_id === row.pk).map((i) => i.storage_key),
        amenityRows.filter((a) => a.property_id === row.pk).map((a) => a.name),
      ),
    );
  }

  async function ensureCity(trx, name) {
    const slug = slugify(name);
    let row = await trx("locations").select("id").where({ slug }).first();
    if (!row) {
      const india = await trx("locations").select("id").where({ slug: "india" }).first();
      await trx("locations").insert({
        name,
        slug,
        location_type: "city",
        parent_id: india?.id ?? null,
        is_active: true,
      });
      row = await trx("locations").select("id").where({ slug }).first();
    }
    return row.id;
  }

  return {
    /** Public search: published listings only. */
    async list(filters = {}) {
      if (!useDatabase()) return searchCatalogue(catalogue, filters);
      try {
        const { mode, city, query, type, maxPrice, sort = "featured" } = filters;
        const q = baseQuery().select(BASE_SELECT).where("p.status", "published");
        if (mode === "luxury") q.where("d.is_luxury", true);
        else if (mode === "new-projects") q.where("d.is_new_project", true);
        else if (MODE_TO_LISTING[mode]) q.where("p.listing_type", MODE_TO_LISTING[mode]);
        if (city) {
          q.where((b) =>
            b.whereILike("d.city_label", `%${city}%`).orWhereILike("d.location_label", `%${city}%`),
          );
        }
        if (query) {
          q.where((b) =>
            b
              .whereILike("p.title", `%${query}%`)
              .orWhereILike("p.description", `%${query}%`)
              .orWhereILike("d.tag", `%${query}%`)
              .orWhereILike("d.location_label", `%${query}%`),
          );
        }
        if (type) q.whereILike("d.type_label", `%${type}%`);
        if (Number.isFinite(maxPrice)) q.where("p.price", "<=", maxPrice);
        if (sort === "price-low") q.orderBy("p.price", "asc");
        else if (sort === "price-high") q.orderBy("p.price", "desc");
        else if (sort === "newest") q.orderBy("p.id", "desc");
        else q.orderBy([{ column: "p.is_featured", order: "desc" }, { column: "p.id", order: "asc" }]);
        return await hydrate(await q);
      } catch (error) {
        logger.warn({ err: error }, "Property query failed; serving bundled catalogue");
        return searchCatalogue(catalogue, filters);
      }
    },

    async getById(slug) {
      if (!useDatabase()) return catalogue.find((p) => p.id === slug) ?? null;
      try {
        const row = await baseQuery().select(BASE_SELECT).where({ "p.slug": slug, "p.status": "published" }).first();
        if (!row) return null;
        db()("properties").where({ id: row.pk }).increment("view_count", 1).catch(() => {});
        return (await hydrate([row]))[0];
      } catch (error) {
        logger.warn({ err: error }, "Property lookup failed; serving bundled catalogue");
        return catalogue.find((p) => p.id === slug) ?? null;
      }
    },

    /** Agents, builders and admins add listings. Agents' listings wait for review. */
    async create(user, input) {
      if (!useDatabase()) throw unavailable();
      const slug = `${slugify(input.title).slice(0, 150)}-${randomBytes(3).toString("hex")}`;
      const status = user.role === "admin" ? "published" : "pending";
      try {
        return await db().transaction(async (trx) => {
          const locationId = await ensureCity(trx, input.city);
          const [id] = await trx("properties").insert({
            owner_user_id: user.id,
            location_id: locationId,
            title: input.title,
            slug,
            description: input.description,
            listing_type: input.listingType,
            property_type: input.propertyType,
            status,
            price: input.price,
            currency: "INR",
            area_sqft: input.areaSqFt,
            bedrooms: input.beds || null,
            bathrooms: input.baths ?? null,
            furnishing: input.furnishing ?? null,
            possession_status: input.possession || null,
            is_demo: false,
            published_at: status === "published" ? trx.fn.now() : null,
          });
          await trx("property_details").insert({
            property_id: id,
            tag: input.tag || null,
            type_label: input.typeLabel || input.propertyType.replace(/^./, (c) => c.toUpperCase()),
            location_label: input.location,
            city_label: input.city,
            is_luxury: Boolean(input.luxury),
            is_new_project: Boolean(input.newProject),
            is_verified: user.role === "admin",
            highlights: JSON.stringify(input.highlights ?? []),
          });
          const photos = input.images?.length ? input.images : [COVER_FALLBACK];
          await trx("property_images").insert(
            photos.map((key, index) => ({
              property_id: id,
              storage_key: /^https?:\/\//.test(key) ? key : `unsplash/${key}`,
              storage_provider: "local",
              alt_text: `${input.title}, photo ${index + 1}`,
              sort_order: index,
              is_cover: index === 0,
            })),
          );
          const amenityRows = await trx("amenities").select("id", "slug");
          const ids = new Map(amenityRows.map((a) => [a.slug, a.id]));
          const links = (input.amenities ?? [])
            .map((name) => ids.get(AMENITY_SLUGS[name]))
            .filter(Boolean)
            .map((amenity_id) => ({ property_id: id, amenity_id }));
          if (links.length) await trx("property_amenities").insert(links);
          return { id: slug, status };
        });
      } catch (error) {
        logger.error({ err: error }, "Property creation failed");
        throw unavailable();
      }
    },

    async listOwned(userId) {
      if (!useDatabase()) throw unavailable();
      try {
        return await hydrate(
          await baseQuery().select(BASE_SELECT).where("p.owner_user_id", userId).orderBy("p.id", "desc"),
        );
      } catch {
        throw unavailable();
      }
    },

    /** Admin moderation queue. */
    async listByStatus(status) {
      if (!useDatabase()) throw unavailable();
      try {
        const q = baseQuery().select(BASE_SELECT).orderBy("p.id", "desc").limit(100);
        if (status && status !== "all") q.where("p.status", status);
        return await hydrate(await q);
      } catch {
        throw unavailable();
      }
    },

    async setStatus(slug, status, { verified } = {}) {
      if (!useDatabase()) throw unavailable();
      try {
        const row = await db()("properties").select("id", "title", "owner_user_id").where({ slug }).first();
        if (!row) throw new CatalogueError(404, "PROPERTY_NOT_FOUND", "That property does not exist.");
        await db()("properties").where({ id: row.id }).update({
          status,
          published_at: status === "published" ? new Date() : null,
          updated_at: new Date(),
        });
        if (status === "published" && verified !== undefined) {
          await db()("property_details").where({ property_id: row.id }).update({ is_verified: verified });
        }
        return { id: slug, status, ownerId: row.owner_user_id, title: row.title };
      } catch (error) {
        if (error instanceof CatalogueError) throw error;
        throw unavailable();
      }
    },

    /* ---- edit / remove own listings (agents and builders) ---- */
    async updateOwned(user, slug, input) {
      if (!useDatabase()) throw unavailable();
      try {
        return await db().transaction(async (trx) => {
          const row = await trx("properties").select("id", "owner_user_id", "status").where({ slug }).first();
          if (!row || (user.role !== "admin" && row.owner_user_id !== user.id)) {
            throw new CatalogueError(404, "PROPERTY_NOT_FOUND", "That property was not found in your listings.");
          }
          // Partners' edits go back to review so the website never shows unchecked changes.
          const status = user.role === "admin" ? row.status : "pending";
          await trx("properties").where({ id: row.id }).update({
            location_id: await ensureCity(trx, input.city),
            title: input.title,
            description: input.description,
            listing_type: input.listingType,
            property_type: input.propertyType,
            status,
            price: input.price,
            area_sqft: input.areaSqFt,
            bedrooms: input.beds || null,
            bathrooms: input.baths ?? null,
            furnishing: input.furnishing ?? null,
            possession_status: input.possession || null,
            updated_at: new Date(),
          });
          await trx("property_details").where({ property_id: row.id }).update({
            tag: input.tag || null,
            type_label: input.typeLabel || input.propertyType.replace(/^./, (c) => c.toUpperCase()),
            location_label: input.location,
            city_label: input.city,
            is_luxury: Boolean(input.luxury),
            is_new_project: Boolean(input.newProject),
            is_verified: user.role === "admin" ? undefined : false,
            highlights: JSON.stringify(input.highlights ?? []),
          });
          if (input.images?.length) {
            await trx("property_images").where({ property_id: row.id }).delete();
            await trx("property_images").insert(
              input.images.map((key, index) => ({
                property_id: row.id,
                storage_key: /^https?:\/\//.test(key) ? key : `unsplash/${key}`,
                storage_provider: "local",
                alt_text: `${input.title}, photo ${index + 1}`,
                sort_order: index,
                is_cover: index === 0,
              })),
            );
          }
          await trx("property_amenities").where({ property_id: row.id }).delete();
          const amenityRows = await trx("amenities").select("id", "slug");
          const ids = new Map(amenityRows.map((a) => [a.slug, a.id]));
          const links = (input.amenities ?? [])
            .map((name) => ids.get(AMENITY_SLUGS[name]))
            .filter(Boolean)
            .map((amenity_id) => ({ property_id: row.id, amenity_id }));
          if (links.length) await trx("property_amenities").insert(links);
          return { id: slug, status };
        });
      } catch (error) {
        if (error instanceof CatalogueError) throw error;
        logger.error({ err: error }, "Property update failed");
        throw unavailable();
      }
    },

    async archiveOwned(user, slug) {
      if (!useDatabase()) throw unavailable();
      try {
        const row = await db()("properties").select("id", "owner_user_id").where({ slug }).first();
        if (!row || (user.role !== "admin" && row.owner_user_id !== user.id)) {
          throw new CatalogueError(404, "PROPERTY_NOT_FOUND", "That property was not found in your listings.");
        }
        await db()("properties").where({ id: row.id }).update({ status: "archived", updated_at: new Date() });
        return { id: slug, status: "archived" };
      } catch (error) {
        if (error instanceof CatalogueError) throw error;
        throw unavailable();
      }
    },

    /* ---- recently viewed (customers) ---- */
    async recordView(userId, slug) {
      if (!useDatabase()) return;
      try {
        const row = await db()("properties").select("id").where({ slug, status: "published" }).first();
        if (!row) return;
        await db()("recently_viewed_properties")
          .insert({ user_id: userId, property_id: row.id, viewed_at: new Date() })
          .onConflict(["user_id", "property_id"])
          .merge(["viewed_at"]);
      } catch {
        /* best effort */
      }
    },

    async listRecent(userId) {
      if (!useDatabase()) throw unavailable();
      try {
        return await hydrate(
          await baseQuery()
            .join("recently_viewed_properties as rv", "rv.property_id", "p.id")
            .select(BASE_SELECT)
            .where({ "rv.user_id": userId, "p.status": "published" })
            .orderBy("rv.viewed_at", "desc")
            .limit(12),
        );
      } catch {
        throw unavailable();
      }
    },

    /* ---- saved properties (customers) ---- */
    async listSaved(userId) {
      if (!useDatabase()) throw unavailable();
      try {
        return await hydrate(
          await baseQuery()
            .join("saved_properties as s", "s.property_id", "p.id")
            .select(BASE_SELECT)
            .where({ "s.user_id": userId, "p.status": "published" })
            .orderBy("s.created_at", "desc"),
        );
      } catch {
        throw unavailable();
      }
    },

    async save(userId, slug) {
      if (!useDatabase()) throw unavailable();
      try {
        const row = await db()("properties").select("id").where({ slug, status: "published" }).first();
        if (!row) throw new CatalogueError(404, "PROPERTY_NOT_FOUND", "That property is not available.");
        await db()("saved_properties").insert({ user_id: userId, property_id: row.id }).onConflict(["user_id", "property_id"]).ignore();
        return { id: slug, saved: true };
      } catch (error) {
        if (error instanceof CatalogueError) throw error;
        throw unavailable();
      }
    },

    async unsave(userId, slug) {
      if (!useDatabase()) throw unavailable();
      try {
        const row = await db()("properties").select("id").where({ slug }).first();
        if (row) await db()("saved_properties").where({ user_id: userId, property_id: row.id }).delete();
        return { id: slug, saved: false };
      } catch {
        throw unavailable();
      }
    },

    async savedIds(userId) {
      if (!useDatabase()) return [];
      try {
        const rows = await db()("saved_properties as s")
          .join("properties as p", "p.id", "s.property_id")
          .select("p.slug")
          .where("s.user_id", userId);
        return rows.map((r) => r.slug);
      } catch {
        return [];
      }
    },
  };
}
