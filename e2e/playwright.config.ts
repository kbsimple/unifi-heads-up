import { defineConfig } from '@playwright/test'
import path from 'path'

// Project root is one level up from this config file (which lives in e2e/)
const projectRoot = path.resolve(__dirname, '..')

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    // Build the standalone Next.js output, copy static assets, then start the server.
    // cwd is set to projectRoot so npm, .next, and public paths resolve correctly.
    command: 'npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && PORT=3001 HOSTNAME=0.0.0.0 node .next/standalone/server.js',
    cwd: projectRoot,
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
