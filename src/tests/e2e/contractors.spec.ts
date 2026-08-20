import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const CONTRACTOR_NAME = `${E2E_NAME_PREFIX} Contractor Status Flow`;
const JOB_ISSUE = `${E2E_NAME_PREFIX} Contractor stats job`;
const CONTRACTOR_DETAIL_URL = /\/contractors\/[0-9a-f-]+$/;
const JOB_DETAIL_URL = /\/jobs\/[0-9a-f-]+$/;

async function createJob(page: import("@playwright/test").Page, issueDescription: string) {
  await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
  await page.getByLabel("Issue / work description").fill(issueDescription);
  await page.getByRole("button", { name: "Create job" }).click();
  await page.waitForURL(JOB_DETAIL_URL);
  return page.url();
}

function contractorRow(page: import("@playwright/test").Page) {
  return page.getByRole("row", { name: new RegExp(CONTRACTOR_NAME) });
}

test.describe.serial("Contractors", () => {
  test("create a contractor via the full form", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contractors`);
    await page.getByRole("button", { name: "+ New Contractor" }).click();
    await page.getByLabel("Name").fill(CONTRACTOR_NAME);
    await page.getByLabel("Phone").fill("306-555-7890");
    await page.getByLabel("Default payout arrangement").fill("60/40");
    await page.getByLabel("Notes").fill("Reliable, does weekends");
    await page.getByRole("button", { name: "Create contractor" }).click();

    await expect(page.getByRole("link", { name: CONTRACTOR_NAME })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("edit the contractor and see changes persist", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contractors`);
    await page.getByRole("link", { name: CONTRACTOR_NAME }).click();
    await page.waitForURL(CONTRACTOR_DETAIL_URL);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Notes").fill("Updated: does emergency calls too");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("Notes: Updated: does emergency calls too")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("deactivating removes the contractor from the active list and the job assignment picker", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contractors`);
    await contractorRow(page).getByRole("button", { name: "Contractor actions" }).click();
    await page.getByRole("menuitem", { name: "Deactivate" }).click();

    // Default filter is "Active" — the row should disappear.
    await expect(page.getByRole("link", { name: CONTRACTOR_NAME })).not.toBeVisible({
      timeout: 10_000,
    });

    // Switch to the Inactive filter — it should reappear there.
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Inactive", exact: true }).click();
    await expect(page.getByRole("link", { name: CONTRACTOR_NAME })).toBeVisible({
      timeout: 10_000,
    });

    // And it must no longer be offered when assigning a contractor to a job.
    await createJob(page, JOB_ISSUE);
    await page.getByRole("button", { name: "Assign contractor" }).click();
    await page.getByPlaceholder("Search contractors…").fill(CONTRACTOR_NAME);
    // Wait out the picker's debounce (250ms) before asserting absence, so
    // this isn't a false-positive pass from checking before the search
    // actually ran.
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("button", { name: CONTRACTOR_NAME, exact: true }),
    ).not.toBeVisible();
  });

  test("reactivating restores the contractor to the active list and the picker", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/contractors?status=inactive`);
    await contractorRow(page).getByRole("button", { name: "Contractor actions" }).click();
    await page.getByRole("menuitem", { name: "Activate" }).click();
    // Wait for confirmation before navigating away — otherwise the
    // navigation can cancel the in-flight action request before it reaches
    // the server (now reactivated, it no longer matches this Inactive filter).
    await expect(contractorRow(page)).not.toBeVisible({ timeout: 10_000 });
    // A hard navigation to the same pathname with a different (dropped)
    // query string immediately after a mutation can briefly race Next.js's
    // dynamic re-render for this specific path — a short settle here avoids
    // that narrow window. The underlying data is always correct (proven by
    // the getContractorStats/setContractorActive integration tests); this
    // is purely a navigation-timing quirk of two goto()s in under a second.
    await page.waitForTimeout(1500);

    await page.goto(`${E2E_APP_ORIGIN}/contractors`);
    await expect(page.getByRole("link", { name: CONTRACTOR_NAME })).toBeVisible({
      timeout: 10_000,
    });

    // Reuse the job created in the previous test — it should now offer this
    // contractor again.
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);
    await page.getByRole("button", { name: "Assign contractor" }).click();
    await page.getByPlaceholder("Search contractors…").fill(CONTRACTOR_NAME);
    await expect(page.getByRole("button", { name: CONTRACTOR_NAME, exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("advancing payout status from the job page updates the contractor's rollups", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    await page.getByRole("button", { name: "Assign contractor" }).click();
    await page.getByPlaceholder("Search contractors…").fill(CONTRACTOR_NAME);
    await page.getByRole("button", { name: CONTRACTOR_NAME, exact: true }).click();
    await expect(page.getByRole("button", { name: "Unassign" })).toBeVisible({ timeout: 10_000 });

    // Give the job a real payout amount so the contractor's totals are
    // non-zero and checkable.
    await page.getByLabel("Contractor payout").fill("150.00");
    await page.getByRole("button", { name: "Save financial inputs" }).click();
    await expect(page.getByLabel("Contractor payout")).toHaveValue("150.00", { timeout: 10_000 });

    await page.getByLabel("Payout status").click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByLabel("Payout status")).toContainText("Completed");

    await page.getByLabel("Payout status").click();
    await page.getByRole("option", { name: "Payout Pending", exact: true }).click();
    await expect(page.getByLabel("Payout status")).toContainText("Payout Pending");

    await page.getByLabel("Payout status").click();
    await page.getByRole("option", { name: "Paid", exact: true }).click();
    await expect(page.getByLabel("Payout status")).toContainText("Paid");

    // Follow the link from the job's Contractor card to the contractor page.
    await page.getByRole("link", { name: CONTRACTOR_NAME }).click();
    await page.waitForURL(CONTRACTOR_DETAIL_URL);

    await expect(page.getByText("$150.00").first()).toBeVisible({ timeout: 10_000 });
    const historyRow = page.getByRole("row", { name: /JOB-/ });
    await expect(historyRow).toContainText("Paid");
  });

  test("contractor is findable via global search", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(CONTRACTOR_NAME)}`);
    await expect(page.locator("main").getByRole("link", { name: CONTRACTOR_NAME })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("mobile: contractors list and detail pages are usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/contractors`);
    await expect(page.getByRole("heading", { name: "Contractors" })).toBeVisible();
    await expect(page.getByRole("link", { name: CONTRACTOR_NAME })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("link", { name: CONTRACTOR_NAME }).click();
    await page.waitForURL(CONTRACTOR_DETAIL_URL);
    await expect(page.getByText("Jobs Completed")).toBeVisible();
    await expect(page.getByText("Outstanding Payout")).toBeVisible();
  });
});
