# Real Estate Marketplace Project Plan

## Project goal

Build a premium, responsive Indian real-estate marketplace for discovering and
managing residential, luxury, commercial, rental, and new-project listings.
Customers will be able to search, save properties, make inquiries, and schedule
site visits. Agents, builders, and administrators will have role-appropriate
management tools.

This project is being built in verified, incremental stages. Phases 1 and 2
are complete. The user has explicitly changed the implementation sequence:
**complete the responsive frontend first, then the backend, then connect and
verify the database**. Proceed in that order and keep each increment working.
Do not claim the full stack works before integration is verified.

## Current status

- **Phase 1 — Architecture and project planning:** Complete.
- **Phase 2 — Application foundations:** Complete.
- **Current:** Responsive frontend implementation remains in progress. The shared navigation now has Home,
  About Us, Properties, and Contact Us; page containers and editorial imagery
  use consistent responsive sizing. Property search/detail pages use the
  versioned API's clearly labelled demo catalog, and the inquiry form exercises
  its preview-only response. Responsive customer account, agent/builder
  workspace, and admin moderation overview screens now expose their planned
  workflow areas as explicit UI previews. Profile and draft forms stay in
  current-page memory only; callback and site-visit controls exercise the
  preview inquiry API without contacting anyone or scheduling a visit.
- **Backend auth milestone:** Customer registration, login, logout, and current
  session endpoints have been implemented as a bounded backend foundation.
  Passwords use salted scrypt hashes; opaque session tokens are cookie-only
  secrets and database sessions store token digests. Registration assigns only
  the customer role. The frontend is not wired to these routes, and live MySQL
  integration has not been verified.
- **Not implemented:** profile management, saved/recent property records,
  persistent profiles/listing drafts/leads/visits, agent/builder authorization,
  real notifications, or moderation actions. Public preview routes grant no
  permissions and must not be treated as finished dashboard services.
- **Next:** Finish and verify the complete responsive frontend before extending
  backend workflows. The existing property and inquiry endpoints are preview
  APIs only: they read fixed demo data and do not persist inquiries. The
  customer-auth API requires the existing MySQL schema and customer role seed;
  neither has been verified against a live database, and auth returns 503 until
  those prerequisites are available.
- **Database status:** Three reversible MySQL migrations and demo/reference seed
  code are drafted but not applied. Local MySQL rejected the configured
  credentials, so schema application, seed verification, and live integration
  remain blocked until the local account is reset and verified.
- Rotate any password disclosed in chat and keep local credentials only in
  the Git-ignored `database/.env`.

## User-approved implementation order

1. **Responsive frontend first:** deliver the complete public, customer,
   agent, builder, and admin page/interaction surface, premium styling, motion,
   accessibility, and honest explicitly labelled local preview data. Preview
   behavior must never imply authentication, lead delivery, persistence,
   analytics, payment, or permissions that the API has not implemented.
2. **Backend second:** implement the authenticated, validated, authorized
   versioned API and tests. A bounded customer-auth slice is now implemented;
   remaining APIs must not silently succeed or fake persistence while MySQL is
   unavailable.
3. **Database third:** after backend foundations, finish local connection
   setup, apply/rollback migrations, seed demo/reference rows, verify
   constraints and repeatable seeding, and connect the backend to MySQL.
4. **Integration and quality:** wire the frontend to live endpoints and
   validate complete user journeys. Keep API-unavailable states visible until
   a journey is genuinely end to end.

This approved order supersedes any earlier Phase 3 → Phase 4 sequencing below;
preserve the original requirements while following the new order. Update this
plan as each stage completes.

## Proposed architecture

```text
Browser
  └── React + Vite SPA (JavaScript/JSX, React Router, Tailwind CSS)
        └── Axios → versioned Express REST API (/api/v1)
                         └── Knex query builder → MySQL
```

- Keep the frontend, backend, and database work in separate `frontend/`,
  `backend/`, and `database/` directories, each with its own `package.json`.
  Use npm workspaces at the root for shared installation and scripts.
