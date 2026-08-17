import { test, expect } from "@playwright/test";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const APP = "http://app.localhost:3000";

const CONTACT_A = `${E2E_NAME_PREFIX} Contact A`;
const CONTACT_DUPLICATE = `${E2E_NAME_PREFIX} Contact A Duplicate`;
const PROPERTY_ADDRESS = `${E2E_NAME_PREFIX} Property`;
const SHARED_PHONE = "306-555-0199";

// Authentication happens once via the "setup" project (auth.setup.ts),
// which saves cookies to storage state that every test here reuses — see
// playwright.config.ts. Each test still calls requireUser() server-side
// on every request regardless, same as a real signed-in user.
test.describe.serial("CRM core flows", () => {
  test("already authenticated: the dashboard is reachable without hitting /login", async ({
    page,
  }) => {
    await page.goto(`${APP}/`);
    await expect(page.getByRole("heading", { name: /Welcome, E2E Test Owner/ })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("create a contact — no job/property/organization required", async ({ page }) => {
    await page.goto(`${APP}/contacts`);
    await page.getByRole("button", { name: "+ New Contact" }).click();
    await page.getByLabel("Name").fill(CONTACT_A);
    await page.getByLabel("Phone").fill(SHARED_PHONE);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("link", { name: CONTACT_A })).toBeVisible({ timeout: 10_000 });
  });

  test("create a property — no job required", async ({ page }) => {
    await page.goto(`${APP}/properties`);
    await page.getByRole("button", { name: "+ New Property" }).click();
    await page.getByLabel("Address").fill(PROPERTY_ADDRESS);
    await page.getByLabel("City").fill("Martensville");
    await page.getByLabel("Postal code").fill("S0K 0A0");
    await page.getByRole("button", { name: "Create property" }).click();
    await expect(page.getByRole("link", { name: PROPERTY_ADDRESS })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("attach the contact to the property", async ({ page }) => {
    await page.goto(`${APP}/contacts`);
    await page.getByRole("link", { name: CONTACT_A }).click();
    await expect(page.getByRole("heading", { name: CONTACT_A })).toBeVisible();

    await page.getByRole("button", { name: "+ Add property" }).click();
    await page.getByPlaceholder("Search by address or city…").fill("Martensville");
    await page.getByText(`${PROPERTY_ADDRESS}, Martensville`).click();
    await page.getByRole("button", { name: "Add" }).click();

    await expect(page.getByRole("link", { name: `${PROPERTY_ADDRESS}, Martensville` })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("archiving is reversible: archive then restore", async ({ page }) => {
    await page.goto(`${APP}/contacts`);
    await page.getByRole("link", { name: CONTACT_A }).click();
    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click();
    // Exact match on the status badge specifically — the activity timeline
    // separately (and correctly) shows a "Contact archived" history entry
    // that persists even after restoring, which is not this assertion's
    // concern.
    const badge = page.getByText("Archived", { exact: true });
    await expect(badge).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Restore" }).click();
    await expect(badge).not.toBeVisible({ timeout: 10_000 });
  });

  test("duplicate detection surfaces a same-phone contact, then merge archives it", async ({
    page,
  }) => {
    // Create the near-duplicate (same phone as Contact A).
    await page.goto(`${APP}/contacts`);
    await page.getByRole("button", { name: "+ New Contact" }).click();
    await page.getByLabel("Name").fill(CONTACT_DUPLICATE);
    await page.getByLabel("Phone").fill(SHARED_PHONE);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("link", { name: CONTACT_DUPLICATE })).toBeVisible({
      timeout: 10_000,
    });

    // Back on Contact A, the duplicate suggestion should appear. Exact
    // match — CONTACT_A is otherwise a substring of CONTACT_DUPLICATE's
    // name, and Playwright's role-name matching is substring by default.
    await page.getByRole("link", { name: CONTACT_A, exact: true }).click();
    await expect(page.getByText("Possible duplicates")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(CONTACT_DUPLICATE)).toBeVisible();
    await expect(page.getByText("Same phone")).toBeVisible();

    // Merge via the suggestion's quick action — the confirmation step must
    // clearly show which contact is kept and which is archived.
    await page
      .locator("li", { hasText: CONTACT_DUPLICATE })
      .getByRole("button", { name: "Merge" })
      .click();
    await expect(page.getByText(`Keep: ${CONTACT_A}`)).toBeVisible();
    await expect(page.getByText(`Archive: ${CONTACT_DUPLICATE}`)).toBeVisible();
    await page.getByRole("button", { name: `Merge into ${CONTACT_A}` }).click();

    await expect(page.getByText("Possible duplicates")).not.toBeVisible({ timeout: 10_000 });

    // The merged-away contact still exists (archived, not deleted), never
    // automatically merged without this explicit confirmation step.
    await page.goto(`${APP}/contacts?status=archived`);
    await expect(page.getByRole("link", { name: CONTACT_DUPLICATE })).toBeVisible({
      timeout: 10_000,
    });
  });
});
