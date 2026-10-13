# Login accounts and database setup

Real sign-in, saved properties, enquiries and agent listings all need MySQL.
There is one command for the whole setup.

## 1. One-time setup

```bash
npm run db:setup
```

It asks for your MySQL **root** password (typed hidden, used once, never
stored) and then:

1. creates the `realestate_dev` database and a dedicated `realestate_app` user
   with a random password,
2. writes `database/.env` (git-ignored),
3. creates every table (migrations),
4. loads roles, locations, plans and the property catalogue (seeds),
5. creates the **admin** and a sample **customer** account.

The sign-in details are written to **`database/.local-credentials.txt`**
(git-ignored, never printed). Open that file to see them. Run
`npm run db:accounts` any time to reset both passwords, or
`ADMIN_EMAIL=you@example.com npm run db:accounts` to use your own address.

Prefer to do it by hand? `database/scripts/setup-local-database.sql` does
step 1, then run `npm run db:migrate`, `npm run db:seed`, `npm run db:accounts`.

## 2. Run the site

```bash
npm run dev
```

starts the API (port 4000) and the website (port 5173) together. The site
needs the API running for sign-in, register, contact and enquiries.

## One SQL file

`database/realestate.sql` contains the whole schema, the reference data and the
property catalogue. Import it into any MySQL with
`mysql -u root -p < database/realestate.sql` (it creates `realestate_dev`),
then run `npm run db:accounts` for the logins.

## Where each person signs in

| Who | Page | Lands on | Can do |
| --- | --- | --- | --- |
| Visitor | `/` | public site | Search, properties, city guides, journal; send enquiries and messages |
| Customer | `/sign-in`, `/register` | `/user-dashboard` | Saved properties, My enquiries, profile |
| Agent / Builder | `/agent`, `/agent/register` | `/dashboard/agent` | Add properties (go to review), status of own listings |
| Admin | `/admin` | `/dashboard/admin` | Review listings, approve agents and builders, inbox of messages and enquiries |

Each sign-in page only accepts its own account type (a customer cannot sign in
at `/admin`).

**Partner workflow:** agent applies at `/agent/register` -> account is
`pending` -> admin approves it under *Agents & builders* -> agent signs in at
`/agent` -> adds a property (`pending`) -> admin approves and verifies it under
*Listings* -> it appears on the website. Admin-created listings publish at once.

- Anyone can create a **customer** account at `/register`; it never grants
  another role.
- Route guards in the browser send people to the right place; the API repeats
  every check (`401` signed out, `403` wrong role).
- Contact messages and property enquiries are stored in `contact_messages`.

## Business details

Phone, WhatsApp and address shown on Contact and in the footer come from
`frontend/src/data/site.js`. Empty fields are hidden.

## Not built yet

Payments and subscription plans, direct image upload (agents paste https image
links for now), and password reset by email.
