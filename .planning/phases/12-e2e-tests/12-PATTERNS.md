# Phase 12: End-to-End Tests - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 6 new files
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `e2e/playwright.config.ts` | config | request-response | `vitest.config.ts` | role-match (config, env block, test dir, setup registration) |
| `e2e/fixtures/auth.setup.ts` | fixture / setup-spec | request-response | `tests/middleware.test.ts` + `tests/auth.test.ts` | partial-match (auth flow, session validation) |
| `e2e/tests/auth.spec.ts` | test spec | request-response | `tests/middleware.test.ts` | role-match (auth redirect logic, unauthenticated/authenticated cases) |
| `e2e/tests/dashboard.spec.ts` | test spec | request-response | `tests/app/dashboard/page.test.tsx` | role-match (dashboard render, client list assertions) |
| `e2e/tests/firewall.spec.ts` | test spec | CRUD | `tests/integration/firewall-integration.test.tsx` | exact (toggle, PUT /api/firewall, UI state assertions) |
| `e2e/tests/insights.spec.ts` | test spec | request-response | `tests/components/insights/insights-shell.test.tsx` | role-match (page load, tab/navigation assertions) |

---

## Pattern Assignments

### `e2e/playwright.config.ts` (config, request-response)

**Analog:** `vitest.config.ts`

**Key parallel:** Both files are test-runner configs that (a) point to a test directory, (b) inject env vars for the server under test, (c) register setup/fixture files, and (d) resolve path aliases. The `playwright.config.ts` adds a `webServer` block and a `projects` array instead of `plugins`.

**Imports pattern** (`vitest.config.ts` lines 1-4):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
```
Playwright equivalent — named export, no React plugin needed:
```typescript
import { defineConfig } from '@playwright/test'
```

**Env block pattern** (`vitest.config.ts` lines 13-16):
```typescript
env: {
  SESSION_SECRET: 'test-secret-key-must-be-at-least-32-characters-long-for-hs256',
  NODE_ENV: 'test',
},
```
Playwright equivalent — env goes inside `webServer.env`, not `use`:
```typescript
webServer: {
  env: {
    UNIFI_MOCK: 'true',
    SESSION_SECRET: 'e2e-test-secret-key-must-be-at-least-32-chars',
    NODE_ENV: 'production',
  },
},
```

**Setup file registration** (`vitest.config.ts` line 9):
```typescript
setupFiles: ['./tests/setup.ts'],
```
Playwright equivalent — setup is a project, not a file:
```typescript
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  {
    name: 'chromium',
    use: { storageState: 'e2e/playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
```

**Test directory** (`vitest.config.ts` line 10):
```typescript
include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
```
Playwright equivalent:
```typescript
testDir: './e2e/tests',
```

**Full config structure to copy:**
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  baseURL: 'http://localhost:3001',
  use: {
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start -- -p 3001',
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

**Critical notes:**
- Port 3001 (not 3000) avoids conflict with a dev server
- `timeout: 180_000` required — `next build` takes 60-120s; Playwright default is 60s
- `reuseExistingServer: !process.env.CI` reuses an existing server locally but always starts fresh in CI

---

### `e2e/fixtures/auth.setup.ts` (fixture / setup-spec, request-response)

**Analog:** `tests/middleware.test.ts` (auth flow validation) and `tests/auth.test.ts` (login action testing)

**Key parallel:** `tests/middleware.test.ts` tests the same redirect logic that `auth.setup.ts` relies on — authenticated users reach `/dashboard`, unauthenticated users hit `/login`. `auth.setup.ts` exercises the real login form path that `tests/auth.test.ts` tests at the unit level.

**Import pattern** (`tests/auth.test.ts` lines 1-2):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
```
Playwright equivalent — `test as setup` aliases the runner function:
```typescript
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
```

**Auth validation pattern** (`tests/middleware.test.ts` lines 27-30 — authenticated user reaches dashboard):
```typescript
req.cookies.set('session', 'valid-token')
const response = await middleware(req)
expect(response.status).toBe(200)
```
Playwright equivalent — drive the real form, then assert URL:
```typescript
await page.goto('/login')
await page.getByLabel('Username').fill('admin')
await page.getByLabel('Password').fill('testpassword')
await page.getByRole('button', { name: 'Sign in' }).click()
await expect(page).toHaveURL('/dashboard')
```

**Session capture pattern** (no Vitest analog — Playwright-specific):
```typescript
const authFile = 'e2e/playwright/.auth/user.json'
// Ensure auth directory exists
fs.mkdirSync(path.dirname(authFile), { recursive: true })
// After successful login, save all cookies (including HTTP-only session cookie)
await page.context().storageState({ path: authFile })
```

**Full setup spec structure:**
```typescript
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'e2e/playwright/.auth/user.json'

setup('authenticate as admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })
  await page.goto('/login')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('testpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
  await page.context().storageState({ path: authFile })
})
```

---

### `e2e/tests/auth.spec.ts` (test spec, request-response)

**Analog:** `tests/middleware.test.ts`

**Key parallel:** `middleware.test.ts` tests the exact same behaviors — redirect to `/login` for unauthenticated access, redirect to `/dashboard` for authenticated access to `/login`, protect nested dashboard routes. The E2E version does this through a real browser instead of calling the middleware function directly.

**Test structure pattern** (`tests/middleware.test.ts` lines 15-17 — describe block with beforeEach):
```typescript
describe('Route Protection (AUTH-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
```
Playwright equivalent — no `beforeEach` needed for stateless navigation tests:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
```

**Unauthenticated redirect test** (`tests/middleware.test.ts` lines 19-29):
```typescript
it('redirects unauthenticated users from /dashboard to /login', async () => {
  const req = new NextRequest(new URL('http://localhost/dashboard'), { headers: new Headers() })
  const response = await middleware(req)
  expect(response.status).toBe(307)
  expect((response as NextResponse).headers.get('location')).toContain('/login')
})
```
Playwright E2E equivalent — new browser context without storageState means no session cookie:
```typescript
test('unauthenticated access to /dashboard redirects to /login', async ({ browser }) => {
  const context = await browser.newContext() // no storageState — no session cookie
  const page = await context.newPage()
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
  await context.close()
})
```

**Authenticated access test** (`tests/middleware.test.ts` lines 32-42):
```typescript
it('allows authenticated users to access /dashboard', async () => {
  req.cookies.set('session', 'valid-token')
  const response = await middleware(req)
  expect(response.status).toBe(200)
})
```
Playwright E2E equivalent — `storageState` is applied by the chromium project config; tests in `auth.spec.ts` that use the default `page` fixture are already authenticated:
```typescript
test('authenticated user reaches /dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByText('Network Clients')).toBeVisible()
})
```

**Logout test** (no direct Vitest analog — new behavior):
```typescript
test('logout clears session and redirects to /login', async ({ page }) => {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: /logout/i }).click()
  await expect(page).toHaveURL('/login')
  // Verify session is gone — navigating to /dashboard redirects back
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})
```

---

### `e2e/tests/dashboard.spec.ts` (test spec, request-response)

**Analog:** `tests/app/dashboard/page.test.tsx`

**Key parallel:** `page.test.tsx` verifies the dashboard renders a client list with initial data. The E2E version asserts the same rendered output through the browser, using mock data from `UNIFI_MOCK=true` (which has 6 known clients including 'MacBook Pro (Work)' with 'High' status per RESEARCH.md).

**Import pattern** (`tests/app/dashboard/page.test.tsx` lines 1-3):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
```
Playwright equivalent:
```typescript
import { test, expect } from '@playwright/test'
```

