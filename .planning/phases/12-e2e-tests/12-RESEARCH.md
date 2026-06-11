# Phase 12: End-to-End Tests — Research

**Researched:** 2026-06-10
**Domain:** Playwright E2E testing, Next.js 16, mock HTTP server, JWT authentication
**Confidence:** HIGH (core stack), MEDIUM (mock UniFi server approach)

---

## Summary

Phase 12 adds browser-level E2E tests that run a real Next.js server and mock the UniFi API, giving confidence that all layers work together before each Docker deploy. The project already has `playwright` 1.59.1 installed (devDependency) — it includes the full test runner via `playwright/test`. Only `@playwright/test` (separate package at 1.60.0) is missing, but since the installed `playwright` package bundles its own test runner, the planner must decide whether to install `@playwright/test` separately or use the existing `playwright/test` import path.

The biggest design decision in this phase is **how to mock the UniFi API**. The app uses a `undici` `Agent` with `rejectUnauthorized: false` and dispatches requests directly — it does NOT respect `HTTP_PROXY` / `HTTPS_PROXY` env vars. The existing `UNIFI_MOCK=true` in-process mock (`src/lib/unifi/mock.ts`) is the cleanest available solution: setting `UNIFI_MOCK=true` in the `webServer` environment causes the Next.js server to use mock data for all UniFi calls without any network interception needed. A separate mock HTTP server would require patching `undici.Agent` or changing the application, both of which are invasive.

Authentication in E2E tests is handled via Playwright's `storageState` mechanism: a setup project mints a real JWT, sets it as an HTTP-only cookie via the login form flow, and saves browser state to `playwright/.auth/user.json`. All subsequent tests inherit this state. The app's `DEV_ADMIN_PASSWORD` plaintext env var shortcut (already in the auth action) makes this easy — no bcrypt hash needed in test env vars.

**Primary recommendation:** Use `UNIFI_MOCK=true` for the Next.js server in E2E tests. Install `@playwright/test` to match the standard import path. Use Playwright's setup-project auth pattern for session reuse. Use a temp SQLite path (`SQLITE_PATH=:memory:` or a temp file) per test run.

---

## Project Constraints (from CLAUDE.md)

- Tech stack: Next.js (full-stack) — confirmed on 16.2.3
- Auth: JWT via jose, HTTP-only cookies, `SESSION_SECRET` env var
- UniFi access: undici with scoped Agent (`rejectUnauthorized: false`), `UNIFI_MOCK=true` bypasses real calls
- SQLite via `better-sqlite3`, path controlled by `SQLITE_PATH` env var, defaults to `./data/snapshots.db`
- Test gating: `npx vitest run` must pass before commits; type check `npx tsc --noEmit` required
- Git author: `Faiser <keepbreakfastsimple@gmail.com>`
- No emojis in output

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| E2E test runner orchestration | CI / local shell | — | Playwright process manages browsers, server lifecycle |
| Next.js server under test | API / Backend | Browser / Client | `webServer` config starts real `next build && next start` |
| UniFi API mock | API / Backend (in-process) | — | `UNIFI_MOCK=true` routes to mock.ts inside Next.js server; no separate HTTP server needed |
| SQLite database (test) | API / Backend (in-process) | — | `SQLITE_PATH` env var points to isolated temp DB per run |
| Browser session / auth | Browser / Client | API / Backend | Playwright `storageState` carries HTTP-only JWT cookie |
| Login flow test | Browser / Client | API / Backend | Playwright drives real login form → Server Action → cookie |
| Dashboard assertions | Browser / Client | — | Playwright page assertions against rendered HTML |
| Firewall toggle assertions | Browser / Client | API / Backend | Click toggle → `PUT /api/firewall` → verify UI reflects state |
| Insights page assertions | Browser / Client | API / Backend (SQLite) | Page load → API reads SQLite snapshot data |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | 1.60.0 | E2E test runner | Official Playwright test runner — fixtures, webServer, storageState, parallel projects |
| `playwright` | 1.59.1 (already installed) | Browser engines | Chromium/Firefox/WebKit; `playwright/test` import works as runner fallback |

