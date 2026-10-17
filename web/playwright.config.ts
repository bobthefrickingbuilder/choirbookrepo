import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the demo choir: chorister flows on a phone,
// staff flows on a tablet-sized screen, the dashboard on a laptop.
// BASE_URL picks the site: the local dev server by default, or a Vercel URL.
const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-CA',
    timezoneId: 'America/Toronto',
  },
  projects: [
    { name: 'phone', testMatch: /chorister\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'tablet', testMatch: /staff\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 }, hasTouch: true } },
    { name: 'laptop', testMatch: /dashboard\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
  ],
});