**Page navigation + assertion pattern** (`tests/app/dashboard/page.test.tsx` lines 53-55):
```typescript
render(await DashboardPage())
expect(screen.getByTestId('client-list')).toBeInTheDocument()
expect(screen.getByText(/ClientList rendered with 1 clients/)).toBeInTheDocument()
```
Playwright equivalent — `getByText` maps directly; `toBeVisible()` is the Playwright analog of `toBeInTheDocument()`:
```typescript
await page.goto('/dashboard')
await expect(page.getByText('MacBook Pro (Work)')).toBeVisible()
await expect(page.getByText('High')).toBeVisible()
```

**Section title assertion** (`tests/app/dashboard/page.test.tsx` lines 70-75):
```typescript
it('should display Network Clients heading', async () => {
  render(await DashboardPage())
  expect(screen.getByText('Network Clients')).toBeInTheDocument()
})
```
Playwright equivalent:
```typescript
test('dashboard shows Network Clients heading', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText('Network Clients')).toBeVisible()
})
```

**Full spec structure:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('renders Network Clients heading', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Network Clients')).toBeVisible()
  })

  test('renders at least one client from mock data', async ({ page }) => {
    await page.goto('/dashboard')
    // UNIFI_MOCK=true serves known mock clients
    await expect(page.getByText('MacBook Pro (Work)')).toBeVisible()
  })

  test('shows traffic status badge', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('High')).toBeVisible()
  })
})
```

---

### `e2e/tests/firewall.spec.ts` (test spec, CRUD)

**Analog:** `tests/integration/firewall-integration.test.tsx`

**Key parallel:** This is the strongest analog match. `firewall-integration.test.tsx` tests the same user flow: render the firewall page, assert rules are visible, click a toggle switch via `getByRole('switch')`, and verify the UI reflects the new state. The E2E version drives a real browser against a real server instead of MSW + RTL.

**Import pattern** (`tests/integration/firewall-integration.test.tsx` lines 1-8):
```typescript
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
```
Playwright equivalent — no server setup needed; webServer handles it:
```typescript
import { test, expect } from '@playwright/test'
```

**Toggle assertion pattern** (`tests/integration/firewall-integration.test.tsx` lines 219-231):
```typescript
// Find and click the toggle (it's a switch, not a button)
const toggle = screen.getByRole('switch', { name: /toggle test rule/i })
fireEvent.click(toggle)