[VERIFIED: npm registry — `npm view @playwright/test version` returns `1.60.0`]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:http` (stdlib) | built-in | (Not needed) | Only if a separate UniFi mock server were required — it is not |
| `better-sqlite3` | already in deps | Test DB seeding | Use `SQLITE_PATH` to point at a fresh temp DB before each test run |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `UNIFI_MOCK=true` in-process | Separate mock HTTP server (Hono/Fastify) | Separate server eliminates UNIFI_MOCK flag but requires undici Agent reconfiguration — invasive |
| `UNIFI_MOCK=true` in-process | mockttp proxy | mockttp works via HTTP_PROXY env var — undici Agent ignores it; would require undici ProxyAgent injection — invasive |
| `UNIFI_MOCK=true` in-process | MSW + Next.js testProxy | `experimental.testProxy` is Next.js 15+ experimental, untested on 16.2.3; adds complexity |
| `next build && next start` | `next dev` | Dev mode is slower, HMR noise in tests, and production build catches compile errors; prefer production |
| Playwright setup project auth | Pre-signed JWT cookie in globalSetup | Both valid; setup project is idiomatic Playwright 1.x and runs under the same test lifecycle |

**Installation:**
```bash
npm install -D @playwright/test
# Install Chromium browser binary (already partially cached)
npx playwright install chromium
```

[VERIFIED: `playwright` 1.59.1 already in devDependencies. `@playwright/test` is a separate package at 1.60.0 — VERIFIED via `npm view`]

---

## Architecture Patterns

### System Architecture Diagram

```
[ Playwright test process ]
        |
        | (1) globalSetup: mint JWT, save storageState
        | (2) webServer: `next build && next start` with test env
        |
        v
[ Next.js server :3000 ] <---- UNIFI_MOCK=true (mock.ts, no HTTP)
        |                       SQLITE_PATH=/tmp/e2e-test.db (fresh)
        |                       SESSION_SECRET=<test key>
        |                       ADMIN_USER=admin
        |                       DEV_ADMIN_PASSWORD=testpassword
        |
        | serves pages + API routes
        v
[ Playwright Chromium browser ]
        |
        | storageState carries session cookie
        |
        +--> GET /dashboard         (assert client list renders)
        +--> GET /dashboard/firewall (assert policies render)
        +--> PUT /api/firewall       (toggle → assert UI updates)
        +--> GET /dashboard/insights (assert charts render)
        +--> GET /login              (assert redirect for unauthed)
```

### Recommended Project Structure
```
e2e/
├── playwright.config.ts        # webServer, projects, baseURL
├── global-setup.ts             # (optional) if globalSetup needed
├── fixtures/
│   └── auth.setup.ts           # Setup project: login → storageState
│   └── test-fixtures.ts        # Extended test with auth fixture
├── tests/
│   ├── auth.spec.ts            # Login, redirect, logout
│   ├── dashboard.spec.ts       # Dashboard loads, client list renders
│   ├── firewall.spec.ts        # Toggle rules, starred, schedule
│   └── insights.spec.ts        # Insights page loads, navigation
└── playwright/.auth/
    └── user.json               # Saved auth state (gitignored)
