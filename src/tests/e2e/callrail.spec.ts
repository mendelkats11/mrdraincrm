import { test, expect } from "@playwright/test";
import { E2E_APP_ORIGIN } from "../../../playwright.config";
import { E2E_NAME_PREFIX } from "./e2e-credentials";

const CALL_DETAIL_URL = /\/calls\/[0-9a-f-]+$/;

function callId(suffix: string): string {
  return `${E2E_NAME_PREFIX} CAL-${suffix}`;
}

/**
 * page.request (Node's own network stack) can't resolve the app.localhost
 * hostname-routing subdomain the way Chromium can (Phase 8/9 lesson) — the
 * webhook POST is made from inside the page instead, which inherits
 * Chromium's *.localhost resolution for free. The shared secret is a value
 * *we* define (not issued by CallRail), loaded from .env.local same as
 * global-setup.ts/cleanup.ts already do.
 */
async function postWebhook(
  page: import("@playwright/test").Page,
  payload: Record<string, unknown>,
  secretOverride?: string,
) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Already loaded by Playwright's globalSetup in this same run.
  }
  const secret = secretOverride ?? process.env.CALLRAIL_WEBHOOK_SECRET ?? "";

  return page.evaluate(
    async ({ url, payload, secret }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-callrail-webhook-secret": secret },
        body: JSON.stringify(payload),
      });
      return { status: res.status, body: await res.json() };
    },
    { url: `${E2E_APP_ORIGIN}/api/webhooks/callrail`, payload, secret },
  );
}

test.describe.serial("CallRail calls and messages", () => {
  test("rejects a webhook request with a missing or wrong secret", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/calls`);
    const result = await postWebhook(
      page,
      { id: callId("unauth"), customer_phone_number: "+13065550001" },
      "wrong-secret",
    );
    expect(result.status).toBe(401);
  });

  test("an incoming call webhook creates an unmatched call", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/calls`);
    const result = await postWebhook(page, {
      id: callId("unmatched"),
      customer_phone_number: "+13065550002",
      answered: true,
      duration: 42,
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, duplicate: false });

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await expect(page.getByRole("cell", { name: "(306) 555-0002" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("the exact same webhook delivered twice creates exactly one call", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/calls`);
    const payload = { id: callId("dupe"), customer_phone_number: "+13065550003" };
    const first = await postWebhook(page, payload);
    const second = await postWebhook(page, payload);

    expect(first.body).toMatchObject({ duplicate: false });
    expect(second.body).toMatchObject({ duplicate: true });

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await expect(page.getByRole("cell", { name: "(306) 555-0003" })).toHaveCount(1);
  });

  test("creating a contact from an unknown call matches it, and retroactively matches earlier calls from the same number", async ({
    page,
  }) => {
    const contactName = `${E2E_NAME_PREFIX} Caller Contact`;
    await page.goto(`${E2E_APP_ORIGIN}/calls`);

    const first = await postWebhook(page, {
      id: callId("hist-1"),
      customer_phone_number: "+13065550004",
    });
    const second = await postWebhook(page, {
      id: callId("hist-2"),
      customer_phone_number: "+13065550004",
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await page.getByRole("link", { name: "(306) 555-0004" }).first().click();
    await page.waitForURL(CALL_DETAIL_URL);

    await page.getByRole("button", { name: "Create Contact" }).click();
    await page.getByLabel("Name").fill(contactName);
    await page.getByRole("button", { name: "Create Contact" }).last().click();

    await page.waitForURL(/\/contacts\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: contactName })).toBeVisible({ timeout: 10_000 });

    // Both calls from this number now show as matched.
    await page.goto(`${E2E_APP_ORIGIN}/calls?status=matched`);
    await expect(page.getByRole("cell", { name: contactName }).first()).toBeVisible({
      timeout: 10_000,
    });
    const matchedRows = page.getByRole("cell", { name: contactName });
    await expect(matchedRows).toHaveCount(2);
  });

  test("creating a lead from an unknown call creates a linked contact and lead", async ({
    page,
  }) => {
    const leadName = `${E2E_NAME_PREFIX} Lead Caller`;
    await page.goto(`${E2E_APP_ORIGIN}/calls`);

    await postWebhook(page, { id: callId("lead"), customer_phone_number: "+13065550005" });

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await page.getByRole("link", { name: "(306) 555-0005" }).click();
    await page.waitForURL(CALL_DETAIL_URL);

    await page.getByRole("button", { name: "Create Lead" }).click();
    await page.getByLabel("Name").fill(leadName);
    await page.getByLabel("Issue / work description").fill("Leaky faucet from a CallRail lead");
    await page.getByRole("button", { name: "Create Lead" }).last().click();

    await page.waitForURL(/\/leads\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: leadName })).toBeVisible({ timeout: 10_000 });
  });

  test("ignoring a call removes it from the Unmatched filter", async ({ page }) => {
    await page.goto(`${E2E_APP_ORIGIN}/calls`);
    await postWebhook(page, { id: callId("ignore"), customer_phone_number: "+13065550006" });

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await page.getByRole("link", { name: "(306) 555-0006" }).click();
    await page.waitForURL(CALL_DETAIL_URL);

    await page.getByRole("button", { name: "Ignore" }).click();
    await expect(page.getByText("Ignored", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await expect(page.getByRole("cell", { name: "(306) 555-0006" })).not.toBeVisible();

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=ignored`);
    await expect(page.getByRole("cell", { name: "(306) 555-0006" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("a matched call is findable via global search", async ({ page }) => {
    const contactName = `${E2E_NAME_PREFIX} Search Caller`;
    await page.goto(`${E2E_APP_ORIGIN}/calls`);
    await postWebhook(page, { id: callId("search"), customer_phone_number: "+13065550007" });

    await page.goto(`${E2E_APP_ORIGIN}/calls?status=unmatched`);
    await page.getByRole("link", { name: "(306) 555-0007" }).click();
    await page.waitForURL(CALL_DETAIL_URL);
    await page.getByRole("button", { name: "Create Contact" }).click();
    await page.getByLabel("Name").fill(contactName);
    await page.getByRole("button", { name: "Create Contact" }).last().click();
    await page.waitForURL(/\/contacts\/[0-9a-f-]+$/);

    await page.goto(`${E2E_APP_ORIGIN}/search?q=${encodeURIComponent(contactName)}`);
    await expect(page.locator("main").getByRole("link", { name: contactName }).first()).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("an incoming SMS webhook creates a message, visible on the Messages page", async ({
    page,
  }) => {
    const messageBody = `${E2E_NAME_PREFIX} test message body`;
    await page.goto(`${E2E_APP_ORIGIN}/calls`);
    const result = await postWebhook(page, {
      id: callId("sms"),
      customer_phone_number: "+13065550008",
      text: messageBody,
    });
    expect(result.status).toBe(200);

    await page.goto(`${E2E_APP_ORIGIN}/messages`);
    await expect(page.getByText(messageBody)).toBeVisible({ timeout: 10_000 });
  });

  test("mobile: calls page is usable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${E2E_APP_ORIGIN}/calls?status=all`);
    await expect(page.getByRole("heading", { name: "Calls" })).toBeVisible();
  });
});
