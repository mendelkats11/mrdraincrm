import { ConsoleEmailProvider } from "./console-provider";
import { ResendEmailProvider } from "./resend-provider";
import type { EmailProvider } from "./provider";

export type { EmailAttachment, EmailProvider, SendEmailInput } from "./provider";

let provider: EmailProvider | undefined;

/**
 * Resend-backed in any environment where RESEND_API_KEY/RESEND_FROM_EMAIL
 * are configured; falls back to the console dev provider otherwise (local
 * dev without the key, or a test environment). Nothing outside this file
 * needs to know which one is active.
 */
export function getEmailProvider(): EmailProvider {
  if (!provider) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    provider =
      apiKey && fromEmail ? new ResendEmailProvider(apiKey, fromEmail) : new ConsoleEmailProvider();
  }
  return provider;
}
