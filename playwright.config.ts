import { env } from 'node:process'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(env.CI),
  retries: 0,
  workers: 2,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel: env.PLAYWRIGHT_CHANNEL,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !env.CI,
  },
})
