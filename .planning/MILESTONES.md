# Milestones

## v1.0 MVP — Shipped 2026-04-19

**Phases:** 1–4 | **Plans:** 16 | **Timeline:** 5 days (2026-04-14 → 2026-04-19)
**Files changed:** 178 | **LOC:** ~7,076 TypeScript/TSX

### Delivered

Full-stack Unifi Network Dashboard — real-time device traffic monitoring, firewall rule toggles, device groups, and 24-hour traffic history. Deployed on Vercel, authenticated with JWT sessions, powered by Unifi Site Manager Proxy.

### Key Accomplishments

1. Secure JWT authentication with middleware route protection and dark-themed login UI (Next.js 16 + shadcn/ui)
2. Real-time device traffic dashboard with SWR 60s polling, color-coded High/Medium/Low/Idle badges, responsive layout
3. Firewall rule management — view all rules, toggle on/off with optimistic UI and error feedback
4. Device groups with localStorage persistence, CRUD modals, and aggregated traffic status per group
5. 24-hour traffic history charts (Recharts) for site and individual clients via React context accumulation pattern
6. Full Vitest+RTL test suite covering all 5 UAT scenarios

### Known Deferred Items at Close: 4 (see STATE.md Deferred Items)

### Archive

- Roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Requirements: `.planning/milestones/v1.0-REQUIREMENTS.md`

---

## v1.1 Dev Mocking — Shipped 2026-04-19

**Phases:** 5 | **Plans:** 2 | **Timeline:** 1 day (2026-04-19)
**Files changed:** 9 | **Tasks:** 4

### Delivered

Full dev mock layer — `UNIFI_MOCK=true` facade activates 6 mock network clients and 3 firewall policies with in-memory toggle persistence. Routes unchanged; `dev.sh` wires mock mode automatically. 15 new tests (11 mock unit + 4 facade smoke).

### Key Accomplishments

1. Module-level UNIFI_MOCK facade (index.ts) — zero changes to real client.ts, clean production/dev separation
2. Mock data covering all 4 traffic bands (High/Medium/Low/Idle) with realistic names, MACs, IPs, and bytes/s
3. In-memory firewall toggle state persists across page refreshes within a dev session (resets on server restart)
4. `dev.sh` sets `UNIFI_MOCK=true` — no credentials required for local development
5. 15 new Vitest tests validating all 8 MOCK requirements; repaired 2 route test vi.mock targets

### Known Deferred Items at Close: 0

### Archive

- Roadmap: `.planning/milestones/v1.1-ROADMAP.md`
- Requirements: `.planning/milestones/v1.1-REQUIREMENTS.md`

---

## v4.0 Quality & Testing — Shipped 2026-06-11

**Phases:** 12 | **Plans:** 2 | **Tasks:** 4 | **Timeline:** 2 days (2026-06-10 → 2026-06-11)
**Files changed:** 18 | **LOC added:** ~2,099 insertions

### Delivered

Full Playwright E2E test suite — 15 browser-level tests (1 auth setup + 14 chromium) covering auth flows, dashboard mock data, firewall toggle mutations, and insights page rendering. Tests run against a real Next.js standalone server with `UNIFI_MOCK=true`, providing pre-deploy confidence that the full stack works together.

### Key Accomplishments

1. Playwright E2E infrastructure: `playwright.config.ts` with standalone webServer, bcrypt auth env, setup + chromium projects, `reuseExistingServer` for fast local iteration
2. Form-based auth setup: `auth.setup.ts` logs in once via real /login form, saves storageState (HTTP-only JWT cookie), all 14 chromium tests inherit the authenticated session
3. Auth flow tests: authenticated access to /dashboard, unauthenticated redirects from /dashboard and /dashboard/firewall, logout with post-logout session verification
4. Dashboard assertions: mock client names via `getByRole('cell')`, traffic status badges scoped to table via `[data-slot="badge"]` locator
5. Firewall toggle mutation E2E: `getByRole('switch')` selects both policies by name; toggle clicks verified against mock's module-level state through full browser → Next.js server → SWR mutation cycle
6. Insights page structural assertions: 6 time-range tabs visible, Top Devices section present — works with empty SQLite DB

### Known Deferred Items at Close: 23 (see STATE.md Deferred Items)

- 4 live-hardware UAT/verification gaps (Phases 06–07, require physical UniFi console — deferred since v2.0)
- 18 quick task status files missing (all tasks completed per STATE.md, status files never created)
- 1 todo: /api/statusz page UI enhancement (non-blocking)

### Archive

- Roadmap: `.planning/milestones/v4.0-ROADMAP.md`
