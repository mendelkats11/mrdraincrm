import type { EmailProvider, SendEmailInput } from "./provider";

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Talks to Resend's REST API directly via fetch rather than pulling in the
 * `resend` SDK package — the request shape is small and stable enough that
 * a new dependency isn't worth it (docs/ARCHITECTURE.md §1's "inexpensive,
 * provider-portable" principle; swapping providers later means changing
 * this one file either way).
 */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // RFC 5322 "Display Name <address>" — without a display name, mail
        // clients fall back to showing the raw address (or, per a live
        // report, something worse-looking derived from it), which reads as
        // spammy/untrustworthy for a business's own outbound mail.
        from: `Mr. Drain Plumber <${this.fromEmail}>`,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: input.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content.toString("base64"),
        })),
      }),
    });

    if (!response.ok) {
      // Never let a raw response body (could echo request details) bubble
      // further than this error message, which is only ever logged
      // server-side by the caller (src/lib/email/send-tracked-email.ts) —
      // never returned to a browser.
      const body = await response.text().catch(() => "");
      throw new Error(`Resend API error ${response.status}: ${body.slice(0, 500)}`);
    }
  }
}
