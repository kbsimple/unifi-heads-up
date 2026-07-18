/**
 * Screenshot capture suite — driven by the take-screenshots skill.
 *
 * Captures four pages (login, dashboard, firewall, insights) with mock data
 * and writes them to docs/screenshots/ for use in README.md and other docs.
 *
 * Run via:
 *   npx playwright test --config e2e/playwright.config.ts e2e/screenshots/capture.spec.ts
 *
 * Auth state from e2e/playwright/.auth/user.json is used for authenticated pages;
 * the login page is captured in a fresh context before auth.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve('docs/screenshots')
const VIEWPORT = { width: 1440, height: 900 }

// Ensure output directory exists
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }))

// ── Login page (unauthenticated) ─────────────────────────────────────────────
// Explicitly clear storageState so middleware sees no session and serves /login.
const loginTest = test.extend<{ page: import('@playwright/test').Page }>({
  page: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      storageState: { cookies: [], origins: [] },
    })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
})

loginTest('capture login page', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'load' })
  await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 })
  await page.screenshot({ path: path.join(OUT, '01-login.png') })
})

// ── Authenticated pages ──────────────────────────────────────────────────────
test('capture dashboard page', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  // Wait for the client table to be populated
  await expect(page.getByRole('cell', { name: 'MacBook Pro (Work)' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT, '02-dashboard.png') })
})

test('capture firewall page', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard/firewall', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  // Wait for at least one firewall rule card
  await expect(page.getByText('Block Gaming Consoles')).toBeVisible()
  await page.screenshot({ path: path.join(OUT, '03-firewall.png') })
})

test('capture insights page', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard/insights', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT, '04-insights.png') })
})
