import { test, expect } from '@playwright/test'

test.describe('Insights (E2E-INSIGHTS)', () => {
  test('page loads without error and shows section headings', async ({ page }) => {
    await page.goto('/dashboard/insights')

    // Must not be redirected to /login (auth is valid)
    await expect(page).toHaveURL('/dashboard/insights')

    // Section headings present even with empty SQLite DB
    await expect(page.getByText('Top Devices')).toBeVisible()
    await expect(page.getByText('Device Activity')).toBeVisible()
  })

  test('shows all six time-range tabs', async ({ page }) => {
    await page.goto('/dashboard/insights')

    // Exact tab text from insights-shell.test.tsx assertions
    await expect(page.getByText('5 min')).toBeVisible()
    await expect(page.getByText('30 min')).toBeVisible()
    await expect(page.getByText('1 hr')).toBeVisible()
    await expect(page.getByText('7 days')).toBeVisible()
    await expect(page.getByText('14 days')).toBeVisible()
    await expect(page.getByText('30 days')).toBeVisible()
  })

  test('tab click does not crash page', async ({ page }) => {
    await page.goto('/dashboard/insights')

    // Click a tab and confirm the page still renders correctly
    await page.getByText('7 days').click()

    // Section headings must still be present after tab selection
    await expect(page.getByText('Top Devices')).toBeVisible()
    await expect(page.getByText('Device Activity')).toBeVisible()
  })
})
