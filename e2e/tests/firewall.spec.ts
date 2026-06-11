import { test, expect } from '@playwright/test'

test.describe('Firewall (E2E-FW)', () => {
  test('renders all three firewall policies from mock data', async ({ page }) => {
    await page.goto('/dashboard/firewall')
    // All 3 mock policies must be visible
    await expect(page.getByText('Block Gaming Consoles')).toBeVisible()
    await expect(page.getByText('Pause Kids Devices')).toBeVisible()
    await expect(page.getByText('Guest Network Restrict')).toBeVisible()
  })

  test('toggle changes enabled state for Block Gaming Consoles', async ({ page }) => {
    await page.goto('/dashboard/firewall')

    // 'Block Gaming Consoles' starts enabled: true in mock data
    const toggle = page.getByRole('switch', { name: /Block Gaming Consoles/i })
    await expect(toggle).toBeChecked()

    // Click to disable
    await toggle.click()

    // UI should reflect disabled state after the SWR mutation resolves
    await expect(toggle).not.toBeChecked()
  })

  test('toggle changes enabled state for Pause Kids Devices', async ({ page }) => {
    await page.goto('/dashboard/firewall')

    // 'Pause Kids Devices' starts enabled: false in mock data
    const toggle = page.getByRole('switch', { name: /Pause Kids Devices/i })
    await expect(toggle).not.toBeChecked()

    // Click to enable
    await toggle.click()

    // UI should reflect enabled state after the SWR mutation resolves
    await expect(toggle).toBeChecked()
  })
})
