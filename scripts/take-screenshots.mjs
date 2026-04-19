/**
 * Captures app screenshots for the repo using a temporary test credential
 * injected via env — does NOT touch .env.local.
 *
 * Usage: node scripts/take-screenshots.mjs
 * Requires: dev server running on localhost:3000
 */

import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots')
mkdirSync(OUT_DIR, { recursive: true })

const BASE = 'http://localhost:3002'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
})
const page = await context.newPage()

async function shot(name) {
  const file = path.join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`  ✓ ${name}.png`)
  return file
}

async function login() {
  // Use dev test-session endpoint to bypass form (avoids React hydration timing issues)
  await page.goto(`${BASE}/api/test-session`, { waitUntil: 'networkidle' })
  // Should redirect to /dashboard
  if (!page.url().includes('/dashboard')) {
    throw new Error(`Login redirect failed — landed on: ${page.url()}`)
  }
}

console.log('Taking screenshots…\n')

// 1 — Login page
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await shot('01-login')

// Log in
await login()

// 2 — Dashboard (device list)
await page.waitForSelector('[data-testid="client-list"], main', { timeout: 8_000 })
await shot('02-dashboard')

// 3 — Firewall rules tab
await page.click('a[href*="firewall"], button:has-text("Firewall")', { timeout: 5_000 }).catch(() =>
  page.goto(`${BASE}/dashboard/firewall`, { waitUntil: 'networkidle' })
)
await page.waitForLoadState('networkidle')
await shot('03-firewall')

// 4 — Groups tab
await page.click('a[href*="groups"], button:has-text("Groups")', { timeout: 5_000 }).catch(() =>
  page.goto(`${BASE}/dashboard/groups`, { waitUntil: 'networkidle' })
)
await page.waitForLoadState('networkidle')
await shot('04-groups')

await browser.close()
console.log(`\nAll screenshots saved to docs/screenshots/`)
