import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const JOB_ISSUE = `${E2E_NAME_PREFIX} Invoice test job`;
const VOID_JOB_ISSUE = `${E2E_NAME_PREFIX} Invoice void test job`;
const JOB_DETAIL_URL = /\/jobs\/[0-9a-f-]+$/;
const INVOICE_DETAIL_URL = /\/invoices\/[0-9a-f-]+$/;

async function createJob(page: import("@playwright/test").Page, issueDescription: string) {
  await page.goto(`${E2E_APP_ORIGIN}/jobs/new`);
  await page.getByLabel("Issue / work description").fill(issueDescription);
  await page.getByRole("button", { name: "Create job" }).click();
  await page.waitForURL(JOB_DETAIL_URL);
  return page.url();
}

test.describe.serial("Invoices and payments", () => {
  test("create an invoice from a job, add line items, and see the total", async ({ page }) => {
    await createJob(page, JOB_ISSUE);

    await page.getByRole("link", { name: "+ New Invoice" }).click();
    await page.waitForURL(/\/invoices\/new\?jobId=/);

    await page.getByLabel("Business name").fill(`${E2E_NAME_PREFIX} Plumbing`);
    await page.getByLabel("Customer name").fill(`${E2E_NAME_PREFIX} Customer`);
    await page.getByLabel("Tax amount").fill("13.00");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await page.waitForURL(INVOICE_DETAIL_URL);

    await expect(page.getByRole("heading", { name: "INV-" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    // Add a real line item.
    await page.getByLabel("Description").fill("Toilet replacement");
    await page.getByLabel("Unit price").fill("250.00");
    await page.getByRole("button", { name: "Add line item" }).click();
    // Scoped to a table cell — the page's activity timeline also renders the
    // description text inside a raw JSON diff string, which a bare
    // getByText match would ambiguously match too.
    await expect(page.getByRole("cell", { name: "Toilet replacement", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Add a discount line (negative unit price).
    await page.getByLabel("Description").fill("Loyalty discount");
    await page.getByLabel("Unit price").fill("-25.00");
    await page.getByRole("button", { name: "Add line item" }).click();
    await expect(page.getByRole("cell", { name: "Loyalty discount", exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Subtotal = 250 - 25 = 225; total = 225 + 13 tax = 238.
    await expect(page.getByText("Subtotal: $225.00")).toBeVisible();
    await expect(page.getByText("Tax: $13.00")).toBeVisible();
    await expect(page.getByText("Total: $238.00")).toBeVisible();
  });

  test("the PDF endpoint returns a real PDF for the invoice", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);
    await page.getByRole("link", { name: /INV-/ }).click();
    await page.waitForURL(INVOICE_DETAIL_URL);

    const downloadLink = page.getByRole("link", { name: "Download PDF" });
    await expect(downloadLink).toBeVisible();
    const href = await downloadLink.getAttribute("href");
    expect(href).toMatch(/\/api\/invoices\/[0-9a-f-]+\/pdf/);

    // page.request (Node's own network stack) can't resolve the
    // app.localhost hostname-routing subdomain the way Chromium can, so the
    // request is made from inside the page instead — it inherits both the
    // session cookie and Chromium's *.localhost resolution for free.
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
    // A real PDF file always starts with this magic header.
    expect(body.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  test("marking as Sent locks line-item editing and downloading never marks it Sent by itself", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);
    await page.getByRole("link", { name: /INV-/ }).click();
    await page.waitForURL(INVOICE_DETAIL_URL);

    // Still Draft — downloading the PDF (already exercised in the previous
    // test via a direct request) must not have flipped the status.
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add line item" })).toBeVisible();

    await page.getByRole("button", { name: "Mark as Sent" }).click();
    await expect(page.getByText("Sent", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Line-item add form and per-row Edit/Remove controls are gone now.
    await expect(page.getByRole("button", { name: "Add line item" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Mark as Sent" })).not.toBeVisible();
  });

  test("recording a partial payment shows Partially Paid, and a second payment completes it", async ({
    page,
  }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);
    await page.getByRole("link", { name: /INV-/ }).click();
    await page.waitForURL(INVOICE_DETAIL_URL);

    // Total is $238.00 (from the first test). Record a partial payment.
    await page.getByRole("button", { name: "Record payment" }).click();
    await page.getByLabel("Amount").fill("100.00");
    await page.getByLabel("Method").click();
    await page.getByRole("option", { name: "E-Transfer", exact: true }).click();
    await page.getByRole("button", { name: "Record payment" }).last().click();

    await expect(page.getByText("Partially Paid", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("$138.00")).toBeVisible();

    // Complete it.
    await page.getByRole("button", { name: "Record payment" }).click();
    await page.getByLabel("Amount").fill("138.00");
    await page.getByLabel("Method").click();
    await page.getByRole("option", { name: "Cash", exact: true }).click();
    await page.getByRole("button", { name: "Record payment" }).last().click();

    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Paid in full")).toBeVisible();
  });

  test("activity history shows the full invoice/payment lifecycle", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);
    await page.getByRole("link", { name: /INV-/ }).click();
    await page.waitForURL(INVOICE_DETAIL_URL);

    await expect(page.getByText("Invoice created")).toBeVisible();
    await expect(page.getByText("Invoice status changed").first()).toBeVisible();
  });

  test("the job page's Invoices card links back to the invoice", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(JOB_ISSUE)}`);
    await page.locator("main").getByRole("link").first().click();
    await page.waitForURL(JOB_DETAIL_URL);

    // The job page's section titles are Card headers (a styled div, not a
    // semantic heading element), so they're asserted by exact text instead
    // of role — scoped to <main> to avoid the sidebar's "Invoices" nav link.
    await expect(page.locator("main").getByText("Invoices", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /INV-/ })).toBeVisible();
    await expect(page.locator("main").getByText("Payments", { exact: true })).toBeVisible();
  });

  test("an invoice is findable via global search", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/invoices`);
    const invoiceNumber = await page
      .locator("table tbody tr")
      .first()
      .getByRole("link")
      .first()
      .textContent();
    expect(invoiceNumber).toBeTruthy();

    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(invoiceNumber!.trim())}`);
    await expect(
      page.locator("main").getByRole("link", { name: invoiceNumber!.trim() }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("voiding an invoice requires a reason and shows the Void status", async ({ page }) => {
    await createJob(page, VOID_JOB_ISSUE);
    await page.getByRole("link", { name: "+ New Invoice" }).click();
    await page.waitForURL(/\/invoices\/new\?jobId=/);
    await page.getByRole("button", { name: "Create invoice" }).click();
    await page.waitForURL(INVOICE_DETAIL_URL);

    await page.getByRole("button", { name: "Void" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    // Confirm button is disabled until a reason is entered.
    await expect(dialog.getByRole("button", { name: "Void invoice" })).toBeDisabled();
    await dialog.getByLabel("Reason").fill("Created for E2E testing");
    await dialog.getByRole("button", { name: "Void invoice" }).click();

    await expect(page.getByText("Void", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Mark as Sent" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Void" })).not.toBeVisible();
  });

  test("mobile: invoices list and detail pages are usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/invoices`);
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page.getByRole("link", { name: /INV-/ }).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: /INV-/ }).first().click();
    await page.waitForURL(INVOICE_DETAIL_URL);
    await expect(page.getByRole("heading", { name: "INV-" })).toBeVisible();
  });
});
