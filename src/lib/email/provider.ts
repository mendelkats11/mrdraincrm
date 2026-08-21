// Provider-agnostic email interface — docs/ARCHITECTURE.md §13,
// docs/IMPLEMENTATION_PLAN.md §9.1. Resend is the production implementation
// (Phase 14, src/lib/email/resend-provider.ts); getEmailProvider() below
// falls back to a console-logging dev implementation when no Resend API
// key is configured.

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  /** Optional — plain text is always sent as a fallback; not every email
   *  (password reset, invites) needs a styled version. */
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
