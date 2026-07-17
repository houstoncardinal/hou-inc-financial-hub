import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/launch',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8090',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 8090',
        url: 'http://127.0.0.1:8090',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
