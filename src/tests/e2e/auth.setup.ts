import { test as setup, expect } from "@playwright/test";
import { E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD } from "./e2e-credentials";

const APP = "http://app.localhost:3000";
const authFile = "src/tests/e2e/.auth/e2e-owner.json";

// Logs in once; the "chromium" project reuses this saved storage state
// (cookies) for every test instead of each test starting signed out.
setup("authenticate", async ({ page }) => {
  await page.goto(`${APP}/login`);
  await page.getByLabel("Email").fill(E2E_OWNER_EMAIL);
  await page.getByLabel("Password").fill(E2E_OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: /Welcome, E2E Test Owner/ })).toBeVisible({
    timeout: 15_000,
  });
  await page.context().storageState({ path: authFile });
});