```

### Pattern 1: webServer Configuration (production build)
**What:** Playwright starts a `next build && next start` process before tests and waits for the health endpoint to respond.
**When to use:** Always — production build catches compile errors, mimics Docker deploy.

```typescript
// e2e/playwright.config.ts
// Source: https://playwright.dev/docs/test-webserver
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  baseURL: 'http://localhost:3001',
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start -- -p 3001',
    url: 'http://localhost:3001/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000, // build + start can take 2–3 minutes
    env: {
      UNIFI_MOCK: 'true',
      SQLITE_PATH: '/tmp/e2e-snapshots.db',
      SESSION_SECRET: 'e2e-test-secret-minimum-32-chars-here',
      ADMIN_USER: 'admin',
      DEV_ADMIN_PASSWORD: 'testpassword',
      FAMILY_USER: 'family',
      DEV_FAMILY_PASSWORD: 'familypass',
      NODE_ENV: 'production',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: 'e2e/playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
```

**Critical detail:** Use port 3001 (not 3000) to avoid conflicting with a running dev server on the developer's machine. [VERIFIED: Playwright `webServer` docs, `reuseExistingServer` pattern]

**Why port 3001:** `next start` default is 3000. If the dev server is running on 3000 and `reuseExistingServer: true`, Playwright would reuse it without the correct env vars (no `UNIFI_MOCK=true`). Using 3001 avoids this. [ASSUMED]

### Pattern 2: Auth Setup Project
**What:** A dedicated setup spec that logs in once via the real login form and saves the session cookie to disk. All other tests load this state and skip the login flow.
**When to use:** All tests that need an authenticated session.

```typescript
// e2e/fixtures/auth.setup.ts
// Source: https://playwright.dev/docs/auth
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('testpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
  // Saves cookies (including HTTP-only session cookie) to file
  await page.context().storageState({ path: authFile })
})
```

**Why this works:** `storageState()` captures HTTP-only cookies set by the server. The JWT session cookie is included even though JavaScript cannot access it. [VERIFIED: Playwright auth docs — storageState captures all cookies including httpOnly]

### Pattern 3: UNIFI_MOCK=true for Mock UniFi Data
**What:** The existing `src/lib/unifi/index.ts` checks `process.env.UNIFI_MOCK === 'true'` at module init and routes all UniFi calls to `mock.ts`. No network interception needed.
**When to use:** Always in E2E tests — do not point at a real UniFi console.

The mock data in `mock.ts` includes 6 clients (High/Medium/Low/Idle) and 3 firewall policies. E2E tests can assert against these known values. [VERIFIED: read src/lib/unifi/mock.ts]

**Pitfall to avoid:** `UNIFI_MOCK` is evaluated at module initialisation (server startup), not per-request. The env var must be set in `webServer.env`, NOT at the test level. [VERIFIED: src/lib/unifi/index.ts line 10]

### Pattern 4: Isolated SQLite Database
**What:** Set `SQLITE_PATH=/tmp/e2e-snapshots.db` in `webServer.env`. The file is created fresh at server start (the db module runs `CREATE TABLE IF NOT EXISTS`).
**When to use:** Every E2E run.

For Insights tests, the SQLite database starts empty. Options:
1. **Seed via API:** Call `/api/clients` once (which triggers `upsertLatestClients`) — this populates `latest_clients` but not `snapshots`.
2. **Accept empty state:** Insights page uses `snapshots` table for historical data. With an empty DB, top-devices and heatmap return empty arrays. The test can assert the page loads without error rather than asserting specific data values.
3. **Pre-seed with a script:** A `globalSetup` script can open the SQLite DB with better-sqlite3 and insert test snapshots before the server starts.

**Recommendation:** Pre-seed with globalSetup for Insights tests that need real data to render. Accept empty/zero state for smoke tests. [ASSUMED — needs validation during planning]

### Pattern 5: Test-Only E2E Script
Add `test:e2e` to `package.json` scripts:
```json
{
  "scripts": {
    "test:e2e": "playwright test --config e2e/playwright.config.ts",
    "test:e2e:ui": "playwright test --config e2e/playwright.config.ts --ui"
  }
}
```

### Anti-Patterns to Avoid
- **Using `next dev` instead of `next build && next start`:** Dev mode includes HMR, slower startup, and may not reflect production compilation errors.
- **Setting UNIFI_HOST to a real console IP in tests:** Tests would make real API calls, fail in CI, and depend on hardware availability.
- **Using `page.route()` to intercept UniFi calls:** `page.route()` only intercepts browser-initiated requests. UniFi calls originate from the Next.js server process — `page.route()` cannot see them.
- **Using `HTTP_PROXY` / `HTTPS_PROXY` env tricks:** The `undici.Agent` in `client.ts` ignores these — they only apply to Node.js's built-in `http`/`https` modules.
- **Sharing the default `./data/snapshots.db` between dev and test:** The recorder background interval will write to it during tests if `SQLITE_PATH` is not overridden.
- **Checking `playwright/.auth/user.json` into git:** Contains live session cookie; add to `.gitignore`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-side UniFi API mock | Custom HTTP server (Fastify/express) | `UNIFI_MOCK=true` flag already in codebase | Zero new deps; the mock already exists and is maintained; no network plumbing needed |
| Auth session for tests | Custom JWT signing in globalSetup | Playwright setup project + login form | Reuses real auth path; validates the actual login flow; simpler than hand-rolling JWT |
| Browser test assertions | Custom assertions | `@playwright/test` `expect` (web-first) | Auto-waits for elements; retry-on-failure built in |
| Parallel test isolation | Custom DB sharding | Single `SQLITE_PATH` temp file + sequential E2E | E2E tests run sequentially by default in one worker; SQLite file per run is sufficient |

**Key insight:** The app's existing `UNIFI_MOCK=true` path eliminates the need for any external mock server — which would be the most complex part of this phase if that switch didn't exist.

---

## Common Pitfalls

### Pitfall 1: webServer Build Timeout
**What goes wrong:** `next build` on a cold start takes 60–120+ seconds. Playwright's default webServer timeout is 60 seconds — the server never starts.
**Why it happens:** Playwright default `timeout` for webServer is 60 seconds. [VERIFIED: Playwright docs]
**How to avoid:** Set `timeout: 180_000` in the webServer config (3 minutes).
**Warning signs:** `Error: Timed out waiting for http://localhost:3001/api/health to return 2xx response`

