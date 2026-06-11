import { test, expect } from '@playwright/test'

test.describe('Dashboard (E2E-DASH)', () => {
  test('renders Network Clients heading', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Network Clients')).toBeVisible()
  })

  test('renders MacBook Pro (Work) from mock data', async ({ page }) => {
    await page.goto('/dashboard')
    // UNIFI_MOCK=true serves known clients; 'MacBook Pro (Work)' is mock-1.
    // The client table renders names in <td> cells — use cell role for the visible element.
    await expect(page.getByRole('cell', { name: 'MacBook Pro (Work)' })).toBeVisible()
  })

  test('shows High traffic status badge for MacBook Pro (Work)', async ({ page }) => {
    await page.goto('/dashboard')
    // mock-1 has downloadRate: 15_000_000 → trafficStatus: 'high' → badge text 'High'.
    // Target the badge inside the client table (inside a td), not the mobile card (hidden).
    await expect(
      page.getByRole('table').locator('[data-slot="badge"]').filter({ hasText: 'High' }).first()
    ).toBeVisible()
  })

  test('renders multiple clients from mock data', async ({ page }) => {
    await page.goto('/dashboard')
    // Assert a cross-section of mock clients are visible.
    // The client table renders names in <td> cells — use cell role for the visible element.
    await expect(page.getByRole('cell', { name: 'Smart TV' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Nintendo Switch' })).toBeVisible()
  })
})
