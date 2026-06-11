import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/test-results',
  use: {
    baseURL: 'http://localhost:3001',
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
      SESSION_SECRET: 'e2e-test-secret-key-must-be-at-least-32-chars-ok',
      ADMIN_USER: 'admin',
      ADMIN_PASSWORD: '$2b$10$0kRkmW.i0.NzNhtOrI2D3eFj3zD3zjUeGgmKIlXxVdaNlqZnNle26',
      FAMILY_USER: 'family',
      FAMILY_PASSWORD: '$2b$10$0kRkmW.i0.NzNhtOrI2D3eFj3zD3zjUeGgmKIlXxVdaNlqZnNle26',
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
