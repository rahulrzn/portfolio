import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 8000 },
  use: { baseURL: 'https://127.0.0.1:4173', ignoreHTTPSErrors: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/e2e-server.mjs --production',
    url: 'https://127.0.0.1:4173/api/health',
    ignoreHTTPSErrors: true,
    reuseExistingServer: process.env.PORTFOLIO_REUSE_TEST_SERVER === '1',
    timeout: 60000,
  },
  projects: [{ name: 'production-chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: [['list'], ['html', { open: 'never' }]],
});
