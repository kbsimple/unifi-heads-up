import { test, expect } from '@playwright/test'

test.describe('Authentication (E2E-AUTH)', () => {
  test('authenticated user reaches /dashboard', async ({ page }) => {
    // The chromium project applies storageState automatically — this page is authenticated
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    // Verify dashboard content is present (not a redirect placeholder)
    await expect(page.getByText('Network Clients')).toBeVisible()
  })

  test('unauthenticated access to /dashboard redirects to /login', async ({ browser }) => {
    // Create a fresh context with an empty storageState to bypass the chromium project's
    // default storageState — no session cookie is sent, so the server redirects to /login
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
    await context.close()
  })

  test('unauthenticated access to /dashboard/firewall redirects to /login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/dashboard/firewall')
    await expect(page).toHaveURL('/login')
    await context.close()
  })

  test('logout clears session and redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    // Logout button renders as "Sign out" (from LogoutButton component)
    await page.getByRole('button', { name: /sign.?out/i }).click()
    await expect(page).toHaveURL('/login')
    // Verify session is cleared: navigating to /dashboard redirects back to /login
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
