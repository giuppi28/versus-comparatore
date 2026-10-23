import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Matrix specs run via `npm run e2e:matrix` (playwright.matrix.config.ts).
  testIgnore: "**/matrix/**",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
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
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_DATA_SOURCE: "mock",
      // Never send real emails from e2e runs, even if .env.local has a Resend key.
      RESEND_API_KEY: "",
      // Mock mode only: makes the resend.dev sandbox banner show on every e2e run.
      RESEND_FROM: "onboarding@resend.dev",
      // Mock admin credentials (test-only values; mock auth is refused in production).
      ADMIN_MOCK_EMAIL: "admin@versus.test",
      ADMIN_MOCK_PASSWORD: "Versus-Test-Password-2026!",
      ADMIN_MOCK_SESSION_SECRET: "e2e-only-mock-session-secret-0123456789abcdef",
    },
  },
});
