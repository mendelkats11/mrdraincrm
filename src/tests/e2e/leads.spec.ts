import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const CONTACT_NAME = `${E2E_NAME_PREFIX} Lead Contact`;
const PUBLIC_LEAD_NAME = `${E2E_NAME_PREFIX} Public Lead`;
const PUBLIC_LEAD_PHONE = "306-555-0177";
const LEAD_DETAIL_URL = /\/leads\/[0-9a-f-]+$/;

test.describe.serial("Leads", () => {
  test("dashboard: create a contact, then a lead attached to it", async ({ page }) => {
    // Contact first — the lead dialog only searches existing contacts, it
    // doesn't create one inline (Phase 4 scope decision).
    await page.goto(`${E2E_APP_ORIGIN}/contacts`);
    await page.getByRole("button", { name: "+ New Contact" }).click();
    await page.getByLabel("Name").fill(CONTACT_NAME);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("link", { name: CONTACT_NAME })).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/leads`);
    await page.getByRole("button", { name: "+ New Lead" }).click();
    await page.getByPlaceholder("Search contacts…").fill(CONTACT_NAME);
    await page.getByText(CONTACT_NAME).click();
    await page.getByLabel("Issue").fill("Leaky faucet");
    await page.getByRole("button", { name: "Create lead" }).click();

    await expect(page.getByRole("link", { name: CONTACT_NAME })).toBeVisible({ timeout: 10_000 });
  });

  test("status change: New -> Contacted, and Lost excludes it from the default view", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/leads`);
    // Next.js <Link> does a client-side transition, not a hard navigation —
    // Playwright's post-click auto-wait doesn't cover that, so every click
    // on a lead link in this test is followed by an explicit waitForURL
    // before touching the now-loaded page's controls. Skipping this let an
    // earlier version of this test race: the combobox click could land on
    // the *list* page's still-visible status-filter combobox instead of
    // the detail page's status combobox, silently no-opping the intended
    // status change.
    await page.getByRole("link", { name: CONTACT_NAME }).click();
    await page.waitForURL(LEAD_DETAIL_URL);

    // Radix Select — open the trigger, then pick the option by role.
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Contacted" }).click();
    await expect(page.getByRole("combobox")).toContainText("Contacted");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Lost", exact: true }).click();
    await expect(page.getByRole("combobox")).toContainText("Lost");

    // Default (active) leads list excludes Lost.
    await page.goto(`${E2E_APP_ORIGIN}/leads`);
    await expect(page.getByRole("link", { name: CONTACT_NAME })).not.toBeVisible({
      timeout: 10_000,
    });

    // Still fully reachable via the status filter, not deleted.
    await page.goto(`${E2E_APP_ORIGIN}/leads?status=lost`);
    await expect(page.getByRole("link", { name: CONTACT_NAME })).toBeVisible({ timeout: 10_000 });

    // Move it back off Lost so the next test can convert it.
    await page.getByRole("link", { name: CONTACT_NAME }).click();
    await page.waitForURL(LEAD_DETAIL_URL);
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "New" }).click();
    await expect(page.getByRole("combobox")).toContainText("New");
  });

  test("convert to job: allocates a job number and shows it as plain text", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/leads`);
    await page.getByRole("link", { name: CONTACT_NAME }).click();
    await page.waitForURL(LEAD_DETAIL_URL);

    await page.getByRole("button", { name: "Convert to Job" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Convert to Job" }).click();

    await expect(page.getByText(/Converted to job/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^JOB-\d{4}$/)).toBeVisible();
    // Won leads no longer offer status changes or a second conversion.
    await expect(page.getByText("Won — converted to a job.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Convert to Job" })).not.toBeVisible();
  });

  test("public quote form creates a lead, findable from the dashboard", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Name").fill(PUBLIC_LEAD_NAME);
    await page.getByLabel("Phone").fill(PUBLIC_LEAD_PHONE);
    // Seeded service areas (docs/PROJECT_SPEC.md §4) make this field
    // present and required on the real dev database this suite runs
    // against.
    const serviceAreaField = page.getByLabel("Service area");
    if (await serviceAreaField.isVisible()) {
      await serviceAreaField.click();
      await page.getByRole("option", { name: "Martensville" }).click();
    }
    await page.getByLabel("Issue").fill("Burst pipe under the sink");
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByText("Thanks — we got your request.")).toBeVisible({
      timeout: 10_000,
    });

    // Never disclosed to the public page itself — verified from the
    // dashboard side instead, where the lead should now be visible.
    await page.goto(`${E2E_APP_ORIGIN}/leads`);
    await expect(page.getByRole("link", { name: PUBLIC_LEAD_NAME })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("link", { name: PUBLIC_LEAD_NAME }).click();
    await page.waitForURL(LEAD_DETAIL_URL);
    // Both original and latest source read "website" — .first() avoids a
    // strict-mode ambiguity between the two, either is sufficient proof.
    await expect(page.getByText("website", { exact: true }).first()).toBeVisible();
  });
});
