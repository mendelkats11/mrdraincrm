import { ConsoleEmailProvider } from "./console-provider";
import type { EmailProvider } from "./provider";

export type { EmailProvider, SendEmailInput } from "./provider";

let provider: EmailProvider | undefined;

// Swap this for a Resend-backed implementation in Phase 14 — nothing
// outside this file needs to change.
export function getEmailProvider(): EmailProvider {
  if (!provider) {
    provider = new ConsoleEmailProvider();
  }
  return provider;
}