### Pitfall 2: Port Conflict with Dev Server
**What goes wrong:** `reuseExistingServer: true` reuses a dev server on port 3000 that does NOT have `UNIFI_MOCK=true`. Tests hit real UniFi.
**Why it happens:** `reuseExistingServer` does not validate the server's env vars.
**How to avoid:** Use port 3001 (or 3002) for E2E. Only set `reuseExistingServer: !process.env.CI`.
**Warning signs:** Tests pass locally but fail in CI; real UniFi network traffic observed.

### Pitfall 3: UNIFI_MOCK Evaluated at Module Init
**What goes wrong:** Changing `UNIFI_MOCK` after server start has no effect — the module is already resolved.
**Why it happens:** `src/lib/unifi/index.ts` evaluates `process.env.UNIFI_MOCK` at import time, not per-request.
**How to avoid:** Always set it in `webServer.env`, never attempt per-test overrides.
**Warning signs:** Tests using real UniFi when UNIFI_MOCK appears to be set.

### Pitfall 4: Stale SQLite from Previous Run
**What goes wrong:** A DB file from a previous test run persists. Starred rules or cached clients from the last run affect next run's assertions.
**Why it happens:** `SQLITE_PATH=/tmp/e2e-snapshots.db` is not cleaned up between runs.
**How to avoid:** Either use `:memory:` (in-memory) — though this may not work with the recorder background interval — or delete the file in `globalSetup` before the server starts.
**Warning signs:** Flaky assertions on starred rules count or client counts.

**Note on `:memory:` SQLite:** The `getDb()` singleton returns the same connection within a process. An in-memory DB (`:memory:`) works correctly for a single server process but the recorder will write to it and tests can read from it. This is the cleanest isolation approach. [ASSUMED — needs validation that better-sqlite3 supports `:memory:` path correctly with the current schema]

### Pitfall 5: Login Form Uses Server Actions (not API route)
**What goes wrong:** Playwright test tries to call `/api/auth` or a REST endpoint for login — no such route exists.
**Why it happens:** Login is implemented as a Next.js Server Action in `src/app/actions/auth.ts`. There is no `/api/login` route.
**How to avoid:** Drive the login via the real form: `page.goto('/login')`, fill username/password fields, click submit. Playwright follows the redirect to `/dashboard` naturally.
**Warning signs:** `404` errors when test tries to POST to an auth API endpoint.

### Pitfall 6: HTTP-Only Cookie Not Captured in storageState
**What goes wrong:** Developer assumes `storageState` doesn't capture HTTP-only cookies.
**Why it happens:** Misunderstanding of `storageState` — it captures ALL cookies set by the server including HTTP-only ones.
**How to avoid:** No workaround needed. Call `page.context().storageState({ path: authFile })` after a successful login and the session cookie is included.
**Warning signs:** (This pitfall is a non-issue — just a common misconception.)

