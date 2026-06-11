---
phase: 12-e2e-tests
plan: "02"
subsystem: e2e-testing
tags: [playwright, e2e, dashboard, firewall, insights, testing]

# Dependency graph
requires:
  - phase: 12-e2e-tests/12-01
    provides: "Playwright config, auth setup fixture, auth.spec.ts, storageState infrastructure"
provides:
  - E2E-DASH: dashboard renders mock clients with traffic status badges (table cell assertions)
  - E2E-FW: firewall page renders all 3 policies, toggle changes enabled state end-to-end
  - E2E-INSIGHTS: insights page loads gracefully with empty SQLite DB, 6 time-range tabs visible
affects: [Phase 12 full suite, CI pre-deploy gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone Next.js E2E: build + copy static assets + node .next/standalone/server.js (next start incompatible with output: standalone)"
    - "Playwright cwd in webServer: use cwd: projectRoot (computed via __dirname) so command paths resolve from project root, not config file directory"
    - "Playwright setup project testDir override: set testDir on each project when fixtures are outside global testDir"
    - "Playwright storageState override for unauthenticated tests: pass { storageState: { cookies: [], origins: [] } } to browser.newContext() to bypass project-level storageState"
    - "Dashboard table vs card selectors: use getByRole('cell') for client names — card view is hidden at default viewport; table cells are visible"

key-files:
  created:
    - e2e/tests/dashboard.spec.ts
    - e2e/tests/firewall.spec.ts
    - e2e/tests/insights.spec.ts
  modified:
    - e2e/playwright.config.ts
    - e2e/tests/auth.spec.ts
    - e2e/tests/dashboard.spec.ts

key-decisions:
  - "Dashboard client name assertions use getByRole('cell') not getByText() — dashboard renders both a hidden mobile card (p element) and a visible desktop table (td element); .first() targets the hidden one"
  - "Auth unauthenticated tests pass explicit empty storageState to browser.newContext() — chromium project storageState is inherited by all new contexts unless explicitly overridden"
  - "Logout selector changed from /log.?out/i to /sign.?out/i — LogoutButton renders 'Sign out' text per AUTH-03 UI spec"
  - "playwright.config.ts testDir split: global ./tests for chromium project, ./fixtures for setup project — setup file lives outside testDir"
  - "webServer cwd set to projectRoot via __dirname to prevent path resolution from config file directory (e2e/) instead of project root"
  - "Standalone server startup: npm run build then node .next/standalone/server.js with cp of static assets — next start rejects output: standalone build"

patterns-established:
  - "E2E dashboard assertions: getByRole('cell', { name }) for client names, table-scoped badge locator for traffic status"
  - "E2E unauthenticated context: browser.newContext({ storageState: { cookies: [], origins: [] } }) to get truly unauthenticated browser"
  - "Standalone Next.js E2E start: build → cp -r .next/static .next/standalone/.next/static → cp -r public .next/standalone/public → PORT=N HOSTNAME=0.0.0.0 node .next/standalone/server.js"

requirements-completed: [E2E-DASH, E2E-FW, E2E-INSIGHTS]

# Metrics
duration: 9min
completed: "2026-06-11"
---

# Phase 12 Plan 02: Dashboard, Firewall, and Insights E2E Specs Summary

**Three user-flow E2E specs (dashboard, firewall, insights) verified against a real Next.js standalone server with UNIFI_MOCK=true; 15 tests (1 setup + 14 chromium) all passing including firewall toggle mutation through the full stack.**

## Performance

- **Duration:** 9 min (excluding ~4 min build time per run)
- **Started:** 2026-06-11T01:02:33Z
- **Completed:** 2026-06-11T01:12:25Z
- **Tasks:** 2
- **Files modified:** 5 (3 new spec files, 1 config fix, 1 auth spec fix)

## Accomplishments

- `dashboard.spec.ts`: 4 tests — heading, mock client name, High badge, multiple clients from UNIFI_MOCK data
- `firewall.spec.ts`: 3 tests — all 3 policy names visible, toggle policy-1 enabled→disabled, toggle policy-2 disabled→enabled
- `insights.spec.ts`: 3 tests — page load with section headings (even with empty SQLite DB), all 6 time-range tabs, tab click stability
- Fixed `playwright.config.ts` to use standalone server startup (was broken with `next start`), correct path resolution via `cwd: projectRoot`, and setup project `testDir` override
- Fixed `auth.spec.ts` (Plan 01): unauthenticated context override and logout selector

## Test Counts

| Spec file | Tests | Pass |
|-----------|-------|------|
| fixtures/auth.setup.ts | 1 setup | 1 |
| e2e/tests/auth.spec.ts | 4 | 4 |
| e2e/tests/dashboard.spec.ts | 4 | 4 |
| e2e/tests/firewall.spec.ts | 3 | 3 |
| e2e/tests/insights.spec.ts | 3 | 3 |
| **Total** | **15** | **15** |

## Task Commits

1. **Task 1: Write dashboard.spec.ts and firewall.spec.ts** - `414a892` (feat)
2. **Task 2: Write insights.spec.ts and run full Playwright suite** - `e01bef1` (feat)

## Files Created/Modified

- `e2e/tests/dashboard.spec.ts` — 4 E2E tests: Network Clients heading, MacBook Pro (Work) in table, High badge, Smart TV + Nintendo Switch
- `e2e/tests/firewall.spec.ts` — 3 E2E tests: all 3 mock policies, toggle Block Gaming Consoles, toggle Pause Kids Devices
- `e2e/tests/insights.spec.ts` — 3 E2E tests: section headings with empty DB, 6 time-range tabs, tab click stability
- `e2e/playwright.config.ts` — Fixed standalone server startup command, cwd for path resolution, testDir for setup project
- `e2e/tests/auth.spec.ts` — Fixed unauthenticated context (empty storageState override) and logout selector

## Decisions Made

- Dashboard client name assertions use `getByRole('cell')` — the dashboard renders both a hidden mobile card (`<p>`) and a visible desktop table (`<td>`); `.first()` targeted the hidden one
- Logout selector changed from `/log.?out/i` to `/sign.?out/i` — `LogoutButton` renders "Sign out" text per AUTH-03 UI spec
- Auth unauthenticated tests pass `{ storageState: { cookies: [], origins: [] } }` to `browser.newContext()` — the chromium project's storageState is inherited by all new contexts unless explicitly overridden with a clean state object
- `webServer.cwd` set to `projectRoot` via `path.resolve(__dirname, '..')` — Playwright resolves webServer command paths from the config file's directory (`e2e/`), not the project root
- Standalone server startup: `npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && PORT=3001 HOSTNAME=0.0.0.0 node .next/standalone/server.js` — `next start` rejects `output: 'standalone'` builds
- Setup project requires explicit `testDir: './fixtures'` — `auth.setup.ts` lives outside the global `testDir: './tests'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed standalone Next.js server startup in playwright.config.ts**
- **Found during:** Task 2 (running full Playwright suite)
- **Issue:** `npm run start` uses `next start` which exits with error when `output: 'standalone'` is configured in next.config.ts. WebServer process crashed immediately.
- **Fix:** Changed webServer `command` to build then start the standalone server: `npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && PORT=3001 HOSTNAME=0.0.0.0 node .next/standalone/server.js`. Also added `cwd: projectRoot` so paths resolve from project root (not config file directory).
- **Files modified:** `e2e/playwright.config.ts`
- **Committed in:** e01bef1 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed testDir causing setup project not to be found**
- **Found during:** Task 2 (first Playwright run — "Error reading storage state: ENOENT")
- **Issue:** Global `testDir: './e2e/tests'` was wrong (resolved to `e2e/e2e/tests` from config location). After fixing to `./tests`, the setup project at `fixtures/auth.setup.ts` was outside `testDir` so Playwright never ran it, leaving `user.json` absent.
- **Fix:** Changed global `testDir` to `'./tests'` and added `testDir: './fixtures'` to the setup project config.
- **Files modified:** `e2e/playwright.config.ts`
- **Committed in:** e01bef1 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed dashboard selector strict-mode violations**
- **Found during:** Task 2 (Playwright suite run — strict mode violations on getByText)
- **Issue:** `getByText('MacBook Pro (Work)')` matched both a hidden `<p>` (mobile card, display:none) and a visible `<td>` (desktop table). `page.getByText('High')` matched badge + tooltip text (3 elements). `getByText('Smart TV')` matched hidden card + visible table.
- **Fix:** Changed to `getByRole('cell', { name: ... })` for client names (directly targets table cells), and `page.getByRole('table').locator('[data-slot="badge"]').filter({ hasText: 'High' }).first()` for the badge.
- **Files modified:** `e2e/tests/dashboard.spec.ts`
- **Committed in:** e01bef1 (Task 2 commit)

**4. [Rule 1 - Bug] Fixed auth.spec.ts unauthenticated context and logout selector**
- **Found during:** Task 2 (Playwright suite run — auth tests failing)
- **Issue 1:** `browser.newContext()` without options inherits the chromium project's `storageState`, so the "unauthenticated" page was still authenticated. Required explicit empty storageState.
- **Issue 2:** Logout test used `/log.?out/i` but the `LogoutButton` component renders "Sign out" text.
- **Fix:** Pass `{ storageState: { cookies: [], origins: [] } }` to `browser.newContext()`; change logout selector to `/sign.?out/i`.
- **Files modified:** `e2e/tests/auth.spec.ts`
- **Committed in:** e01bef1 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes necessary for the suite to run and pass. No scope creep. Spec assertions are functionally equivalent to the plan's intent.

## Issues Encountered

- Next.js `output: 'standalone'` is incompatible with `next start` — required switching to `node .next/standalone/server.js` with static asset copy step (this is the standard Docker pattern per the project's Dockerfile)
- Playwright resolves `testDir`, `outputDir`, and `testMatch` relative to the config file's directory, but `storageState` in project configs is relative to the CWD where Playwright is invoked — required using `cwd` option and `__dirname` for reliable path resolution

## Known Stubs

None — all spec assertions target real data from UNIFI_MOCK=true mock data. No placeholder assertions.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundary changes introduced. Test files only.

## User Setup Required

None — the E2E suite runs entirely locally with mock data. No external service configuration required.

## Next Phase Readiness

- Phase 12 E2E suite is complete: `npm run test:e2e` exercises all major user flows (auth, dashboard, firewall toggle, insights) before each Docker deploy
- 15 tests pass (1 setup + 14 chromium): auth.spec.ts (4), dashboard.spec.ts (4), firewall.spec.ts (3), insights.spec.ts (3)
- `npx vitest run`: 319 unit tests remain green
- `npx tsc --noEmit`: no new errors introduced (pre-existing errors in unchanged files only)

---
*Phase: 12-e2e-tests*
*Completed: 2026-06-11*
