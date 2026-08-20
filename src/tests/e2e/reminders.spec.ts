import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const REMINDER_TITLE = `${E2E_NAME_PREFIX} Reminder test`;
const RECURRING_TITLE = `${E2E_NAME_PREFIX} Recurring reminder test`;
const OVERDUE_TITLE = `${E2E_NAME_PREFIX} Overdue dashboard test`;
const DUE_TODAY_TITLE = `${E2E_NAME_PREFIX} Due today dashboard test`;
const UPCOMING_TITLE = `${E2E_NAME_PREFIX} Upcoming dashboard test`;
const NOTIFY_TITLE = `${E2E_NAME_PREFIX} Notification test`;
const JOB_ISSUE = `${E2E_NAME_PREFIX} Reminder relationship job`;

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/**
 * Calls the exact same scheduled-processing logic the Netlify Scheduled
 * Function runs (src/lib/reminders/scheduler.ts) directly against the real
 * dev database — there's no way to trigger the actual Netlify Function
 * from a `next dev`-backed E2E run, so this exercises the identical code
 * path the same way global-setup.ts/cleanup.ts reach the DB directly
 * (relative imports, not the `@/` alias, which isn't configured for this
 * Node-side test execution context).
 */
async function runScheduledProcessing() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Already loaded by Playwright's globalSetup in this same run.
  }
  const { getDb } = await import("../../lib/db/client");
  const { processReminders } = await import("../../lib/reminders/scheduler");
  return processReminders(getDb());
}

