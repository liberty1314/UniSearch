import { defineConfig, devices } from '@playwright/test';

const realE2EEnabled = process.env.UNISEARCH_REAL_E2E === '1';
const frontendBaseURL = process.env.UNISEARCH_FRONTEND_BASE_URL || 'http://127.0.0.1:4173';
const frontendURL = new URL(frontendBaseURL);
const frontendHost = frontendURL.hostname || '127.0.0.1';
const frontendPort = frontendURL.port || '4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: frontendBaseURL,
    trace: 'retain-on-failure',
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /real-backend\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testIgnore: /real-backend\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    ...(realE2EEnabled ? [
      {
        name: 'real-backend',
        testMatch: /real-backend\.spec\.ts/,
        use: { ...devices['Desktop Chrome'] },
      },
    ] : []),
  ],
  webServer: {
    command: `pnpm build && pnpm preview --host ${frontendHost} --port ${frontendPort} --strictPort`,
    url: frontendBaseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
