/**
 * Playwright config for screenshot capture (take-screenshots skill).
 * Inherits server setup from playwright.config.ts but points testDir at
 * the screenshots spec directory so it doesn't interfere with the normal suite.
 */
import { defineConfig } from '@playwright/test'
import baseConfig from './playwright.config'

export default defineConfig({
  ...baseConfig,
  testDir: './screenshots',
  projects: [
    { name: 'setup', testDir: './fixtures', testMatch: /auth\.setup\.ts/ },
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