test.describe.serial("Reminders and notifications", () => {
  test("create a reminder and see it on /reminders", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/reminders`);
    await page.getByRole("button", { name: "+ New Reminder" }).click();
    await page.getByLabel("Title").fill(REMINDER_TITLE);
    await page.getByLabel("Due date").fill(isoDate(1));
    await page.getByRole("button", { name: "Create reminder" }).click();

    await expect(page.getByRole("cell", { name: REMINDER_TITLE, exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("dashboard shows overdue, due today, and upcoming reminders in the correct sections", async ({
    page,
  }) => {
    async function createAt(title: string, daysFromToday: number) {
      await page.goto(`${E2E_APP_ORIGIN}/reminders`);
      await page.getByRole("button", { name: "+ New Reminder" }).click();
      await page.getByLabel("Title").fill(title);
      await page.getByLabel("Due date").fill(isoDate(daysFromToday));
      await page.getByRole("button", { name: "Create reminder" }).click();
      await expect(page.getByRole("cell", { name: title, exact: true })).toBeVisible({
        timeout: 10_000,
      });
    }

    await createAt(OVERDUE_TITLE, -2);
    await createAt(DUE_TODAY_TITLE, 0);
    await createAt(UPCOMING_TITLE, 5);

    await page.goto(`${E2E_APP_ORIGIN}/`);
    // Scoped by data-testid — the "Overdue" card title text otherwise
    // collides with the per-row "Overdue" status badge inside that same
    // card (same class of ambiguity hit repeatedly in earlier phases).
    await expect(page.getByTestId("overdue-reminders-card").getByText(OVERDUE_TITLE)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByTestId("due-today-reminders-card").getByText(DUE_TODAY_TITLE),
    ).toBeVisible();
    await expect(
      page.getByTestId("upcoming-reminders-card").getByText(UPCOMING_TITLE),
    ).toBeVisible();
    // And confirm they're NOT cross-listed in the wrong section.
    await expect(
      page.getByTestId("due-today-reminders-card").getByText(OVERDUE_TITLE),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("upcoming-reminders-card").getByText(DUE_TODAY_TITLE),
    ).not.toBeVisible();
  });

  test("completing a reminder removes it from active lists but preserves it in history", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/reminders?status=all`);
    const row = page.locator("tr", { hasText: REMINDER_TITLE });
    await row.getByRole("button", { name: "Complete" }).click();
    await expect(row.getByText("Completed", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/reminders`); // default "active" filter
    await expect(page.getByRole("cell", { name: REMINDER_TITLE, exact: true })).not.toBeVisible();

    await page.goto(`${E2E_APP_ORIGIN}/reminders?status=completed`);
    await expect(page.getByRole("cell", { name: REMINDER_TITLE, exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("a daily recurring reminder generates the next occurrence when completed", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/reminders`);
    await page.getByRole("button", { name: "+ New Reminder" }).click();
    await page.getByLabel("Title").fill(RECURRING_TITLE);
    await page.getByLabel("Due date").fill(isoDate(0));
    await page.getByLabel("Repeat").click();
    await page.getByRole("option", { name: "Daily", exact: true }).click();
    await page.getByRole("button", { name: "Create reminder" }).click();
    await expect(page.getByRole("cell", { name: RECURRING_TITLE, exact: true })).toBeVisible({
      timeout: 10_000,
    });

    const row = page.locator("tr", { hasText: RECURRING_TITLE });
    await row.getByRole("button", { name: "Complete" }).click();

    // The default "active" filter now shows exactly one row with this
    // title again — the freshly-generated next occurrence, not the one
    // just completed (which shares the same title, so checking the
    // original row locator for "not visible" right after the click would
    // be unreliable: a *different* row matching the same text reappears).
    const activeRows = page.locator("tr", { hasText: RECURRING_TITLE });
    await expect(activeRows).toHaveCount(1, { timeout: 10_000 });
    await expect(activeRows.first().getByText("Upcoming", { exact: true })).toBeVisible();
  });

  test("scheduled processing creates a notification, the bell shows it, and marking it read clears the unread count", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/reminders`);
    await page.getByRole("button", { name: "+ New Reminder" }).click();
    await page.getByLabel("Title").fill(NOTIFY_TITLE);
    // Due a minute ago, so it's immediately picked up as "due" by the
    // scheduler regardless of what time this test happens to run.
    await page.getByLabel("Due date").fill(isoDate(0));
    await page.getByLabel("Due time").fill("00:01");
    await page.getByRole("button", { name: "Create reminder" }).click();
    await expect(page.getByRole("cell", { name: NOTIFY_TITLE, exact: true })).toBeVisible({
      timeout: 10_000,
    });

    const firstRun = await runScheduledProcessing();
    expect(firstRun.notificationsCreated).toBeGreaterThanOrEqual(1);

    // Idempotency: running it again immediately must not duplicate.
    const secondRun = await runScheduledProcessing();
    expect(secondRun.notificationsCreated).toBe(0);

    await page.goto(`${E2E_APP_ORIGIN}/`);
    const bell = page.getByRole("button", { name: "Notifications" });
    await expect(bell.getByText(/[1-9]/)).toBeVisible({ timeout: 10_000 });

    await bell.click();
    const notificationItem = page.getByText(`Reminder due: ${NOTIFY_TITLE}`);
    await expect(notificationItem).toBeVisible({ timeout: 10_000 });
    await notificationItem.click();

    await page.waitForURL(/\/reminders$/);
  });

  test("a reminder can be created from a job's detail page and shows the relationship", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page.getByLabel("Issue / work description").fill(JOB_ISSUE);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(/\/jobs\/[0-9a-f-]+$/);

    await page.getByRole("button", { name: "+ Add Reminder" }).click();
    const jobReminderTitle = `${E2E_NAME_PREFIX} Job reminder`;
    await page.getByLabel("Title").fill(jobReminderTitle);
    await page.getByLabel("Due date").fill(isoDate(1));
    await page.getByRole("button", { name: "Create reminder" }).click();

    await expect(page.getByText(jobReminderTitle)).toBeVisible({ timeout: 10_000 });
  });

  test("mobile: reminders page is usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/reminders?status=all`);
    await expect(page.getByRole("heading", { name: "Reminders" })).toBeVisible();
    await expect(page.getByRole("cell", { name: REMINDER_TITLE, exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });
});
