const roles = [
  { name: "customer", description: "Property seeker or buyer." },
  { name: "agent", description: "Approved property agent." },
  { name: "builder", description: "Approved property developer." },
  { name: "admin", description: "Marketplace administrator." },
];

const permissions = [
  { name: "property:read", description: "Read published property listings." },
  { name: "property:manage", description: "Manage owned property listings." },
  { name: "property:moderate", description: "Moderate property listings." },
  { name: "lead:read", description: "Read leads assigned to the user." },
  { name: "lead:manage", description: "Manage assigned leads and follow-ups." },
  { name: "lead:assign", description: "Assign leads to agents." },
  { name: "user:manage", description: "Manage marketplace user accounts." },
  { name: "subscription:manage", description: "Manage subscription plans." },
  {
    name: "content:manage",
    description: "Manage editorial content and banners.",
  },
  { name: "audit:read", description: "Read administrative audit records." },
];

const rolePermissions = {
  customer: ["property:read"],
  agent: ["property:read", "property:manage", "lead:read", "lead:manage"],
  builder: ["property:read", "property:manage", "lead:read", "lead:manage"],
  admin: permissions.map(({ name }) => name),
};

const amenities = [
  ["24-hour security", "24-hour-security", "security"],
  ["Clubhouse", "clubhouse", "community"],
  ["Covered parking", "covered-parking", "parking"],
  ["Fitness centre", "fitness-centre", "wellness"],
  ["Garden", "garden", "outdoor"],
  ["Power backup", "power-backup", "utilities"],
  ["Swimming pool", "swimming-pool", "wellness"],
  ["Visitor parking", "visitor-parking", "parking"],
];

const locations = [
  {
    name: "India",
    slug: "india",
    location_type: "country",
    country_code: "IN",
  },
  {
    name: "Karnataka",
    slug: "karnataka",
    location_type: "state",
    parent_slug: "india",
  },
  {
    name: "Maharashtra",
    slug: "maharashtra",
    location_type: "state",
    parent_slug: "india",
  },
  {
    name: "Bengaluru",
    slug: "bengaluru",
    location_type: "city",
    parent_slug: "karnataka",
  },
  {
    name: "Mumbai",
    slug: "mumbai",
    location_type: "city",
    parent_slug: "maharashtra",
  },
  {
    name: "Pune",
    slug: "pune",
    location_type: "city",
    parent_slug: "maharashtra",
  },
  {
    name: "Whitefield",
    slug: "whitefield",
    location_type: "locality",
    parent_slug: "bengaluru",
  },
  {
    name: "Bandra West",
    slug: "bandra-west",
    location_type: "locality",
    parent_slug: "mumbai",
  },
  {
    name: "Koregaon Park",
    slug: "koregaon-park",
    location_type: "locality",
    parent_slug: "pune",
  },
];

const plans = [
  {
    name: "Essentials",
    slug: "essentials",
    description: "A simple starting point for a small property portfolio.",
    billing_cycle: "monthly",
    price: "0.00",
    listing_limit: 3,
    features: JSON.stringify(["3 active listings", "Basic lead inbox"]),
  },
  {
    name: "Studio",
    slug: "studio",
    description: "More room for independent property professionals.",
    billing_cycle: "monthly",
    price: "2499.00",
    listing_limit: 20,
    features: JSON.stringify(["20 active listings", "Lead management"]),
  },
  {
    name: "Portfolio",
    slug: "portfolio",
    description: "A larger listing allowance for growing property teams.",
    billing_cycle: "monthly",
    price: "7999.00",
    listing_limit: 100,
    features: JSON.stringify(["100 active listings", "Team lead workflow"]),
  },
];


async function upsertRows(trx, table, conflictColumn, rows, mergeColumns) {
  await trx(table).insert(rows).onConflict(conflictColumn).merge(mergeColumns);
}

export async function seed(knex) {
  await knex.transaction(async (trx) => {
    await upsertRows(trx, "roles", "name", roles, [
      "description",
      "updated_at",
    ]);
    await upsertRows(trx, "permissions", "name", permissions, [
      "description",
      "updated_at",
    ]);

    const roleRows = await trx("roles").select("id", "name");
    const permissionRows = await trx("permissions").select("id", "name");
    const roleIds = new Map(roleRows.map((row) => [row.name, row.id]));
    const permissionIds = new Map(
      permissionRows.map((row) => [row.name, row.id]),
    );
    const mappings = Object.entries(rolePermissions).flatMap(([role, names]) =>
      names.map((permission) => ({
        role_id: roleIds.get(role),
        permission_id: permissionIds.get(permission),
      })),
    );

    await trx("role_permissions")
      .insert(mappings)
      .onConflict(["role_id", "permission_id"])
      .ignore();

    const locationIds = new Map();
    for (const location of locations) {
      const parentId = location.parent_slug
        ? locationIds.get(location.parent_slug)
        : null;
      if (location.parent_slug && !parentId) {
        throw new Error(
          `Demo location parent was not seeded: ${location.parent_slug}`,
        );
      }

      await trx("locations")
        .insert({
          name: location.name,
          slug: location.slug,
          location_type: location.location_type,
          country_code: location.country_code ?? null,
          parent_id: parentId,
          is_active: true,
        })
        .onConflict("slug")
        .merge([
          "name",
          "location_type",
          "country_code",
          "parent_id",
          "is_active",
          "updated_at",
        ]);
      const [row] = await trx("locations")
        .select("id")
        .where({ slug: location.slug });
      locationIds.set(location.slug, row.id);
    }

    await trx("amenities")
      .insert(
        amenities.map(([name, slug, category]) => ({
          name,
          slug,
          category,
          is_active: true,
        })),
      )
      .onConflict("slug")
      .merge(["name", "category", "is_active", "updated_at"]);

    await trx("subscription_plans")
      .insert(
        plans.map((plan) => ({
          ...plan,
          is_active: true,
          is_demo: false,
        })),
      )
      .onConflict("slug")
      .merge([
        "name",
        "description",
        "billing_cycle",
        "price",
        "currency",
        "listing_limit",
        "features",
        "is_active",
        "updated_at",
      ]);

  });
}
