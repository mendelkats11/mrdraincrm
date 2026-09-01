import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const QUOTE_DESCRIPTION = `${E2E_NAME_PREFIX} Quote test description`;
const CANCEL_QUOTE_DESCRIPTION = `${E2E_NAME_PREFIX} Quote cancel test description`;
const QUOTE_DETAIL_URL = /\/quotes\/[0-9a-f-]+$/;
const JOB_DETAIL_URL = /\/jobs\/[0-9a-f-]+$/;

async function createQuote(page: import("@playwright/test").Page, description: string) {
  await page.goto(`${E2E_APP_ORIGIN}/quotes/new`);
  // A bare getByLabel("Description") is ambiguous here: the form starts
  // with one line item row already present, and each line item row has
  // its own "Description" field/label (correctly, since there can be many)
  // — targeting the quote-level field by its stable id instead.
  await page.locator("#description").fill(description);
  await page.getByLabel("Tax amount").fill("10.00");
  await page.getByRole("button", { name: "Create quote" }).click();
  await page.waitForURL(QUOTE_DETAIL_URL);
  return page.url();
}

// Quotes have no jobId indirection to search through like invoices do, and
// quote search deliberately doesn't match on description (only number/
// contact/organization, per the approved Phase 9 plan) — so tests navigate
// straight back to the created quote's own URL instead of re-searching.
let quoteUrl: string;

test.describe.serial("Quotes", () => {
  test("create a quote, add a line item and a custom charge, and see the total", async ({
    page,
  }) => {
    quoteUrl = await createQuote(page, QUOTE_DESCRIPTION);

    await expect(page.getByRole("heading", { name: "QUO-" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    await page.getByLabel("Description").first().fill("Toilet replacement");
    await page.getByLabel("Unit price").fill("250.00");
    await page.getByRole("button", { name: "Add line item" }).click();
    await expect(page.getByRole("cell", { name: "Toilet replacement", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByLabel("Description", { exact: true }).nth(1).fill("Permit fee");
    await page.getByLabel("Amount").fill("50.00");
    await page.getByRole("button", { name: "Add charge" }).click();
    // Scoped to the custom-charges list — the page's activity timeline also
    // renders the description text inside a raw JSON diff string, which a
    // bare getByText match would ambiguously match too (same class of issue
    // Phase 8 hit with invoice line items).
    await expect(page.getByTestId("custom-charges-list").getByText("Permit fee")).toBeVisible({
      timeout: 10_000,
    });

    // Subtotal = 250 + 50 = 300; total = 300 + 10 tax = 310.
    await expect(page.getByText("Subtotal: $300.00")).toBeVisible();
    await expect(page.getByText("Tax: $10.00")).toBeVisible();
    await expect(page.getByText("Total: $310.00")).toBeVisible();
  });

  test("the PDF endpoint returns a real PDF for the quote", async ({ page }) => {
    await page.goto(quoteUrl);

    const downloadLink = page.getByRole("link", { name: "Download PDF" });
    await expect(downloadLink).toBeVisible();
    const href = await downloadLink.getAttribute("href");
    expect(href).toMatch(/\/api\/quotes\/[0-9a-f-]+\/pdf/);

    // page.request can't resolve the app.localhost hostname-routing
    // subdomain the way Chromium can — fetch from inside the page instead
    // (Phase 8 lesson, same fix applied here from the start).
    const result = await page.evaluate(async (url) => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return {
        status: res.status,
        contentType: res.headers.get("content-type"),
        base64: btoa(binary),
      };
    }, `${E2E_APP_ORIGIN}${href}`);

    expect(result.status).toBe(200);
    expect(result.contentType).toBe("application/pdf");
    const body = Buffer.from(result.base64, "base64");
    expect(body.length).toBeGreaterThan(0);
    expect(body.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  test("marking as Sent locks editing, and downloading never marks it Sent by itself", async ({
    page,
  }) => {
    await page.goto(quoteUrl);

    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add line item" })).toBeVisible();

    await page.getByRole("button", { name: "Mark as Sent" }).click();
    await expect(page.getByText("Sent", { exact: true })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("button", { name: "Add line item" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Mark as Sent" })).not.toBeVisible();
  });

  test("accepting a Sent quote reveals Convert to Job, and converting creates a linked job", async ({
    page,
  }) => {
    await page.goto(quoteUrl);

    await expect(page.getByRole("button", { name: "Convert to Job" })).not.toBeVisible();
    await page.getByRole("button", { name: "Mark as Accepted" }).click();
    await expect(page.getByText("Accepted", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Convert to Job" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button", { name: "Convert to job" }).click();

    await page.waitForURL(JOB_DETAIL_URL, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "JOB-" })).toBeVisible({ timeout: 10_000 });

    // The job page shows the Quotes card linking back.
    await expect(page.locator("main").getByText("Quotes", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /QUO-/ })).toBeVisible();

    // The quote page shows it converted, and Convert to Job is gone —
    // converting twice must not be possible from the UI.
    await page.goto(quoteUrl);
    await expect(page.getByText("Converted to job")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Convert to Job" })).not.toBeVisible();
  });

  test("activity history shows the full quote/job lifecycle", async ({ page }) => {
    await page.goto(quoteUrl);

    await expect(page.getByText("Quote created")).toBeVisible();
    await expect(page.getByText("Quote status changed").first()).toBeVisible();
    await expect(page.getByText("Converted to a job")).toBeVisible();
  });

  test("a quote is findable via global search", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/quotes`);
    const quoteNumber = await page
      .locator("table tbody tr")
      .first()
      .getByRole("link")
      .first()
      .textContent();
    expect(quoteNumber).toBeTruthy();

    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(quoteNumber!.trim())}`);
    await expect(page.locator("main").getByRole("link", { name: quoteNumber!.trim() })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("cancelling a quote requires confirmation and shows the Cancelled status", async ({
    page,
  }) => {
    await createQuote(page, CANCEL_QUOTE_DESCRIPTION);

    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button", { name: "Cancel quote" }).click();

    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Mark as Sent" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).not.toBeVisible();
  });

  test("mobile: quotes list and detail pages are usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/quotes`);
    await expect(page.getByRole("heading", { name: "Quotes" })).toBeVisible();
    await expect(page.getByRole("link", { name: /QUO-/ }).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: /QUO-/ }).first().click();
    await page.waitForURL(QUOTE_DETAIL_URL);
    await expect(page.getByRole("heading", { name: "QUO-" })).toBeVisible();
  });
});
