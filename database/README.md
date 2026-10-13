# MySQL database workspace

This workspace owns MySQL connection settings, Knex migrations, repeatable
seeds, and database connectivity checks. It is separate from the React
frontend and Express backend.

## Configure local MySQL

Use MySQL 8. Create a dedicated local database and development/migration user
using MySQL Workbench or an administrator account. For an example SQL setup,
see the MySQL section in the root `README.md`. The local migration user needs
DDL and data permissions on this schema only; production deployments should
separate migration and runtime accounts.

Copy `.env.example` to `.env` and set the credentials for your local instance.
Keep `.env` local: it is ignored by Git. Never paste credentials into chat,
source files, shell history, or logs.

From the project root:

```powershell
Copy-Item .\database\.env.example .\database\.env
```

## Verify, migrate, and seed

Run these commands from the project root:

```powershell
npm run db:check
npm run db:migrate
npm run db:seed
```

`db:check` performs a live MySQL query and returns only the server version and
database name. Migrations are versioned and reversible. Seeds use unique keys
and upserts so the reference/demo data can be loaded repeatedly.

To reverse all applied migrations:

```powershell
npm run db:rollback
```

Rollback drops the project tables and their data. Use it only for a disposable
development database.

## Schema outline

Three ordered migrations explicitly create these InnoDB/MySQL tables:

1. Identity and catalog: `roles`, `permissions`, `role_permissions`, `users`,
   `user_roles`, `agent_profiles`, `builder_profiles`, `sessions`, `locations`,
   `amenities`, `properties`, `property_images`, and `property_amenities`.
2. Customer activity and leads: `saved_properties`,
   `recently_viewed_properties`, `leads`, `lead_assignments`,
   `follow_up_activities`, `site_visits`, and `notifications`.
3. Commercial, publishing, and governance: `subscription_plans`,
   `subscriptions`, `payment_transactions`, `reviews`, `blog_posts`, `banners`,
   and `audit_logs`.

Foreign keys protect ownership and relationships; enum status fields,
uniqueness constraints, and query-oriented indexes are included in the
migrations. A site visit uses a composite foreign key to ensure its selected
property matches the property on its lead. Passwords are represented only by
`password_hash`; no plaintext password or demo login is seeded. MySQL 8 check
constraints validate required contact methods, positive listing price/area,
floor ranges, visit/banner schedule ranges, and review ratings.

The repeatable seed adds role/permission reference data, an India location
hierarchy, amenity names, subscription plan examples, and three listings
explicitly marked `is_demo = true`. Listings are illustrative, have no
fabricated verification/RERA claim, and include no invented image URLs.

## Tests

```powershell
npm test --workspace @realestate/database
npm run lint --workspace @realestate/database
```

Migration tests compile MySQL create/drop DDL without opening a database
connection. This validates Knex syntax and table/rollback coverage, but does
not replace applying migrations to a real MySQL server. Run the commands above
with configured credentials for live integration verification.
