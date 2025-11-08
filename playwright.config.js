/**
 * @fileoverview Playwright Test Configuration
 * @description Configuration for Playwright test runner with JSON reporter
 * @license GPL-3.0-or-later
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './ui-tests',

  // Test timeout
  timeout: 30 * 1000,

  // Global setup timeout
  globalTimeout: 60 * 60 * 1000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['list'], // Console output
    ['html', { outputFolder: 'playwright-report' }], // HTML report (separate from test-results)
    ['json', { outputFile: 'data/test-results/playwright-tests.json' }], // JSON for dashboard
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run ui:dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