- Use JavaScript ES modules throughout. Do not substitute TypeScript, Next.js,
  PostgreSQL, or another unapproved stack.
- Use React Router for page routing, reusable React components and contexts for
  shared UI/session state, and Axios services for API communication.
- Use Tailwind CSS with documented CSS variables/design tokens for brand
  colors, typography, spacing, borders, and responsive containers. Use custom
  CSS only where it improves maintainability or supports a required detail.
- Use Motion for React for restrained, accessible motion; respect
  `prefers-reduced-motion`.
- Use Express routes, controllers, services, validators, middleware, and
  centralized error handling. Keep authorization and validation on the server.
- Use Knex with the maintained `mysql2` driver for MySQL queries, migrations,
  and seeds. Bind user-provided values through Knex/parameterized queries;
  never interpolate request data into SQL strings.
- Use environment variables for secrets and optional providers. Cloudinary,
  maps, messaging, email, and Razorpay must be clearly marked unconfigured
  until credentials and server-side verification are in place.
- Prefer an opaque, HttpOnly session cookie with a MySQL-backed session store
  for browser authentication. Hash passwords with a suitable password-hashing
  library; never store plaintext passwords. Finalize dependency and cookie
  settings during the relevant implementation phases.
- Serve a health endpoint that reports application availability without
  exposing secrets. Database health must be reported separately and must not
  be faked when MySQL is unavailable.

## Proposed folder structure

```text
.
├── .github/
│   └── copilot-instructions.md
├── docs/
│   └── architecture.md
├── frontend/
│   ├── public/images/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       ├── utils/
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── utils/
│       ├── validators/
│       ├── app.js
│       └── server.js
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── knexfile.js
│   └── src/
│       └── index.js
├── .gitignore
├── package.json                       # npm workspaces and shared scripts
├── PROJECT_PLAN.md
└── README.md
```

Add tests alongside the relevant frontend/backend code. Add further folders
only when a concrete implementation need justifies them. Never commit actual
`.env` files, credentials, or user data.

## Design direction

- **Brand character:** Visually distinctive, editorial, and service-led: a
  polished Indian luxury-property journal rather than a crowded classifieds
  portal. The user specifically wants the eventual UI to feel very premium,
  attractive, and thoughtfully animated.
- **Palette:** Warm ivory and soft white for surfaces, charcoal for readable
  text, muted stone for secondary details, restrained antique gold for accents,
  and deep forest green as the signature interaction color.
- **Typography:** Pair an elegant, high-contrast display serif for selected
  editorial headings with a highly legible modern sans serif for navigation,
  forms, prices, and body copy. Keep functional information easy to scan.
- **Composition:** Generous whitespace, strong alignment, consistent
  responsive containers, large architectural photography, refined image
  ratios, delicate borders, and restrained card elevation.
- **Interaction:** Clear search modes (Buy, Rent, Commercial), practical
  filters, accessible forms, responsive navigation, and polished,
  scroll-triggered reveals and subtle hover/transition details. Motion should
  support hierarchy and orientation, respect reduced-motion preferences, and
  never delay essential content.
- **Imagery and trust:** Use relevant, properly licensed Indian property
  imagery. Provide meaningful alt text, loading/fallback states, and do not
  invent image URLs, property verification, RERA status, testimonials, or
  transaction claims. Seeded property listings must be marked as demo data.

## Database model (initial domain outline)

Use relational tables with foreign keys, indexes, timestamps, uniqueness where
appropriate, and constrained/validated status values. Final column definitions
and migrations are a Phase 3 deliverable.

