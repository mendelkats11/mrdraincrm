import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// A tiny valid 1x1 PNG checked into the repo purely as an upload test
// fixture — no real photo content needed to exercise the upload/signed-URL/
// delete path.
const FIXTURE_IMAGE = path.join(__dirname, "fixtures", "test-photo.png");

const r2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_PRIVATE,
);

// Skipped until real R2 credentials are configured (Phase 5 approved
// decision: the user configures the actual R2 account separately). Once
// R2_* is set in the environment this webServer runs with, this suite
// exercises the real upload -> signed URL -> delete path against R2, not a
// fake.
test.describe.serial("Job photos (real R2)", () => {
  test.skip(!r2Configured, "R2 credentials not configured in this environment");

  test("upload, view via signed URL, recategorize, and delete a photo", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
    await page.getByLabel("Issue / work description").fill(`${E2E_NAME_PREFIX} Photo test job`);
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(/\/jobs\/[0-9a-f-]+$/);

    await page.getByLabel("Photo").setInputFiles(FIXTURE_IMAGE);
    // Category defaults to "Other" — switch it to "Before" via the Radix
    // Select (not a native <select>, so click-then-pick-option, same
    // pattern used throughout the app's E2E suite).
    await page.getByLabel("Category").click();
    await page.getByRole("option", { name: "Before", exact: true }).click();
    await page.getByLabel("Caption (optional)").fill("Before photo");
    await page.getByRole("button", { name: "Upload" }).click();

    const image = page.locator("img[alt='Before photo']");
    await expect(image).toBeVisible({ timeout: 15_000 });
    const src = await image.getAttribute("src");
    expect(src).toContain("r2.cloudflarestorage.com");

    // The signed URL actually resolves to real image bytes.
    const response = await page.request.get(src!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image");

    // Recategorize, scoped to this specific photo card so it can't be
    // confused with the upload form's own category select or the job's
    // status select above it.
    const photoCard = page.getByTestId("job-photo-card").filter({ has: image });
    await photoCard.getByRole("combobox").click();
    await page.getByRole("option", { name: "After", exact: true }).click();
    await expect(photoCard.getByRole("combobox")).toContainText("After");

    // Delete with confirmation.
    await photoCard.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(image).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("No photos yet.")).toBeVisible();
  });
});
