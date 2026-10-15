import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 7 suites (e2e/matrix): full flow matrix, validation paths, copy checks, admin e2e,
 * screenshots, Lighthouse. Run with `npm run e2e:matrix` (see e2e/matrix/run-matrix.mjs).
 *
 * Environment knobs:
 *   PORT              dev server port (default 3100; an already running server is reused)
 *   MATRIX_WORKERS    parallel workers (default 4)
 *   MATRIX_OUTPUT     Playwright output dir (default ./test-results/matrix)
 *
 * The desktop project (1440px) runs EVERYTHING; the mobile project (390px) runs only the tests tagged
 * @mobile (the flow-matrix cases flagged `mobile` in e2e/matrix/cases.ts, plus the screenshot and
 * validation specs). Tests tagged @serial mutate public offers/suppliers and run alone, after the
 * parallel phase (run-matrix.mjs), so they cannot disturb the price/order assertions of the matrix.
 */
const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e/matrix",
  testMatch: /.*\.spec\.ts$/,
  outputDir: process.env.MATRIX_OUTPUT ?? "./test-results/matrix",
  globalSetup: "./e2e/matrix/global-setup.ts",
  fullyParallel: true,
  workers: Number(process.env.MATRIX_WORKERS ?? 4),
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: process.env.MATRIX_JSON ?? "test-results/matrix-report.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      grep: /@mobile/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_DATA_SOURCE: "mock",
      // Short loading screen for the matrix (the default 4 s is covered by results.spec.ts).
      NEXT_PUBLIC_LOADING_MS: "300",
      // Mock admin credentials (test-only values; mock auth is refused in production).
      ADMIN_MOCK_EMAIL: "admin@versus.test",
      ADMIN_MOCK_PASSWORD: "Versus-Test-Password-2026!",
      ADMIN_MOCK_SESSION_SECRET: "e2e-only-mock-session-secret-0123456789abcdef",
    },
  },
});
