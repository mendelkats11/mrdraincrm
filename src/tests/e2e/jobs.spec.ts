import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const CONTACT_NAME = `${E2E_NAME_PREFIX} Job Contact`;
const INLINE_CONTACT_NAME = `${E2E_NAME_PREFIX} Inline Job Contact`;
const LEAD_CONTACT_NAME = `${E2E_NAME_PREFIX} Job Lead Contact`;
const PROPERTY_ADDRESS = `${E2E_NAME_PREFIX} Job Property`;
const JOB_DETAIL_URL = /\/jobs\/[0-9a-f-]+$/;

test.describe.serial("Jobs", () => {
  test("create a job with no contact, property, organization, or lead", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} General no-relationship job`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);
    await expect(page.getByText(`${E2E_NAME_PREFIX} General no-relationship job`)).toBeVisible();
    // No relationships means "None" for every linked-record line.
    await expect(page.getByText("Contact: None")).toBeVisible();
    await expect(page.getByText("Property: None")).toBeVisible();
  });

  test("create a job with an existing contact via search", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contacts`);
    await page.getByRole("button", { name: "+ New Contact" }).click();
    await page.getByLabel("Name").fill(CONTACT_NAME);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("link", { name: CONTACT_NAME })).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page.getByPlaceholder("Search contacts…").fill(CONTACT_NAME);
    await page.getByText(CONTACT_NAME).click();
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} Job for existing contact`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);
    await expect(page.getByRole("link", { name: CONTACT_NAME })).toBeVisible();
  });

  test("inline contact creation during job creation", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page.getByRole("button", { name: "+ New contact instead" }).click();
    await page.getByLabel("Name").fill(INLINE_CONTACT_NAME);
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} Job with inline contact`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);
    await expect(page.getByRole("link", { name: INLINE_CONTACT_NAME })).toBeVisible();

    // A real, separately-editable contact record now exists too.
    await page.goto(`${E2E_APP_ORIGIN}/contacts`);
    await expect(page.getByRole("link", { name: INLINE_CONTACT_NAME })).toBeVisible();
  });

  test("Contact -> New Job prefills the contact", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contacts`);
    await page.getByRole("link", { name: CONTACT_NAME }).click();
    await page.waitForURL(/\/contacts\/[0-9a-f-]+$/);
    await page.getByRole("link", { name: "+ New Job" }).click();
    await page.waitForURL(/\/jobs\/new\?contactId=/);
    await expect(page.getByText(CONTACT_NAME).first()).toBeVisible();
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} Job from contact quick action`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);
    await expect(page.getByRole("link", { name: CONTACT_NAME })).toBeVisible();
  });

  test("Property -> New Job prefills the property", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/properties`);
    await page.getByRole("button", { name: "+ New Property" }).click();
    await page.getByLabel("Address").fill(PROPERTY_ADDRESS);
    await page.getByLabel("City").fill("Martensville");
    await page.getByLabel("Postal code").fill("S0K 0A0");
    await page.getByRole("button", { name: "Create property" }).click();
    await expect(page.getByRole("link", { name: PROPERTY_ADDRESS })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("link", { name: PROPERTY_ADDRESS }).click();
    await page.waitForURL(/\/properties\/[0-9a-f-]+$/);
    await page.getByRole("link", { name: "+ New Job" }).click();
    await page.waitForURL(/\/jobs\/new\?propertyId=/);
    await expect(page.getByText(`${PROPERTY_ADDRESS}, Martensville`)).toBeVisible();
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} Job from property quick action`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);
    await expect(
      page.getByRole("link", { name: `${PROPERTY_ADDRESS}, Martensville` }),
    ).toBeVisible();
  });

  test("Lead -> Job navigation after conversion, and back again", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contacts`);
    await page.getByRole("button", { name: "+ New Contact" }).click();
    await page.getByLabel("Name").fill(LEAD_CONTACT_NAME);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page.getByRole("link", { name: LEAD_CONTACT_NAME })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto(`${E2E_APP_ORIGIN}/leads`);
    await page.getByRole("button", { name: "+ New Lead" }).click();
    await page.getByPlaceholder("Search contacts…").fill(LEAD_CONTACT_NAME);
    await page.getByText(LEAD_CONTACT_NAME).click();
    await page.getByLabel("Issue").fill(`${E2E_NAME_PREFIX} Lead needing conversion`);
    await page.getByRole("button", { name: "Create lead" }).click();
    await expect(page.getByRole("link", { name: LEAD_CONTACT_NAME })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("link", { name: LEAD_CONTACT_NAME }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
    await page.getByRole("button", { name: "Convert to Job" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Convert to Job" }).click();
    await expect(page.getByText(/Converted to job/)).toBeVisible({ timeout: 10_000 });

    const jobLink = page.getByRole("link", { name: /^JOB-\d{4}$/ });
    await expect(jobLink).toBeVisible();
    await jobLink.click();
    await page.waitForURL(JOB_DETAIL_URL);
    await expect(page.getByRole("link", { name: "View originating lead" })).toBeVisible();
    // The reverse link — back to the originating lead — actually works.
    await page.getByRole("link", { name: "View originating lead" }).click();
    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: LEAD_CONTACT_NAME })).toBeVisible();
  });

  test("status changes: free transitions through several statuses", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} Status transition job`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);

    for (const status of ["Open", "In Progress", "Completed", "Draft"]) {
      await page.getByRole("combobox").first().click();
      await page.getByRole("option", { name: status, exact: true }).click();
      await expect(page.getByRole("combobox").first()).toContainText(status);
    }
  });

  test("Cancelled excludes a job from the default view but keeps it reachable", async ({
    page,
  }) => {
    const issueText = `${E2E_NAME_PREFIX} Cancel-me job`;
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page.getByLabel("Issue / work description").fill(issueText);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Cancelled", exact: true }).click();
    await expect(page.getByRole("combobox").first()).toContainText("Cancelled");

    await page.goto(`${E2E_APP_ORIGIN}/jobs`);
    await expect(page.getByText(issueText)).not.toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/jobs?status=cancelled`);
    await expect(page.getByText(issueText)).toBeVisible({ timeout: 10_000 });
  });

  test("financial inputs are stored, and custom charges can be added", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page.getByRole("button", { name: "Detailed" }).click();
    await page
      .getByLabel("Issue / work description")
      .fill(`${E2E_NAME_PREFIX} Financial inputs job`);
    await page.getByLabel("Job amount").fill("150.00");
    await page.getByLabel("Tax amount").fill("7.50");
    await page.getByLabel("Materials").fill("20.00");
    await page.getByLabel("Contractor payout").fill("60.00");
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(JOB_DETAIL_URL);

    await expect(page.getByLabel("Job amount")).toHaveValue("150.00");
    await expect(page.getByLabel("Tax amount")).toHaveValue("7.50");
    await expect(page.getByLabel("Materials")).toHaveValue("20.00");
    await expect(page.getByLabel("Contractor payout")).toHaveValue("60.00");

    // No computed total/profit/margin appears anywhere on the page —
    // that's exclusively Phase 8's job.
    await expect(page.getByText(/customer total/i)).not.toBeVisible();
    await expect(page.getByText(/^profit$/i)).not.toBeVisible();
    await expect(page.getByText(/margin/i)).not.toBeVisible();

    await page.getByLabel("Job amount").fill("200.00");
    await page.getByRole("button", { name: "Save financial inputs" }).click();
    // router.refresh() re-renders this same page with fresh server data —
    // wait for the button to settle out of its pending state before
    // reloading, rather than a fixed sleep.
    await expect(page.getByRole("button", { name: "Save financial inputs" })).toBeEnabled();
    await page.reload();
    await expect(page.getByLabel("Job amount")).toHaveValue("200.00");

    await page.getByLabel("Description").fill("Extra part");
    await page.getByLabel("Amount", { exact: true }).fill("15.00");
    await page.getByRole("button", { name: "Add charge" }).click();
    // Scoped to the custom-charges list specifically — both it and the
    // activity timeline render <li> elements, and the timeline also shows
    // this same description in its JSON dump.
    const chargeItem = page
      .getByTestId("custom-charges-list")
      .locator("li", { hasText: "Extra part" });
    await expect(chargeItem).toBeVisible({ timeout: 10_000 });
    await expect(chargeItem).toContainText("$15.00");
  });
});
