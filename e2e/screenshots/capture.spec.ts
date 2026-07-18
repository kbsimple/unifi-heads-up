/**
 * Screenshot capture suite — driven by the take-screenshots skill.
 *
 * Captures pages with realistic mock traffic data and writes them to
 * docs/screenshots/ for use in README.md and other docs.
 *
 * Run via:
 *   npx playwright test --config e2e/screenshot.config.ts
 *
 * Auth state from e2e/playwright/.auth/user.json is used for authenticated pages.
 */
import { test, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const OUT = path.resolve('docs/screenshots')
const VIEWPORT = { width: 1440, height: 900 }
const DB_PATH = process.env.SQLITE_PATH ?? '/tmp/e2e-snapshots.db'

// ── Seed the SQLite DB with 24h of realistic traffic ─────────────────────────
// Runs once before any page navigations so charts have data to display.
test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true })

  const db = new Database(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_mac TEXT NOT NULL,
      download_bps INTEGER NOT NULL,
      upload_bps INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_recorded_at ON snapshots (recorded_at);
    CREATE INDEX IF NOT EXISTS idx_snapshots_mac_at ON snapshots (client_mac, recorded_at DESC);
  `)

  const insert = db.prepare(
    'INSERT INTO snapshots (client_mac, download_bps, upload_bps, recorded_at) VALUES (?, ?, ?, ?)'
  )

  // 24 h of hourly snapshots per device — realistic but varied traffic curves
  const devices: Array<{ mac: string; baseDl: number; baseUl: number }> = [
    { mac: 'aa:bb:cc:dd:ee:01', baseDl: 15_000_000, baseUl: 2_000_000 }, // MacBook
    { mac: 'aa:bb:cc:dd:ee:02', baseDl: 2_000_000,  baseUl: 50_000    }, // Smart TV
    { mac: 'aa:bb:cc:dd:ee:03', baseDl: 500_000,     baseUl: 100_000   }, // Dad iPhone
    { mac: 'aa:bb:cc:dd:ee:04', baseDl: 300_000,     baseUl: 80_000    }, // Mom iPad
    { mac: 'aa:bb:cc:dd:ee:05', baseDl: 0,            baseUl: 0         }, // Ring Doorbell
    { mac: 'aa:bb:cc:dd:ee:06', baseDl: 3_500_000,   baseUl: 1_000_000 }, // Nintendo
  ]

  const now = Math.floor(Date.now() / 1000)
  const HOURS = 25  // slightly more than 24 h to fill the full window

  db.transaction(() => {
    for (const dev of devices) {
      for (let h = HOURS; h >= 0; h--) {
        // Add some sine-wave variation so the chart looks natural
        const phase = (h / HOURS) * Math.PI * 2
        const factor = 0.4 + 0.6 * Math.abs(Math.sin(phase + dev.mac.charCodeAt(15)))
        insert.run(
          dev.mac,
          Math.round(dev.baseDl * factor),
          Math.round(dev.baseUl * factor),
          now - h * 3600
        )
      }
    }
  })()

  db.close()
})

// ── Dashboard — client table ──────────────────────────────────────────────────
test('capture dashboard page', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('cell', { name: 'MacBook Pro (Work)' })).toBeVisible()
  await page.screenshot({ path: path.join(OUT, '01-dashboard.png') })
})

// ── Dashboard — device history expanded ──────────────────────────────────────
test('capture device activity chart', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('cell', { name: 'MacBook Pro (Work)' })).toBeVisible()

  // Expand the MacBook Pro row to show the traffic chart
  const macbookRow = page.getByRole('row', { name: /MacBook Pro/ })
  await macbookRow.getByRole('button', { name: 'View' }).click()

  // Wait for the chart to render with history data
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)  // let chart animate in
  await page.screenshot({ path: path.join(OUT, '02-device-activity.png') })
})

// ── Firewall rules ────────────────────────────────────────────────────────────
test('capture firewall page', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard/firewall', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Block Gaming Consoles')).toBeVisible()
  await page.screenshot({ path: path.join(OUT, '03-firewall.png') })
})

// ── Insights ──────────────────────────────────────────────────────────────────
test('capture insights page', async ({ page }) => {
  await page.setViewportSize(VIEWPORT)
  await page.goto('/dashboard/insights', { waitUntil: 'load' })
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT, '04-insights.png') })
})
