// Provider-agnostic email interface — docs/ARCHITECTURE.md §13,
// docs/IMPLEMENTATION_PLAN.md §9.1. Resend is the intended production
// implementation (Phase 14); it is deliberately not wired up yet per this
// phase's explicit scope. getEmailProvider() below returns a
// console-logging dev implementation until then.

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<void>;
}
