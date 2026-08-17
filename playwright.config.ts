import { defineConfig, devices } from "@playwright/test";

// `next start` always sets NODE_ENV=production, so proxy.ts's dev-only
// app.localhost fallback doesn't apply here — APP_HOSTNAME makes
// app.localhost:3000 recognized as the app surface regardless of
// NODE_ENV. Chromium resolves *.localhost to loopback natively, same as
// in manual testing. baseURL stays on the public host (127.0.0.1) so the
// existing Phase 0 smoke test's relative "/" is unaffected; the CRM spec
// navigates to fully-qualified app.localhost:3000 URLs itself.
export const E2E_APP_ORIGIN = "http://app.localhost:3000";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./src/tests/e2e/global-setup.ts",
  globalTeardown: "./src/tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "src/tests/e2e/.auth/e2e-owner.json" },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { APP_HOSTNAME: "app.localhost:3000" },
  },
});