| Domain                | Proposed entities and relationships                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity and access   | `users`; role/permission definitions or a constrained user role; `agent_profiles` and `builder_profiles` linked to users; sessions stored server-side           |
| Catalog               | `properties` linked to an owner/agent/builder and location; `property_images`; `amenities`; `property_amenities`; `locations` with parent/region relationships  |
| Customer activity     | `saved_properties`; `recently_viewed_properties`; both linked to users and properties with appropriate uniqueness and ownership checks                          |
| Leads and visits      | `leads`/inquiries linked to a property and customer; `lead_assignments`; `follow_up_activities`; `site_visits`; normalized contact/consent and lifecycle status |
| Commercial operations | `subscription_plans`; `subscriptions`; `payment_transactions`, with verified server-side payment state only                                                     |
| Editorial and trust   | `reviews`; `blog_posts`; `banners`; only publish verified claims and authorized content                                                                         |
| Governance            | `notifications`; `audit_logs` for important administrative and ownership actions                                                                                |

Sensitive customer data must be owner-scoped in backend queries. Agent/builder
property and lead actions must be checked against assigned ownership and
permissions. Administrative authorization must be server-side.

## Implementation phases and acceptance criteria

Each phase is a separate checkpoint. Keep the plan and README status current.
Unless a later scope change is approved, finish a phase's acceptance criteria
and report verification before moving to the next phase.

### Phase 1 — Inspect workspace and establish the plan (complete)

- Confirm the workspace contents before making changes.
- Create `PROJECT_PLAN.md`, `README.md`, and `.github/copilot-instructions.md`.
- Record architecture, stack, folder structure, MySQL entity outline, design
  direction, all phases, and measurable acceptance criteria.
- **Acceptance:** the three documents were present and consistent; no app,
  packages, database, or integrations were started during Phase 1.

### Phase 2 — Application foundations (complete)

- Create the separate React/Vite frontend and Express backend using JavaScript
  ES modules, plus a separate database package for Knex/MySQL migrations and
  seeds; manage the three packages as npm workspaces.
- Configure React Router, Tailwind, shared design-token foundation,
  environment examples, scripts, formatting/linting, smoke tests, and API
  health checks.
- Establish structured API logging, API error handling, secure
  CORS/security headers, request rate limiting, and development startup
  documentation.
- **Acceptance:** frontend and backend start using documented commands; SPA
  routing and not-found handling work; health endpoint reports API status and
  clearly identifies the database as not yet configured; frontend reaches the
  health endpoint through the development proxy; focused tests, lint, and
  frontend production build pass; example environment files contain no actual
  secrets. No schema, seed data, or live MySQL connection is included.
- **Verification:** `npm test`, `npm run lint`, `npm run format:check`,
  `npm run build`, and `npm audit` passed. Both development servers started;
  the health endpoint and Vite API proxy returned `status: ok` with
  `database: not_configured`; the browser rendered the home and not-found
  routes. No live MySQL check was run.

### Phase 3 — MySQL and persistence foundation

- Configure MySQL and Knex; create schema migrations, indexes, constraints,
  safe demo seeds, and database setup documentation.
- **Acceptance:** migrations compile, apply, and roll back as documented;
  seeds are repeatable and explicitly demo-labelled; `npm run db:check`
  verifies a real database connection; query values are parameterized.
- **Constraint:** a least-privilege MySQL account must authenticate
  successfully from `127.0.0.1` to the configured database before live
  migration and seed verification. Do not guess credentials or write secrets
  to source.
- **Sequencing:** although migration code and offline checks are prepared,
  live database setup and migration application are deferred until after
  backend implementation, per the user's approved order.
- **Verification so far:** migration compilation/rollback coverage, database
  config validation, API tests, workspace lint, formatting, and `npm audit`
  pass with zero dependency vulnerabilities. The local service listens on
  port 3306. The live connection check correctly rejected the configured
  credentials; no database migration or seed has been applied.

### Phase 4 — Shared design system

- Build reusable tokens, typography, buttons, inputs, navigation, footer,
  cards, responsive layouts, loading/empty/error states, and motion utilities.
- **Acceptance:** shared components are keyboard-usable and responsive; reduced
  motion is respected; no page-level duplication of shared primitives.

### Phase 5 — Homepage and public content