// Verify PUT was called with correct payload
await waitFor(() => {
  expect(apiCalls.putCalls[0].body).toEqual({
    policyId: 'policy-test-1',
    enabled: false,
  })
})
```
Playwright equivalent — `getByRole('switch')` maps directly; Playwright auto-waits:
```typescript
const toggleLocator = page.getByRole('switch', { name: /Block Gaming Consoles/i })
await expect(toggleLocator).toBeChecked()
await toggleLocator.click()
await expect(toggleLocator).not.toBeChecked()
```

**Policy name assertions** (`tests/integration/firewall-integration.test.tsx` lines 100-102):
```typescript
await waitFor(() => {
  expect(screen.getByText('Rule 1')).toBeInTheDocument()
})
```
Playwright equivalent (using known mock data from `src/lib/unifi/mock.ts`):
```typescript
await page.goto('/dashboard/firewall')
await expect(page.getByText('Block Gaming Consoles')).toBeVisible()
```

**Full spec structure:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Firewall', () => {
  test('renders firewall policies from mock data', async ({ page }) => {
    await page.goto('/dashboard/firewall')
    // Mock data has 3 known policies — assert at least one
    await expect(page.getByText('Block Gaming Consoles')).toBeVisible()
  })

  test('toggle changes policy enabled state', async ({ page }) => {
    await page.goto('/dashboard/firewall')
    const toggleLocator = page.getByRole('switch', { name: /Block Gaming Consoles/i })
    const initialState = await toggleLocator.isChecked()
    await toggleLocator.click()
    await expect(toggleLocator).not.toBeChecked() // or .toBeChecked(), inverse of initial
  })
})
```

**Note on mock data names:** Read `src/lib/unifi/mock.ts` during planning to confirm exact policy names used in assertions — RESEARCH.md states 3 firewall policies exist but doesn't list all names.

---

### `e2e/tests/insights.spec.ts` (test spec, request-response)

**Analog:** `tests/components/insights/insights-shell.test.tsx`

**Key parallel:** `insights-shell.test.tsx` tests the same behaviors — page renders tab navigation, time-range tabs are present (5 min, 30 min, 1 hr, 7 days, 14 days, 30 days), and the page loads without crashing on empty data. The E2E version asserts these through a real browser.

**Import pattern** (`tests/components/insights/insights-shell.test.tsx` lines 1-4):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InsightsShell } from '@/components/insights/insights-shell'
```
Playwright equivalent:
```typescript
import { test, expect } from '@playwright/test'
```

**Tab rendering assertion** (`tests/components/insights/insights-shell.test.tsx` lines 50-57):
```typescript
it('renders all six time-range tabs', () => {
  render(<InsightsShell />)
  expect(screen.getByText('5 min')).toBeInTheDocument()
  expect(screen.getByText('30 min')).toBeInTheDocument()
  expect(screen.getByText('1 hr')).toBeInTheDocument()
  expect(screen.getByText('7 days')).toBeInTheDocument()
  expect(screen.getByText('14 days')).toBeInTheDocument()
  expect(screen.getByText('30 days')).toBeInTheDocument()
})
```
Playwright equivalent:
```typescript
test('insights page shows all time-range tabs', async ({ page }) => {
  await page.goto('/dashboard/insights')
  await expect(page.getByText('5 min')).toBeVisible()
  await expect(page.getByText('7 days')).toBeVisible()
  await expect(page.getByText('30 days')).toBeVisible()
})
```

**Section heading assertions** (`tests/components/insights/insights-shell.test.tsx` lines 118-122):
```typescript
it('renders Top Devices and Device Activity section headings', () => {
  render(<InsightsShell />)
  expect(screen.getByText('Top Devices')).toBeInTheDocument()
  expect(screen.getByText('Device Activity')).toBeInTheDocument()
})
```
Playwright equivalent:
```typescript
test('insights page renders Top Devices and Device Activity sections', async ({ page }) => {
  await page.goto('/dashboard/insights')
  await expect(page.getByText('Top Devices')).toBeVisible()
  await expect(page.getByText('Device Activity')).toBeVisible()
})
```

**Empty data graceful render** (`tests/components/insights/insights-shell.test.tsx` lines 124-127):
```typescript
it('does not crash when top-devices returns empty array', () => {
  setupSWR([], HOURLY_DATA)
  expect(() => render(<InsightsShell />)).not.toThrow()
})
```
Playwright equivalent — with an empty SQLite DB, page should load without error:
```typescript
test('insights page loads without error when DB is empty', async ({ page }) => {
  await page.goto('/dashboard/insights')
  // No uncaught exceptions or error boundaries triggered
  await expect(page).not.toHaveURL('/login') // not redirected
  await expect(page.getByText('Top Devices')).toBeVisible()
})
```

**Full spec structure:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Insights', () => {
  test('page loads and shows section headings', async ({ page }) => {
    await page.goto('/dashboard/insights')
    await expect(page.getByText('Top Devices')).toBeVisible()
    await expect(page.getByText('Device Activity')).toBeVisible()
  })

  test('shows all six time-range tabs', async ({ page }) => {
    await page.goto('/dashboard/insights')
    await expect(page.getByText('5 min')).toBeVisible()
    await expect(page.getByText('7 days')).toBeVisible()
    await expect(page.getByText('30 days')).toBeVisible()
  })

  test('tab click does not crash page', async ({ page }) => {
    await page.goto('/dashboard/insights')
    await page.getByText('5 min').click()
    await expect(page.getByText('Top Devices')).toBeVisible()
  })
})
```

