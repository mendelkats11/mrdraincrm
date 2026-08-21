import type { EmailProvider, SendEmailInput } from "./provider";

/**
 * Dev-mode stand-in: logs the email to the server console instead of
 * actually sending it. Used whenever RESEND_API_KEY isn't configured — the
 * console output is how password-reset/invite links are retrieved for
 * local manual testing (see docs/IMPLEMENTATION_PLAN.md Phase 2 report).
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    const to = Array.isArray(input.to) ? input.to.join(", ") : input.to;
    const attachmentNote = input.attachments?.length
      ? ` [+${input.attachments.length} attachment(s): ${input.attachments.map((a) => a.filename).join(", ")}]`
      : "";
    console.log(
      `[dev-email] to=${to} subject="${input.subject}"${attachmentNote}\n${input.text}\n[/dev-email]`,
    );
  }
}
