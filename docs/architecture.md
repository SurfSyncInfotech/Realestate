# Application architecture

## Implementation order

The user approved completing the responsive frontend first, backend second,
and applying/integrating MySQL schema third. Existing migration and seed code
is not applied yet. UI may use clearly labelled preview data, but accounts,
lead submission, favourites, payments, and dashboards must not pretend to
persist or authorize actions before the backend and database are wired.

## Workspace boundaries

This is an npm-workspaces project with separate frontend, backend, and database
packages. Install dependencies once from the repository root.

| Directory   | Responsibility                                                              | Current phase status                                                               |
| ----------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `frontend/` | React/Vite single-page application, routing, Tailwind theme, and API client | Responsive navigation/layout and preview catalog/detail/inquiry flow in progress   |
| `backend/`  | Express REST API, request middleware, health route, and API tests           | Preview catalog/inquiry endpoints plus customer auth API; live database unverified |
| `database/` | Knex/MySQL config, migrations, seeds, connection check, and package export  | Schema prepared; live connection and migrations remain unverified                  |
| `docs/`     | Project architecture and technical documentation                            | Architecture recorded here                                                         |

The root `package.json` owns npm workspaces, common development scripts,
formatting, and the shared Oxlint executable. Workspace-specific runtime and
test dependencies stay in their owning package manifests.

## Request flow

```text
Browser
  └── React application (frontend/)
        └── Axios API client (/api/v1)
              └── Vite development proxy → http://localhost:4000
                    └── Express middleware → versioned routes (backend/)
                          ├── preview catalog routes → fixed demo data
                          └── customer auth routes → Knex/MySQL when configured
                                └── live schema/seed integration not verified
```

In production, the frontend API base URL can be set through
`VITE_API_BASE_URL`; the Vite proxy exists only for local development. The
backend serves `/api/v1/health` and `/api/v1/health/database`. API process
availability is separate from MySQL availability: the database endpoint
reports `not_configured` without local credentials, `ok` only after a live
query, and `unavailable` when a configured connection fails.

## Backend middleware and errors

The Express application applies Helmet security headers, a single configured
CORS origin, structured Pino HTTP logging, a JSON request-size limit, and
versioned API rate limiting. Unknown routes return a JSON `NOT_FOUND` error.
Unhandled server errors are logged and return a generic response rather than
exposing internal details. The database health route executes a real `SELECT
1` when configured. `POST /api/v1/auth/register`, `POST
/api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST
/api/v1/auth/logout` implement customer-only authentication using scrypt
password hashes and database-backed sessions. Opaque session cookie values are
not stored directly; the session table stores their SHA-256 digests. Auth
requests fail closed with HTTP 503 when database configuration or the migrated
schema/customer role is unavailable. These routes have not been verified
against live MySQL and are not yet wired to frontend account pages. Catalog and
inquiry-preview endpoints still use fixed demo records; they do not persist
property or lead data.

Logs omit authorization/cookie request headers and redact response
`Set-Cookie` values. Never include credentials, access tokens, or private
customer data in log messages.

## Database package

`database/knexfile.js` selects MySQL through `mysql2` for development, test, or
production configuration. It loads local settings from `database/.env`; keep
that file local and untracked. Knex migrations and repeatable demo-labelled
seed scripts are in `database/migrations/` and `database/seeds/`.
`npm run db:check` verifies the configured server and database before
migrations or seeds are run.

The catalog and inquiry endpoints use fixed in-memory demo records and must
not be described as live listings or persisted leads. The backend reuses the
database package's `createDatabase` factory for customer auth when configured.
Auth reads/writes use Knex bindings, registration and session creation use
transactions, and unavailable database state returns a safe service error.
Other persistence workflows remain deferred.

## Configuration

- `backend/.env.example` documents API port, allowed browser origin, log level,
  and rate-limit settings.
- `frontend/.env.example` documents the browser-safe API base URL. Variables
  prefixed with `VITE_` are public in compiled browser assets and must never
  contain secrets.
- `database/.env.example` documents local MySQL connection fields.
- Real `.env` files are ignored by Git. Use unique, least-privilege database
  credentials; never commit production secrets.

## Local startup and checks

Run `npm install` once from the repository root. Start the API and frontend in
separate terminals with `npm run dev:backend` and `npm run dev:frontend`.
Common checks are `npm test`, `npm run lint`, `npm run format:check`, and
`npm run build`. Database checks use `npm run db:check`, `npm run db:migrate`,
and `npm run db:seed` after configuring MySQL.

## Deliberately deferred

The database schema also reserves tables for property records, leads, and
customer activity. Authentication is limited to customer account creation and
sessions; profiles, saved/recent properties, lead workflows, agent/builder
permissions, notifications, dashboards, and external providers/payment
processing remain deferred. These capabilities must use real backend
authorization, validation, and storage when implemented; the preview does not
simulate them.
