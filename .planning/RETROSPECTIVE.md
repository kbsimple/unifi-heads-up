# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-19
**Phases:** 4 | **Plans:** 16

### What Was Built

- Secure JWT authentication with middleware route protection and dark-themed login UI
- Real-time device traffic dashboard with SWR 60s polling and color-coded status badges
- Firewall rule management — toggle on/off with optimistic UI and error feedback
- Device groups with localStorage persistence, CRUD modals, aggregated traffic status
- 24-hour traffic history charts (Recharts) for site and individual clients
- Full Vitest+RTL test suite covering all 5 UAT scenarios

### What Worked

- Phase-by-phase planning kept scope tight — no feature creep
- useRef accumulation pattern for traffic history was clean and avoided render churn
- Vitest+RTL automated all human UAT scenarios effectively, replacing manual testing
- yolo mode kept execution fast without approval gates
- shadcn/ui + Tailwind 4 gave a polished dark UI with minimal friction

### What Was Inefficient

- REQUIREMENTS.md traceability table was never updated during execution — created documentation debt resolved only at milestone close
- Quick task status files not written, causing false "missing" audit flags
- Phase 04 VERIFICATION.md left as human_needed with no follow-through

### Patterns Established

- Lazy JWT key encoding for Vitest env var timing
- jose mock in jsdom for edge-compatible crypto
- SWR double-mock pattern for context provider + inner consumer
- React context with useRef for polling-side-effect accumulation (no re-renders)
- ClientList split into Inner + wrapper for clean provider scoping

### Key Lessons

- Update REQUIREMENTS.md traceability during phase execution, not retroactively
- Write quick task STATUS.md files at task completion to avoid audit noise
- Human verification steps should be scheduled explicitly, not left as open items

---

---

## Milestone: v1.1 — Dev Mocking

**Shipped:** 2026-04-19
**Phases:** 1 (Phase 5) | **Plans:** 2

### What Was Built

- Module-level UNIFI_MOCK facade (index.ts) switching between mock and real client at module init
- mock.ts with 6 network clients (all 4 traffic bands) and 3 firewall policies with in-memory toggle state
- dev.sh wired with `UNIFI_MOCK=true` — no credentials required for local development
- 15 new Vitest tests: 11 mock unit tests (MOCK-04–08) + 4 facade smoke tests
- Repaired 2 route test vi.mock targets broken by the facade introduction

### What Worked

- Two-plan structure was exactly right — implementation (05-01) and tests (05-02) as separate units
- Facade pattern kept production code untouched — zero risk to real client
- Self-contained toggle tests (read/flip/assert/restore) avoided beforeEach complexity
- yolo mode + tight plan scope = ~18 min total execution for both plans

### What Was Inefficient

- Three pre-existing test failures (layout/page tests referencing `(dashboard)` path) were carried through both plans and only fixed at the very end — could have been caught and fixed in 05-01
- REQUIREMENTS.md traceability not updated during execution (same pattern as v1.0)

### Patterns Established

- Conditional re-export facade at index.ts for environment-switched implementations
- vi.mock hoisting with server-only + both client/mock modules to prevent real network access in tests
- Self-contained toggle test pattern: read → flip → assert → restore (no global state leakage)

### Key Lessons

- Fix obviously broken existing tests at the start of the phase, not the end — they cause noise throughout
- Update REQUIREMENTS.md traceability table during phase execution (still not doing this)

---

## Milestone: v4.0 — Quality & Testing

**Shipped:** 2026-06-11
**Phases:** 1 (Phase 12) | **Plans:** 2 | **Tasks:** 4

### What Was Built

- Playwright E2E infrastructure: `playwright.config.ts` with standalone Next.js webServer, setup + chromium projects, `reuseExistingServer` for fast local iteration
- Auth setup fixture: `auth.setup.ts` logs in via real /login form, saves storageState (HTTP-only JWT cookie) — all 14 chromium tests inherit auth without re-logging in
- 4 auth flow specs: authenticated access, two unauthenticated redirects, logout + post-logout session verification
- 4 dashboard specs: mock client table cell assertions, scoped traffic badge locator
- 3 firewall specs: policy visibility, toggle mutations (enabled→disabled and disabled→enabled) through full stack
- 3 insights specs: structural page load, 6 time-range tab presence, Top Devices section
- Total: 15 tests (1 setup + 14 chromium), all green; 319/319 unit tests remain green

### What Worked

- `UNIFI_MOCK=true` in webServer.env was the only viable mock strategy — undici.Agent ignores HTTP_PROXY, so in-process mock was the right and correct default
- Pre-computed bcrypt hash in playwright.config.ts was clean — no runtime bcrypt generation needed
- Wave-based planning (01: infrastructure, 02: flow tests) made execution incremental and debuggable
- `reuseExistingServer: !process.env.CI` provides fast local iteration after the first build
- Plan-checker blocker on missing `npx tsc --noEmit` in verify blocks caught a gap before execution started

### What Was Inefficient

- Multiple selector corrections during execution (logout text, dashboard client name, badge scoping) — these could have been researched in the research phase by reading the component source
- The webServer startup command is a long inline shell string — a small script would be more maintainable and testable independently
- Auth file path duplication (two hardcoded strings) was avoidable with a shared constants file

### Patterns Established

- Standalone Next.js E2E startup: `npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && PORT=N HOSTNAME=0.0.0.0 node .next/standalone/server.js`
- Unauthenticated Playwright context: `browser.newContext({ storageState: { cookies: [], origins: [] } })` — explicit empty override to bypass project-level storageState
- Dashboard table selectors: `getByRole('cell', { name })` for client names; `page.getByRole('table').locator('[data-slot="badge"]').filter({ hasText: X }).first()` for status badges
- Firewall switch selectors: `getByRole('switch', { name: /policy name/i })` — Radix Switch renders with correct role and accessible name

### Key Lessons

1. Read component source before writing selectors — auth.spec.ts logout selector would have been right first time if `LogoutButton.tsx` was read during research
2. `output: standalone` + Playwright webServer requires the static asset copy step — Next.js does not include `public/` or `.next/static/` in the standalone output automatically
3. `baseURL` must be inside `use: {}` in Playwright config, not top-level — the TypeScript types make this obvious if you read them, but the runtime error is confusing
4. bcrypt hash belongs in config, not computed at test runtime — pre-generate with a known plaintext and commit the hash

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | LOC | Req Coverage |
|-----------|--------|-------|------|-----|--------------|
| v1.0 MVP  | 4      | 16    | 5    | ~7,076 | 8/8 reqs |
| v1.1 Dev Mocking | 1 | 2 | 1 | ~9 files | 8/8 reqs |
| v4.0 Quality & Testing | 1 | 2 | 2 | ~2,099 insertions | 1/1 req (E2E coverage) |
