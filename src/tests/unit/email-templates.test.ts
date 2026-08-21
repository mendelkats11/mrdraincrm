import { describe, expect, it } from "vitest";
import {
  invoiceEmailTemplate,
  jobConfirmationEmailTemplate,
  leadNotificationEmailTemplate,
  quoteEmailTemplate,
} from "@/lib/email/templates";

describe("invoiceEmailTemplate", () => {
  it("includes the invoice number, total, and payment instructions", () => {
    const { subject, text, html } = invoiceEmailTemplate({
      businessName: "Mr. Drain Plumbing",
      invoiceNumber: "INV-0001",
      customerName: "Jane Doe",
      totalCents: 12345,
      paymentInstructions: "E-transfer to payments@mrdrainsk.com",
    });
    expect(subject).toContain("INV-0001");
    expect(text).toContain("INV-0001");
    expect(text).toContain("$123.45");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("E-transfer to payments@mrdrainsk.com");
    expect(html).toContain("INV-0001");
    expect(html).toContain("$123.45");
  });

  it("falls back to a generic greeting with no customer name", () => {
    const { text } = invoiceEmailTemplate({
      businessName: "Mr. Drain Plumbing",
      invoiceNumber: "INV-0002",
      customerName: null,
      totalCents: 500,
      paymentInstructions: null,
    });
    expect(text).toContain("Hello,");
    expect(text).not.toContain("Hi ,");
  });
});

describe("quoteEmailTemplate", () => {
  it("includes the quote number, total, and expiry when present", () => {
    const { subject, text } = quoteEmailTemplate({
      businessName: "Mr. Drain Plumbing",
      quoteNumber: "QUO-0001",
      customerName: "Jane Doe",
      totalCents: 25000,
      expiresAt: new Date(2026, 8, 1),
    });
    expect(subject).toContain("QUO-0001");
    expect(text).toContain("$250.00");
    expect(text).toContain("valid until");
  });

  it("omits the expiry line when there is no expiration date", () => {
    const { text } = quoteEmailTemplate({
      businessName: "Mr. Drain Plumbing",
      quoteNumber: "QUO-0002",
      customerName: null,
      totalCents: 1000,
      expiresAt: null,
    });
    expect(text).not.toContain("valid until");
  });
});

describe("jobConfirmationEmailTemplate", () => {
  it("includes the scheduled date/time when the job is scheduled", () => {
    const { text } = jobConfirmationEmailTemplate({
      businessName: "Mr. Drain Plumbing",
      jobNumber: "JOB-0001",
      customerName: "Jane Doe",
      serviceAddress: "123 Main St, Saskatoon",
      scheduledAt: new Date(2026, 8, 1, 14, 0),
      issueDescription: "Leaky faucet",
    });
    expect(text).toContain("JOB-0001");
    expect(text).toContain("scheduled for");
    expect(text).toContain("123 Main St, Saskatoon");
    expect(text).toContain("Leaky faucet");
  });

  it("uses a generic message when the job has no scheduled time", () => {
    const { text } = jobConfirmationEmailTemplate({
      businessName: "Mr. Drain Plumbing",
      jobNumber: "JOB-0002",
      customerName: null,
      serviceAddress: null,
      scheduledAt: null,
      issueDescription: null,
    });
    expect(text).toContain("We'll be in touch to confirm a time.");
  });
});

describe("leadNotificationEmailTemplate", () => {
  it("marks emergency leads clearly in the subject and body", () => {
    const { subject, text } = leadNotificationEmailTemplate({
      name: "John Smith",
      phone: "+13065550199",
      email: "john@example.com",
      issueDescription: "Burst pipe",
      emergency: true,
      sourceDetails: "Service area: Saskatoon",
    });
    expect(subject).toContain("[EMERGENCY]");
    expect(text).toContain("EMERGENCY");
    expect(text).toContain("John Smith");
    expect(text).toContain("Service area: Saskatoon");
    expect(text).toContain("Burst pipe");
  });

  it("omits emergency markers for a non-emergency lead", () => {
    const { subject, text } = leadNotificationEmailTemplate({
      name: "John Smith",
      phone: "+13065550199",
      email: null,
      issueDescription: "Slow drain",
      emergency: false,
      sourceDetails: null,
    });
    expect(subject).not.toContain("EMERGENCY");
    expect(text).not.toContain("EMERGENCY");
  });
});