### Pitfall 7: Dashboard Page Uses verifySession (server-side redirect)
**What goes wrong:** An unauthenticated test navigates to `/dashboard` and gets a 307 redirect to `/login` mid-test.
**Why it happens:** `src/lib/dal.ts verifySession()` redirects server-side if no valid session cookie.
**How to avoid:** Ensure all tests that navigate to `/dashboard` load the `storageState`. The setup project pattern handles this via `dependencies: ['setup']`.
**Warning signs:** Tests fail with "Redirected to /login" instead of asserting dashboard content.

---

## Code Examples

### playwright.config.ts (full)
```typescript
// Source: https://playwright.dev/docs/test-webserver + https://playwright.dev/docs/auth
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  baseURL: 'http://localhost:3001',
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && PORT=3001 npm run start',
    url: 'http://localhost:3001/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      UNIFI_MOCK: 'true',
      SQLITE_PATH: '/tmp/e2e-snapshots.db',
      SESSION_SECRET: 'e2e-test-secret-key-must-be-at-least-32-chars',
      ADMIN_USER: 'admin',
      DEV_ADMIN_PASSWORD: 'testpassword',
      FAMILY_USER: 'family',
      DEV_FAMILY_PASSWORD: 'familypass',
      NODE_ENV: 'production',
    },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        storageState: 'e2e/playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
```

### auth.setup.ts (login once, save state)
```typescript
// Source: https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'e2e/playwright/.auth/user.json'

setup('authenticate as admin', async ({ page }) => {
  // Ensure auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/login')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('testpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard')

  // Save auth state including HTTP-only session cookie
  await page.context().storageState({ path: authFile })
})
```

### dashboard.spec.ts (sample assertions)
```typescript
// Source: Playwright docs patterns
import { test, expect } from '@playwright/test'

test('dashboard shows client list', async ({ page }) => {
  await page.goto('/dashboard')
  // Mock data has 6 clients — assert at least one renders
  await expect(page.getByText('MacBook Pro (Work)')).toBeVisible()
  await expect(page.getByText('High')).toBeVisible()
})

test('unauthenticated redirect to login', async ({ browser }) => {
  // Create a context WITHOUT storageState (no auth)
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
  await context.close()
})
```

