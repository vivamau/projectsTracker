import { defineConfig } from '@playwright/test';

/**
 * QA Test Plan config - runs against already-running servers.
 * Backend: http://localhost:5000
 * Frontend: http://localhost:5173
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'qa-full.spec.js',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'qa-report', open: 'never' }],
  ],
  timeout: 30000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  // No webServer - we expect both servers to be already running
});
