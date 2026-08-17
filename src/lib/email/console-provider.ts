import type { EmailProvider, SendEmailInput } from "./provider";

/**
 * Dev-mode stand-in: logs the email to the server console instead of
 * actually sending it. This is intentional for Phase 2 — Resend
 * production sending is explicitly out of scope for this phase. The
 * console output is how password-reset/invite links are retrieved for
 * local manual testing (see docs/IMPLEMENTATION_PLAN.md Phase 2 report).
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<void> {
    console.log(
      `[dev-email] to=${input.to} subject="${input.subject}"\n${input.text}\n[/dev-email]`,
    );
  }
}