---

## Shared Patterns

### Test import line

**Source:** All files in `tests/` — every file opens with the same pattern.

**Apply to:** All four `e2e/tests/*.spec.ts` files and `e2e/fixtures/auth.setup.ts`.

Vitest (all test files, line 1-2):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
```
Playwright equivalent (all E2E files):
```typescript
import { test, expect } from '@playwright/test'
// auth.setup.ts only:
import { test as setup, expect } from '@playwright/test'
```

### `getByRole('switch')` for toggles

**Source:** `tests/integration/firewall-integration.test.tsx` lines 224 and 259.

**Apply to:** `e2e/tests/firewall.spec.ts`

```typescript
// RTL (unit):
const toggle = screen.getByRole('switch', { name: /toggle test rule/i })
fireEvent.click(toggle)

// Playwright (E2E) — same selector, different assertion method:
const toggle = page.getByRole('switch', { name: /Block Gaming Consoles/i })
await toggle.click()
await expect(toggle).not.toBeChecked()
```

Playwright's `getByRole('switch')` maps directly from RTL's `getByRole('switch')`. The name filter uses the same accessible name pattern.

### `describe` → `test.describe` nesting

**Source:** All test files in `tests/` use nested `describe` blocks.

**Apply to:** All `e2e/tests/*.spec.ts` files.

```typescript
// Vitest (tests/middleware.test.ts lines 14-16):
describe('Route Protection (AUTH-04)', () => {
  beforeEach(() => { vi.clearAllMocks() })

// Playwright equivalent:
test.describe('Authentication', () => {
  // No beforeEach needed for stateless navigation — Playwright auto-waits
```

### `toBeInTheDocument()` → `toBeVisible()`

**Source:** Used in every unit/integration test in `tests/`.

**Apply to:** All `e2e/tests/*.spec.ts` files.

```typescript
// RTL (unit tests):
expect(screen.getByText('Network Clients')).toBeInTheDocument()

// Playwright equivalent — toBeVisible() includes existence + visibility:
await expect(page.getByText('Network Clients')).toBeVisible()
```

### Unauthenticated context pattern

**Source:** `tests/middleware.test.ts` lines 19-29 (no cookie set = unauthenticated).

**Apply to:** `e2e/tests/auth.spec.ts` (and any test needing to verify redirect behavior).

```typescript
// Vitest (middleware.test.ts): no cookie = no auth
const req = new NextRequest(new URL('http://localhost/dashboard'), { headers: new Headers() })

// Playwright equivalent: new context WITHOUT storageState = no session cookie
const context = await browser.newContext() // storageState NOT applied
const page = await context.newPage()
await page.goto('/dashboard')
await expect(page).toHaveURL('/login')
await context.close()
```

Note: The default `page` fixture in the chromium project automatically applies `storageState: 'e2e/playwright/.auth/user.json'`. To get an unauthenticated page, create a new context explicitly with `browser.newContext()`.

---

## No Analog Found

No files are completely without analogs. The Playwright `webServer` block and `storageState` mechanism are Playwright-specific with no Vitest parallel, but the RESEARCH.md `playwright.config.ts` code examples (lines 312-352) provide complete reference patterns for those sections.

---

## Metadata

**Analog search scope:** `tests/` (all 41 files scanned), `vitest.config.ts`, `package.json`
**Files scanned:** 43
**Pattern extraction date:** 2026-06-10
