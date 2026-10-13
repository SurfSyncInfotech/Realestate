# Project instructions

## Project and phase boundaries

- This repository is a premium Indian real-estate marketplace.
- Follow `PROJECT_PLAN.md` as the source of truth for architecture, scope,
  sequence, and phase acceptance criteria. Use `docs/architecture.md` for
  current workspace boundaries and request flow. Keep the plan and README
  current as each phase is completed.
- Follow the user's latest approved implementation order: finish the responsive
  frontend first, then the backend, then live database setup/integration.
  Keep changes incremental and verified; do not claim full-stack functionality
  until it is truly connected end to end.
- Frontend preview data and interactions must be clearly identified as
  demonstration-only; never claim a form, favourite, account, lead, payment, or
  dashboard action was persisted or performed when its API is unavailable.
- Inspect existing files before changing them. Preserve user work and avoid
  overwriting files blindly.

## Required stack

- Use HTML5, React, JSX, JavaScript ES modules, CSS, Vite, React Router, and
  Tailwind CSS for the frontend.
- Use Node.js and Express.js with JavaScript ES modules for the backend.
- Use MySQL with Knex and `mysql2`; use migrations/seeds and parameterized
  queries.
- Use Axios for API calls, React Hook Form and Zod for suitable form
  validation, Motion for React for restrained animations, and Lucide React for
  icons where appropriate.
- Use Vitest/React Testing Library, Supertest, and Playwright for feasible
  coverage.
- Do not silently replace the specified stack with Next.js, TypeScript,
  PostgreSQL, or another technology.

## Architecture and code quality

- Keep frontend, backend, and database tooling in separate `frontend/`,
  `backend/`, and `database/` directories and npm workspace packages.
- Organize React pages, reusable components, hooks, services, context, and
  utilities by responsibility.
- Organize Express configuration, routes, controllers, services, middleware,
  validators, and utilities by responsibility.
- Validate all untrusted input at the API boundary. Centralize API errors and
  return honest status codes and actionable errors.
- Enforce authentication, ownership, and role permissions on the server.
- Bind all database input values through Knex or parameterized driver queries;
  never construct SQL by interpolating request values.
- Use database transactions for multi-step operations that must remain
  consistent. Add appropriate foreign keys, indexes, uniqueness constraints,
  timestamps, and validated status values.
- Avoid giant components, duplicated behavior, unnecessary dependencies,
  unsafe type escapes, broad catches, silent fallbacks, and fake persistence.
- Follow existing naming, formatting, and localization patterns. Add comments
  only when they clarify non-obvious behavior.

## Security, privacy, and external services

- Never commit secrets, real `.env` files, private keys, or customer data.
  Document variables using sanitized `.env.example` files.
- Hash passwords with a suitable password-hashing library; never store them in
  plaintext.
- Use secure session handling and appropriate cookie/security settings for the
  deployed environment.
- Scope customer data to its owner. Check agent/builder ownership and
  administrative permissions for every protected server-side operation.
- Treat Cloudinary, maps, OTP/SMS/email/WhatsApp, and Razorpay as unavailable
  until real credentials and integration behavior have been configured and
  verified.
- Verify payment signatures on the backend. Never accept a frontend redirect
  as payment proof.
- Keep lead persistence independent of optional notification delivery. Show
  unconfigured provider limitations explicitly.
- Mark seeded property data as sample/demo. Never invent verified status,
  RERA details, testimonials, image URLs, or business claims.

## UI, accessibility, and content

- Use the documented warm ivory, white, charcoal, muted stone, restrained
  antique gold, and deep forest-green design direction.
- The user wants the eventual UI to be especially premium, attractive, and
  polished, with tasteful, well-executed animations.
- Maintain shared design tokens, responsive layout conventions, typography,
  spacing, image ratios, and interaction patterns.
- Make controls keyboard-accessible, maintain readable contrast, provide
  meaningful image alt text, and implement loading, empty, error, success,
  unauthorized, and not-found states where relevant.
- Respect reduced-motion preferences. Animations must be restrained,
  performance-conscious, and must not delay essential content.
- Use only relevant, properly licensed property images; never hotlink invented
  or broken image URLs.
- Write polished, specific content. Do not use lorem ipsum, repetitive
  descriptions, or unsupported claims.

## Verification and reporting

- Run the smallest relevant existing checks for the changes made; add focused
  tests for behavior changes.
- Report commands and outcomes accurately. Never claim that a build, test,
  database, payment, or external integration succeeded unless it was actually
  verified.
- For documentation-only changes, verify the affected documents and links;
  do not invent application checks before an application exists.
- State known limitations and the next approval gate clearly.
