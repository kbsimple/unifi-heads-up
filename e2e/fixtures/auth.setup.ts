import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'e2e/playwright/.auth/user.json'

setup('authenticate as admin', async ({ page }) => {
  // Ensure the auth directory exists (in case .gitkeep was removed)
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/login')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('testpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // The login Server Action redirects to /dashboard on success
  await expect(page).toHaveURL('/dashboard')

  // Save ALL cookies (including HTTP-only session cookie) to disk.
  // storageState() captures HTTP-only cookies even though JS cannot access them.
  await page.context().storageState({ path: authFile })
})
