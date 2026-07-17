import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

/* Load .env into process.env for the launch tests. Vite only injects .env
   into the app bundle — Playwright reads plain process.env, so without this
   the authenticated/database tests would always skip even with credentials
   sitting in .env. Existing shell env vars win over .env values. */
try {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* no .env file — fine */ }

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
