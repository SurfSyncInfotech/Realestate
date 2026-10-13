# Indian Real Estate Marketplace

A planned premium real-estate marketplace for Indian residential, luxury,
commercial, rental, and new-project listings. It will support property
discovery, customer inquiries and site visits, customer accounts, agent/builder
workflows, and administration.

## Project status

**Responsive frontend implementation in progress.** The shared navigation,
demo property browse/detail flow, customer/agent/builder workspace previews,
admin moderation overview, and preview-only inquiry/callback/site-visit
interactions are available. Dashboard forms only hold input in the open page;
they do not save records. A bounded customer registration/login/logout/current
session API now exists, but the frontend does not use it and it has not been
verified against a live MySQL database. Agent/builder authorization, saved/
recent properties, leads, visits, notifications, and moderation actions are
not implemented. The catalog API supplies fixed demo records and does not
persist inquiries. The project uses separate top-level
`frontend/`, `backend/`, and `database/` npm workspaces. Per the user-approved
order, finish and verify the frontend first, then implement backend APIs, then
connect and verify the MySQL database. Existing migration and demo-seed code
has not been applied to MySQL; authentication returns 503 until the existing
schema is applied and its customer role is seeded. See
[PROJECT_PLAN.md](./PROJECT_PLAN.md) for the architecture, design direction,
proposed database entities, complete phase sequence, and acceptance criteria.

## Proposed technology

- Frontend: HTML5, React, JavaScript ES modules, Vite, React Router, Tailwind
  CSS, Motion for React, Axios, React Hook Form, Zod, and Lucide React.
- Backend: Node.js and Express.js using JavaScript ES modules.
- Database: MySQL with Knex and the `mysql2` driver; schema changes managed by
  migrations and seeds, with parameterized values.
- Testing: Vitest and React Testing Library, Supertest, and Playwright for
  feasible critical end-to-end flows.
- Optional services: Cloudinary, maps, messaging/email/OTP, and Razorpay only
  when configured and verified with appropriate credentials.

## Project layout

```text
frontend/       React/Vite application
backend/        Express API and API tests
database/       Knex/MySQL config, migrations, and seeds
docs/           Architecture and technical documentation
.github/        Copilot project instructions
PROJECT_PLAN.md Phases and acceptance criteria
README.md       Setup and project overview
```

Each application area has its own `package.json`. The root `package.json`
defines npm workspaces and shared scripts; install dependencies once from the
project root. See [docs/architecture.md](./docs/architecture.md) for request
flow, package responsibilities, environment boundaries, and deferred features.

## Setup and run

Requirements: Node.js 22.12 or newer and npm. From the project root in
PowerShell:

```powershell
npm install
Copy-Item .\backend\.env.example .\backend\.env
```

Run the API and frontend in separate PowerShell terminals:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Open `http://localhost:5173`. The home screen checks the API through Vite's
development proxy. The API health endpoint is
`http://localhost:4000/api/v1/health`; the separate database health endpoint
is `http://localhost:4000/api/v1/health/database`. The preview catalog API is
available at `http://localhost:4000/api/v1/properties` and accepts demo
inquiries through `POST http://localhost:4000/api/v1/leads`. These endpoints
use the curated sample inventory and clearly flag preview-only responses; they
do not claim persistence or database connectivity. The backend `.env` file is
local-only and ignored by Git.

## Customer authentication API

The backend provides `POST /api/v1/auth/register`, `POST
/api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST
/api/v1/auth/logout`. Registration always grants only the customer role.
Passwords are stored as salted scrypt hashes; login issues a high-entropy,
HttpOnly, SameSite=Strict cookie while only its SHA-256 digest is stored in the
database session table. The cookie is Secure in production. Registration
creates an account but does not sign it in.

These endpoints require the MySQL settings in `database/.env`, the existing
migrations, and the customer role seed. If the database is missing or
unavailable, authentication fails closed with HTTP 503. Authentication is not
yet connected to frontend account pages and has not been tested against live
MySQL; passing backend tests use isolated repository/test doubles and do not
prove database integration.

## Phase 2 checks

Run from the project root:

```powershell
npm test
npm run lint
npm run format:check
npm run build
Invoke-RestMethod http://localhost:4000/api/v1/health
```

The last command requires the backend dev server to be running.

## MySQL setup (after backend implementation)

MySQL 8 is required. Create a local development database and a dedicated user
using MySQL Workbench or an administrator account. This local migration user
needs DDL and data permissions on this schema only; production deployments
should separate migration and runtime accounts. Example SQL (replace the
placeholder password locally; never commit or share it):

```sql
CREATE DATABASE realestate_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON realestate_dev.* TO 'realestate_app'@'127.0.0.1';
```

If the account already exists, `CREATE USER IF NOT EXISTS` does not change its
password. In Workbench, first inspect its configured host:

```sql
SELECT user, host
FROM mysql.user
WHERE user = 'realestate_app';
```

Then update the existing account, replacing `<host shown above>` with the
returned host and setting a **new, unique password** locally:

```sql
ALTER USER 'realestate_app'@'<host shown above>'
  IDENTIFIED BY '<new-unique-local-password>';
```

The password previously shared in chat is now disclosed; rotate it rather
than reusing it. Do not paste the replacement password into chat.

Copy the example settings and edit `database/.env` with the account you
created:

```powershell
Copy-Item .\database\.env.example .\database\.env
```

Then verify connectivity, apply migrations, and load safe reference/demo data:

```powershell
npm run db:check
npm run db:migrate
npm run db:seed
```

To remove the schema, `npm run db:rollback` reverses all migrations and drops
their tables and data. Run this only against a disposable development
database. Seeded property records are marked as demo, make no verification
claims, and include no fabricated image URLs.

Database migration DDL compiles and rollback coverage passes without a live
connection. A live connection attempt was rejected because the existing
MySQL account credentials do not authenticate; migration apply/rollback and
seed run remain unverified until the account password is reset and confirmed.

Latest Phase 2 verification: frontend/backend smoke tests, lint, formatting,
production build, and `npm audit` all passed. Both development servers started,
the API health response was observed directly and through the Vite proxy, and
the browser rendered the home and not-found routes.

## Security and data integrity

- Never commit `.env` files, credentials, private keys, or real customer data.
- Store all secrets in environment variables and provide safe `.env.example`
  files during implementation.
- Never store plaintext passwords or trust frontend-only authorization.
- Do not interpolate request data into SQL. Use parameterized query bindings.
- Do not describe sample listings as verified or present unconfigured external
  integrations as operational.
- Persist lead submissions even if optional notification providers have not
  been configured, and communicate that limitation honestly.

## Troubleshooting

- If port `4000` or `5173` is busy, stop the other local service using it and
  restart the corresponding dev command.
- If frontend status shows the API unavailable, confirm the backend started
  without configuration errors and that `backend/.env` has a valid port and
  `CORS_ORIGIN=http://localhost:5173`.
- npm workspaces resolve package dependencies from the repository root; run
  `npm install` there after changing a workspace's dependencies.
