---
phase: 12-e2e-tests
plan: "01"
subsystem: e2e-testing
tags: [playwright, e2e, auth, testing]
dependency_graph:
  requires: []
  provides: [E2E-SETUP, E2E-AUTH]
  affects: [package.json, .gitignore, e2e/]
tech_stack:
  added:
    - "@playwright/test 1.60.0 (devDependency) — canonical Playwright test runner import path"
  patterns:
    - "Playwright setup project pattern: auth.setup.ts logs in once, saves storageState, all chromium tests inherit"
    - "UNIFI_MOCK=true in webServer.env — no external mock server needed, in-process mock handles UniFi calls"
    - "bcrypt ADMIN_PASSWORD in playwright.config.ts — production-mode server rejects DEV_ADMIN_PASSWORD plaintext"
key_files:
  created:
    - e2e/playwright.config.ts
    - e2e/fixtures/auth.setup.ts
    - e2e/tests/auth.spec.ts
    - e2e/playwright/.auth/.gitkeep
  modified:
    - package.json
    - .gitignore
decisions:
  - "baseURL placed in use object (not top-level) — TypeScript PlaywrightTestConfig types require it inside use.{}"
  - "ADMIN_PASSWORD uses bcrypt hash of testpassword — NODE_ENV=production server ignores DEV_ADMIN_PASSWORD plaintext"
  - "Port 3001 for E2E server — avoids collision with dev server on 3000 when reuseExistingServer is true"
  - "timeout: 180_000 — next build takes 60-120s; default 60s timeout too short"
metrics:
  duration: "301s (~5 min)"
  completed_date: "2026-06-11T00:58:22Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 12 Plan 01: Playwright E2E Infrastructure and Auth Tests Summary

**One-liner:** Playwright E2E foundation with form-based auth setup, storageState session reuse, and 4 auth flow specs covering authenticated access, unauthenticated redirects, and logout.

## What Was Installed and Created

### Installed
- `@playwright/test` 1.60.0 added to devDependencies — the canonical import path; re-exports everything from the `playwright/test` bundle already in the project

### Created
- `e2e/playwright.config.ts` — Playwright configuration with webServer (port 3001, 180s timeout), UNIFI_MOCK=true, bcrypt ADMIN_PASSWORD, reuseExistingServer for local dev, two projects: `setup` (auth) and `chromium` (depends on setup)
- `e2e/fixtures/auth.setup.ts` — Setup project: logs in via the real /login form, clicks "Sign in", awaits redirect to /dashboard, saves storageState (including HTTP-only session cookie) to `e2e/playwright/.auth/user.json`
- `e2e/tests/auth.spec.ts` — E2E-AUTH spec: 4 tests covering authenticated access, unauthenticated /dashboard redirect, unauthenticated /dashboard/firewall redirect, and logout
- `e2e/playwright/.auth/.gitkeep` — Placeholder to track auth directory in git without committing the session cookie file

### Modified
- `package.json` — Added `test:e2e` and `test:e2e:ui` scripts; all existing scripts preserved
- `.gitignore` — Added `e2e/playwright/.auth/user.json` and `e2e/test-results/`

## Auth Setup Pattern

The auth setup project (`auth.setup.ts`) works as follows:

1. Navigates to `/login`
2. Fills the Username field (via `page.getByLabel('Username')`) with `admin`
3. Fills the Password field with `testpassword`
4. Clicks `Sign in` button
5. Awaits redirect to `/dashboard` (login Server Action sets HTTP-only session cookie, then redirects)
6. Calls `page.context().storageState({ path: authFile })` — Playwright captures ALL cookies including HTTP-only session JWT cookie

The `chromium` project in `playwright.config.ts` sets `storageState: 'e2e/playwright/.auth/user.json'` and has `dependencies: ['setup']` — so the setup project always runs first and all chromium tests start authenticated.

## ADMIN_PASSWORD Bcrypt Hash

The bcrypt hash of 'testpassword' used in `e2e/playwright.config.ts`:

```
$2b$10$0kRkmW.i0.NzNhtOrI2D3eFj3zD3zjUeGgmKIlXxVdaNlqZnNle26
```

To regenerate if needed:
```javascript
const bcrypt = require('bcryptjs')
const hash = await bcrypt.hash('testpassword', 10)
console.log(hash) // generates a new hash (different salt each time, but same password)
```

**Why bcrypt hash instead of DEV_ADMIN_PASSWORD:** The webServer runs with `NODE_ENV: 'production'`. The auth action (`src/app/actions/auth.ts`) only accepts `DEV_ADMIN_PASSWORD` plaintext when `NODE_ENV === 'development'`. In production mode, only `ADMIN_PASSWORD` (bcrypt hash) is accepted.

## Running E2E Tests

```bash
npm run test:e2e          # Run all E2E tests (builds Next.js first)
npm run test:e2e:ui       # Interactive Playwright UI mode
```

First run takes 60-120+ seconds for `next build`. Subsequent local runs reuse the running server (`reuseExistingServer: !process.env.CI`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed baseURL placement in playwright.config.ts**
- **Found during:** Task 1 — `npx tsc --noEmit` revealed TS2769 error
- **Issue:** Plan template placed `baseURL` at the top level of `defineConfig()`. TypeScript types (`PlaywrightTestConfig = Config<PlaywrightTestOptions & ..., ...>`) require `baseURL` to be inside the `use` object — it is a `PlaywrightTestOptions` property, not a `TestConfig` property
- **Fix:** Moved `baseURL: 'http://localhost:3001'` inside the `use: {}` block
- **Files modified:** `e2e/playwright.config.ts`
- **Commit:** 7c1b557

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: credential_in_source | e2e/playwright.config.ts | ADMIN_PASSWORD bcrypt hash committed — accepted per T-12-04 (hash of known test-only password 'testpassword'; no production value) |

Note: T-12-02 (storageState cookie file) is mitigated — `e2e/playwright/.auth/user.json` is in `.gitignore`.

## Known Stubs

None — this plan creates test infrastructure, not UI components. No data flow stubs.

## Self-Check: PASSED

All files found on disk:
- FOUND: e2e/playwright.config.ts
- FOUND: e2e/fixtures/auth.setup.ts
- FOUND: e2e/tests/auth.spec.ts
- FOUND: e2e/playwright/.auth/.gitkeep

All commits verified in git log:
- FOUND: 7c1b557 (Task 1 — chore: install @playwright/test and scaffold E2E config)
- FOUND: eb06737 (Task 2 — feat: add auth E2E setup and auth spec)