### firewall.spec.ts (toggle test)
```typescript
import { test, expect } from '@playwright/test'

test('firewall toggle changes policy state', async ({ page }) => {
  await page.goto('/dashboard/firewall')

  // Mock data: 'Block Gaming Consoles' starts enabled
  const toggleLocator = page.getByRole('switch', { name: /Block Gaming Consoles/i })
  await expect(toggleLocator).toBeChecked()

  // Toggle off
  await toggleLocator.click()

  // UI should reflect disabled state after SWR mutation
  await expect(toggleLocator).not.toBeChecked()
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `playwright` as separate automation library | `playwright` package bundles test runner in `playwright/test` | v1.x unification | Can import from `playwright/test` without `@playwright/test` pkg, but `@playwright/test` is the official separate package |
| `globalSetup` for auth | Setup projects in `playwright.config.ts` | Playwright ~1.40 | Setup project runs under the same test lifecycle, better error reporting |
| MSW browser interception only | MSW + Next.js `experimental.testProxy` | Next.js 15 | Server-side request interception via proxy — but requires undici ProxyAgent; simpler is `UNIFI_MOCK=true` |
| `HTTP_PROXY` env var for server-side mocking | undici `ProxyAgent` | undici v5+ | Node.js fetch/undici requires explicit `ProxyAgent`; env var alone is ignored |

**Deprecated/outdated:**
- `globalSetup` file for auth: superseded by setup projects (still works, just less integrated)
- `playwright-ssr` package: community experiment, not widely maintained — avoid
- `next experimental-test` (Next.js 15): experimental, not production-ready for Next.js 16

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Playwright Chromium binary | E2E browser tests | ✓ | chromium-1223 | — |
| `playwright` npm package | Test runner | ✓ | 1.59.1 | — |
| `@playwright/test` npm package | Standard import path | ✗ | — | Use `playwright/test` import path (playwright pkg bundles it) |
| Node.js | Next.js server | ✓ | (in project) | — |
| `next build` capability | webServer startup | ✓ | 16.2.3 | — |
| `/tmp` write access | SQLite temp DB | ✓ (macOS/Linux) | — | Use `./e2e/.tmp/test.db` as fallback path |
| Port 3001 available | webServer | Likely ✓ | — | Configure alternate port |

[VERIFIED: `ls ~/.cache/ms-playwright` shows chromium-1223 and chromium_headless_shell-1223 installed]
[VERIFIED: `playwright` package 1.59.1 in devDependencies]
[VERIFIED: `node -e "const {test,expect} = require('playwright/test')"` succeeds]

**Missing dependencies with no fallback:**
- None that block execution.

**Missing dependencies with fallback:**
- `@playwright/test`: Use `playwright/test` import from the installed `playwright` package. Consider installing `@playwright/test@1.60.0` to match canonical import path.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.59.1 (`playwright/test` or `@playwright/test`) |
| Config file | `e2e/playwright.config.ts` — Wave 0 gap (does not exist) |
| Quick run command | `npx playwright test e2e/tests/auth.spec.ts --config e2e/playwright.config.ts` |
| Full suite command | `npx playwright test --config e2e/playwright.config.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| E2E-AUTH | Login redirects to dashboard; unauthenticated access redirects to login | e2e | `npx playwright test e2e/tests/auth.spec.ts` | ❌ Wave 0 |
| E2E-DASH | Dashboard renders client list with traffic status badges | e2e | `npx playwright test e2e/tests/dashboard.spec.ts` | ❌ Wave 0 |
| E2E-FW | Firewall page renders rules; toggle changes enabled state | e2e | `npx playwright test e2e/tests/firewall.spec.ts` | ❌ Wave 0 |
| E2E-INSIGHTS | Insights page loads without error, date range selector present | e2e | `npx playwright test e2e/tests/insights.spec.ts` | ❌ Wave 0 |
| E2E-HEALTH | `/api/health` returns `{ ok: true }` | smoke | included in webServer url check | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run` (existing unit suite — must stay green)
- **After E2E implementation:** `npx playwright test --config e2e/playwright.config.ts`
- **Phase gate:** Full Playwright suite green + Vitest suite green before marking phase complete

### Wave 0 Gaps
- [ ] `e2e/playwright.config.ts` — core config
- [ ] `e2e/fixtures/auth.setup.ts` — setup project login
- [ ] `e2e/playwright/.auth/` — directory + `.gitignore` entry
- [ ] `e2e/tests/auth.spec.ts` — E2E-AUTH
- [ ] `e2e/tests/dashboard.spec.ts` — E2E-DASH
- [ ] `e2e/tests/firewall.spec.ts` — E2E-FW
- [ ] `e2e/tests/insights.spec.ts` — E2E-INSIGHTS
- [ ] Install `@playwright/test`: `npm install -D @playwright/test`
- [ ] Add `test:e2e` script to `package.json`
- [ ] Add `e2e/playwright/.auth/` to `.gitignore`

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes — tested | E2E test validates login flow with real JWT session |
| V3 Session Management | yes — tested | Session cookie (HTTP-only) verified via storageState |
| V4 Access Control | yes — tested | Unauthenticated redirect test covers route protection |
| V5 Input Validation | no — unit tested | Zod validation tested at unit level |
| V6 Cryptography | no | JWT signing uses jose, tested at unit level |

**Test credential security:** `DEV_ADMIN_PASSWORD` in `playwright.config.ts` is plaintext. This is intentional (the auth action already supports plaintext dev passwords). The config file should NOT be committed with production passwords. The test passwords are test-only values. [VERIFIED: src/app/actions/auth.ts lines 48–50 show DEV_ADMIN_PASSWORD plaintext fallback]

---

## Open Questions

1. **`@playwright/test` vs `playwright/test` import path**
   - What we know: `playwright` 1.59.1 bundles a test runner at `playwright/test`; `@playwright/test` 1.60.0 is the canonical separate package at a newer version.
   - What's unclear: Whether the planner should install `@playwright/test` alongside `playwright`, or stay with `playwright/test`.
   - Recommendation: Install `@playwright/test@1.60.0` to match ecosystem conventions and get the latest version. The packages coexist cleanly.

2. **SQLite isolation: `:memory:` vs temp file**
   - What we know: `SQLITE_PATH` controls the path. The `getDb()` singleton creates the DB at startup.
   - What's unclear: Whether `:memory:` path works correctly with the recorder background interval and multi-table schema.
   - Recommendation: Use a temp file path `/tmp/e2e-snapshots.db` and delete it in a pre-test script or globalSetup. Safer than `:memory:` if the recorder uses multiple connections.

3. **Insights page E2E depth**
   - What we know: The Insights page reads from `snapshots` table (time-series). An empty DB will render the page but charts will show no data.
   - What's unclear: Whether the tests should seed snapshot data or just verify page load + empty state.
   - Recommendation: For Phase 12, assert page loads without error and navigation works. Defer data-seeded Insights assertions to a future phase.

4. **Next.js `start` command port override syntax**
   - What we know: `next start` accepts `-p PORT` or `PORT=XXXX` env var.
   - What's unclear: Whether `PORT=3001 npm run start` works or requires `npm run start -- -p 3001`.
   - Recommendation: Use `npm run start -- -p 3001` for explicit port override. [ASSUMED]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Port 3001 avoids conflict with dev server on 3000 | Patterns | Conflict if dev server also runs on 3001 — easily fixed by using 3002 or 3003 |
| A2 | `npm run start -- -p 3001` correctly overrides port in Next.js 16.2.3 | Code Examples | webServer never starts; test run hangs — use `PORT=3001 next start` as alternative |
| A3 | `:memory:` SQLite path causes issues with the recorder background interval | Open Questions | If wrong, `:memory:` is the cleanest option — just test it |
| A4 | Insights page renders empty state gracefully with zero snapshot rows | Open Questions | If it throws/crashes with empty data, seeds are needed before tests can pass |
| A5 | `playwright` package 1.59.1 test runner is compatible with `playwright.config.ts` webServer config | Stack | Runner version mismatch — mitigated by installing `@playwright/test@1.60.0` |

---

## Sources

### Primary (HIGH confidence)
- [Playwright docs — webServer configuration](https://playwright.dev/docs/test-webserver) — webServer config, gracefulShutdown, reuseExistingServer [VERIFIED: Context7 /microsoft/playwright.dev]
- [Playwright docs — Authentication](https://playwright.dev/docs/auth) — storageState, setup projects [VERIFIED: Context7 /microsoft/playwright.dev + WebFetch]
- [Next.js 16 docs — Playwright testing](https://nextjs.org/docs/app/guides/testing/playwright) — official guidance for Next.js + Playwright [VERIFIED: WebFetch, version 16.2.9]
- `src/lib/unifi/index.ts` — UNIFI_MOCK evaluated at module init [VERIFIED: codebase read]
- `src/lib/unifi/mock.ts` — mock data contents (6 clients, 3 policies) [VERIFIED: codebase read]
- `src/app/actions/auth.ts` — DEV_ADMIN_PASSWORD plaintext fallback [VERIFIED: codebase read]
- `node_modules/playwright/package.json` — version 1.59.1, bundles test.js [VERIFIED: filesystem read]

### Secondary (MEDIUM confidence)
- [mockttp article — undici ProxyAgent limitation](https://dev.to/playwright/mocking-server-side-http-in-playwright-with-mockttp-58jo) — "In-process apps need undici's ProxyAgent instead of env vars" [WebFetch verified]
- [Momentic — fetch mocking in Next.js](https://momentic.ai/blog/fetch-mocking-with-playwright-next-js) — MSW + testProxy approach described [WebFetch verified]
- [Max Schmitt — SSR request mocking](https://maxschmitt.me/posts/nextjs-ssr-request-mocking-playwright) — playwright-ssr approach (not recommended) [WebFetch verified]

### Tertiary (LOW confidence)
- npm view @playwright/test version → 1.60.0 [VERIFIED: npm registry]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `playwright` pkg confirmed installed; `@playwright/test` version verified via npm
- Architecture: HIGH — codebase read confirms UNIFI_MOCK path, undici Agent, session flow
- Mock UniFi approach: HIGH — existing mock.ts is correct choice given undici constraints
- Auth pattern: HIGH — Playwright storageState docs + session code verified
- SQLite isolation: MEDIUM — `:memory:` assumption unverified; temp file approach is safe default
- Pitfalls: HIGH — derived from codebase reading + Playwright docs

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (Playwright 1.x stable; Next.js 16 stable)
