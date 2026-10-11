import { describe, expect, it } from "vitest";
import { leadNotificationEmailTemplate } from "@/lib/email/templates";

describe("leadNotificationEmailTemplate", () => {
  it("marks emergency leads clearly in the subject and body", () => {
    const { subject, text } = leadNotificationEmailTemplate({
      name: "John Smith",
      phone: "+13065550199",
      email: "john@example.com",
      issueDescription: "Burst pipe",
      emergency: true,
      sourceDetails: "Service area: Brighton",
    });
    expect(subject).toContain("[EMERGENCY]");
    expect(text).toContain("EMERGENCY");
    expect(text).toContain("John Smith");
    expect(text).toContain("Service area: Brighton");
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

  it("escapes visitor-supplied text in the HTML body", () => {
    const { html, text } = leadNotificationEmailTemplate({
      name: `<b>Evil</b>`,
      phone: "+13065550199",
      email: "x@example.com",
      issueDescription: `<a href="https://evil.example">click</a> & more`,
      emergency: false,
      sourceDetails: null,
    });
    expect(html).not.toContain("<b>Evil</b>");
    expect(html).not.toContain(`<a href="https://evil.example">`);
    expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
    expect(html).toContain("&amp; more");
    expect(text).toContain("<b>Evil</b>");
  });
});
