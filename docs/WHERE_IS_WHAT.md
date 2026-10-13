# Where is what — a guided tour

## Run it

```bash
npm run dev:backend    # API on http://localhost:4000 (demo catalogue, no DB needed)
npm run dev:frontend   # site on http://localhost:5173 (proxies /api to :4000)
```

## The three layers

| Layer | Folder | Status |
| --- | --- | --- |
| Frontend (React + Vite + Tailwind) | `frontend/` | Being completed first (current focus) |
| Backend (Express API `/api/v1`) | `backend/` | Preview catalogue + customer-auth foundation; 18 tests pass |
| Database (MySQL via Knex) | `database/` | Migrations and seeds drafted, **not applied** — local MySQL rejects the configured credentials |

## Frontend map (`frontend/src`)

| File | What it does |
| --- | --- |
| `main.jsx` | Entry. Loads `index.css` (legacy styles) then `styles/v2.css` (the new design layer, which wins). |
| `App.jsx` | All routes, plus `RevealManager` (scroll animations on every page). |
| `components/SiteLayout.jsx` | Header (descriptive navbar with the Properties mega-menu, mobile drawer, search) and footer. |
| `components/SmartImage.jsx` | Image that fades in when loaded and falls back to a local photo if the remote one fails. |
| `components/ListingCard.jsx` | Property card used on home and search. |
| `hooks/RevealManager.jsx` | Adds `.reveal` to sections/cards and `.is-visible` when they scroll into view. |
| `data/media.js` | **All luxury photography lives here** (Unsplash photo ids): hero slides, category tiles, city tiles. Swap an id to change a picture. |
| `data/listings.js` | Demo listings. |
| `pages/HomePage.jsx` | Hero carousel, search, categories, featured rail, cities, buyer journey, trust, agent/builder flow, journal carousel. |
| `pages/SearchPage.jsx`, `PropertyPage.jsx` | Listing search and property detail (gallery, EMI calculator, enquiry / callback / site-visit preview). |
| `pages/DashboardPage.jsx`, `UserDashboard.jsx`, `AgentDashboard.jsx` | Customer, agent/builder and admin workspaces (preview only). |
| `styles/v2.css` | Navbar `.nb-*`, home `.hm-*`, reveal motion, breakpoints. Section 5 holds responsive rules. |

## How the screenshots' workflow maps to code

| Workflow step | Where |
| --- | --- |
| Visitor → search (Buy/Rent/Commercial, location) | Home search panel → `/search` |
| Property listing + filters | `SearchPage.jsx`, `ListingCard.jsx` |
| Property details (gallery, EMI, schedule visit, callback) | `PropertyPage.jsx` |
| Lead generation (enquiry → lead → agent) | Enquiry form → `POST /api/v1/leads` (preview: not stored) |
| User dashboard | `/user-dashboard`, `/dashboard/customer` |
| Agent/Builder panel | `/dashboard/agent`, `/dashboard/builder`, `AgentDashboard.jsx` |
| Monetisation (plan → payment → verify → publish) | Shown as a planned flow on the home page; no payments exist yet |

## Honest status

Nothing is persisted yet: enquiries, favourites, visits and listings are preview-only until the database is connected.
