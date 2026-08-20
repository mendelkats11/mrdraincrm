import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const JOB_ISSUE = `${E2E_NAME_PREFIX} Schedule test job`;
const CONFLICT_JOB_ISSUE = `${E2E_NAME_PREFIX} Conflict test job`;
const CONTRACTOR_NAME = `${E2E_NAME_PREFIX} Contractor Bob`;
const CONTRACTOR_NAME_2 = `${E2E_NAME_PREFIX} Contractor Jane`;
const JOB_DETAIL_URL = /\/jobs\/[0-9a-f-]+$/;

async function createJob(page: import("@playwright/test").Page, issueDescription: string) {
  await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
  await page.getByLabel("Issue / work description").fill(issueDescription);
  await page.getByRole("button", { name: "Create job" }).click();
  await page.waitForURL(JOB_DETAIL_URL);
  return page.url();
}

test.describe.serial("Schedule and contractor assignment", () => {
  test("schedule a job from its detail page and see it on /schedule", async ({ page }) => {
    await createJob(page, JOB_ISSUE);

    await page.getByLabel("Date").fill("2026-08-19");
    await page.getByLabel("Start time").fill("10:30");
    await page.getByLabel("End time (optional)").fill("12:00");
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(page.getByText("Currently: Aug 19, 10:30 a.m.–12:00 p.m.")).toBeVisible({
      timeout: 10_000,
    });

    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=day&date=2026-08-19`);
    await expect(page.getByText(JOB_ISSUE)).not.toBeVisible(); // Day view doesn't show issue text, just job#/contact
    await expect(page.getByText("10:30 a.m.–12:00 p.m.")).toBeVisible();
  });

  test("rescheduling moves the job to its new date on /schedule", async ({ page }) => {
    // Find the job by its issue text via search — more reliable than table order.
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByLabel("Date").fill("2026-08-20");
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(page.getByText("Currently: Aug 20,")).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=day&date=2026-08-19`);
    await expect(page.getByText("No jobs scheduled for this day.")).toBeVisible();

    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=day&date=2026-08-20`);
    await expect(page.getByText(/10:30 a\.m\./)).toBeVisible();
  });

  test("Time TBD moves the job into the Any time section", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByLabel("Time TBD").click();
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(page.getByText("Currently: Aug 20 · Time TBD")).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=day&date=2026-08-20`);
    await expect(page.getByText("Any time")).toBeVisible();
  });

  test("assign a contractor via inline quick-create", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByRole("button", { name: "Assign contractor" }).click();
    await page.getByRole("button", { name: "+ New contractor instead" }).click();
    await page.getByPlaceholder("Name").fill(CONTRACTOR_NAME);
    await page.getByPlaceholder("Phone (optional)").fill("306-555-4321");
    await page.getByRole("button", { name: "Create & assign" }).click();

    await expect(page.getByText(CONTRACTOR_NAME, { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Reassign" })).toBeVisible();
  });

  test("reassign to a different contractor, preserving the original assignment in history", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByRole("button", { name: "Reassign" }).click();
    await page.getByRole("button", { name: "+ New contractor instead" }).click();
    await page.getByPlaceholder("Name").fill(CONTRACTOR_NAME_2);
    await page.getByRole("button", { name: "Create & assign" }).click();

    await expect(page.getByText(CONTRACTOR_NAME_2, { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByText("Assignment history").click();
    const history = page.locator("details");
    await expect(history).toContainText(CONTRACTOR_NAME);
    await expect(history).toContainText(CONTRACTOR_NAME_2);
  });

  test("unassign removes the current contractor", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByRole("button", { name: "Unassign" }).click();
    await expect(page.getByText("No contractor assigned.")).toBeVisible({ timeout: 10_000 });
  });

  test("assigning a contractor already booked elsewhere shows a warning, and can still be saved", async ({
    page,
  }) => {
    // Re-assign CONTRACTOR_NAME_2 to the first job (currently at Aug 20, Time TBD).
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);
    // Give it a real time (not TBD) so a conflict is actually checkable.
    await page.getByLabel("Time TBD").click();
    await page.getByLabel("Start time").fill("09:00");
    await page.getByLabel("End time (optional)").fill("10:00");
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(page.getByText(/Currently: Aug 20, 9:00/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Assign contractor" }).click();
    await page.getByPlaceholder("Search contractors…").fill(CONTRACTOR_NAME_2);
    await page.getByRole("button", { name: CONTRACTOR_NAME_2, exact: true }).click();
    // Wait for the confirmed (server-refreshed) assignment, not just the still-visible
    // search-result button — otherwise the next step's navigation can race ahead of
    // the in-flight assign request and cancel it before it reaches the server.
    await expect(page.getByRole("button", { name: "Unassign" })).toBeVisible({ timeout: 10_000 });

    // Now create a second, overlapping job and assign the same contractor.
    await createJob(page, CONFLICT_JOB_ISSUE);
    await page.getByLabel("Date").fill("2026-08-20");
    await page.getByLabel("Start time").fill("09:30");
    await page.getByLabel("End time (optional)").fill("10:30");
    await page.getByRole("button", { name: "Save schedule" }).click();
    await expect(page.getByText(/Currently: Aug 20, 9:30/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Assign contractor" }).click();
    await page.getByPlaceholder("Search contractors…").fill(CONTRACTOR_NAME_2);
    await page.getByRole("button", { name: CONTRACTOR_NAME_2, exact: true }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog).toContainText("Scheduling conflict");
    await expect(dialog).toContainText(CONTRACTOR_NAME_2);
    await expect(dialog).toContainText("9:00");

    await page.getByRole("button", { name: "Assign Anyway" }).click();
    await expect(page.getByText(CONTRACTOR_NAME_2).first()).toBeVisible({ timeout: 10_000 });
  });

  test("Week, Month, and List views all show the scheduled jobs", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=week&date=2026-08-20`);
    await expect(page.getByText("JOB-").first()).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=month&date=2026-08-20`);
    await expect(page.getByText("August 2026")).toBeVisible();

    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=list&date=2026-08-20`);
    await expect(page.getByRole("cell", { name: /JOB-/ }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("mobile: Day view is usable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=day&date=2026-08-20`);
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
    await expect(page.getByText("JOB-").first()).toBeVisible({ timeout: 10_000 });
  });

  test("mobile: Month view shows compact indicators and drilling into a day works", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/schedule?view=month&date=2026-08-20`);
    await expect(page.getByText(/\d+ jobs?/).first()).toBeVisible({ timeout: 10_000 });

    // Tapping the day cell containing our job drills into that day's Day view.
    await page
      .getByText(/\d+ jobs?/)
      .first()
      .click();
    await page.waitForURL(/view=day/);
    await expect(page.getByText("JOB-").first()).toBeVisible({ timeout: 10_000 });
  });
});
