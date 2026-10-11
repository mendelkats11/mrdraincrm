import type { EmailProvider, SendEmailInput } from "./provider";

/**
 * Dev-mode stand-in: logs the email to the server console instead of
 * actually sending it. Used whenever RESEND_API_KEY isn't configured, for
 * local manual testing.
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