- Build the premium homepage and About, Contact, Locations, Blog, FAQ, Privacy,
  and Terms pages.
- **Acceptance:** content is polished and non-placeholder; navigation and
  forms have defined behavior; responsive and accessible states are checked.

### Phase 6 — Property discovery and search

- Build Buy, Rent, Commercial, Luxury, New Projects, and search/listing
  experiences with database-backed filters, sorting, pagination, favourites,
  and grid/list views.
- **Acceptance:** filter/sort/page operations use API results; loading, empty,
  and error states work; invalid filter input is validated server-side.

### Phase 7 — Property details

- Build galleries, property facts, amenities, description, agent/builder
  details, verified RERA data where available, map integration where
  configured, EMI calculator, similar listings, callback, and site-visit UI.
- **Acceptance:** displayed details come from API data; calculations are
  tested; unconfigured maps and unverifiable claims are not presented as live.
  Preview callback/site-visit choices may be exercised only as non-persistent
  demo requests until lead and scheduling APIs exist.

### Phase 8 — Authentication and customer dashboard

- **Implemented bounded milestone:** customer registration/login/logout/current
  session routes; scrypt password hashes; database-backed opaque-cookie
  sessions; customer-only role assignment and login; request validation and
  focused tests. This code uses the existing schema but live integration is
  pending the DB setup gate.
- Implement profile, saved/recent properties, inquiries, visits, and
  notifications; wire the frontend account pages to the API.
- **Acceptance:** passwords are hashed; sessions are protected; private records
  are owner-scoped and tested; unauthorized access is rejected by the API.
  Full dashboard acceptance remains pending until MySQL integration and the
  remaining owner-scoped workflows are implemented.

### Phase 9 — Leads, follow-ups, and notifications

- Implement callback/inquiry/WhatsApp handoff/site-visit lead capture, phone
  normalization, consent, deduplication, assignment, follow-up, and status
  tracking.
- **Acceptance:** valid leads persist even when external delivery is
  unavailable; duplicate submissions are controlled; integrations are clearly
  reported as unconfigured unless verified.

### Phase 10 — Agent and builder workspace

- Implement owned listing management, drafts, approval status, uploads, leads,
  visits, follow-ups, plan limits, and analytics.
- **Acceptance:** server enforces ownership, approval, and listing limits;
  upload provider absence is explicit; workflow states are covered by tests.

### Phase 11 — Administration

- Implement user/property moderation, approvals, leads, visits, plans,
  locations, amenities, banners, blogs, reviews, reports, and audit logs.
- **Acceptance:** all administrative endpoints require server-side
  authorization; important mutations are audited; non-admin access is tested.

### Phase 12 — External services and payments

- Add optional Cloudinary, maps, OTP/SMS/email/WhatsApp, subscriptions, and
  Razorpay in safe test configurations when credentials are supplied.
- **Acceptance:** absent credentials are documented and do not create
  success-shaped fake results; payment signatures and server-side payment
  states are verified.

### Phase 13 — Quality, security, and launch readiness

- Run unit, API, and feasible end-to-end tests; resolve bugs; check mobile,
  accessibility, performance, SEO, and security.
- **Acceptance:** relevant tests, lint, and production builds pass; critical
  flows and responsive layouts are verified; remaining limitations are listed.

### Phase 14 — Deployment and operations

- Document frontend/backend hosting, MySQL hosting, environment variables,
  migrations, backups, monitoring, and production verification.
- **Acceptance:** a clean deployment can be followed from documentation;
  secrets are supplied outside source control; backup and health procedures
  are explicit.

## Phase 1 completion checklist

- [x] Workspace inspected; no project files were present before documentation.
- [x] Architecture and implementation boundaries documented.
- [x] Frontend/backend folder structure proposed.
- [x] MySQL domain entities outlined.
- [x] Luxury design direction and trust/content constraints recorded.
- [x] Development phases and acceptance criteria documented.
- [x] Phase 2 approval gate stated.
