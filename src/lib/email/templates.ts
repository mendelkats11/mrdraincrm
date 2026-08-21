import { formatCents } from "@/lib/money";

// Structured, curated templates — not a free-form builder — matching the
// same "structured, not unrestricted" philosophy already used for invoice
// PDF customization (src/lib/pdf/invoice-template.ts, DESIGN_SYSTEM.md
// §19.1). Plain text is always the source of truth (every template returns
// text); HTML is a nicer-looking companion, not a replacement.

const ACCENT = "#1e3a5f";

function wrapHtml(businessName: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:${ACCENT};padding:20px 28px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;">${businessName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface InvoiceEmailInput {
  businessName: string;
  invoiceNumber: string;
  customerName: string | null;
  totalCents: number;
  paymentInstructions: string | null;
}

export function invoiceEmailTemplate(input: InvoiceEmailInput) {
  const greeting = input.customerName ? `Hi ${input.customerName},` : "Hello,";
  const subject = `Invoice ${input.invoiceNumber} from ${input.businessName}`;
  const paymentLine = input.paymentInstructions ? `\n\n${input.paymentInstructions}` : "";
  const text = `${greeting}\n\nYour invoice ${input.invoiceNumber} is attached. Total due: ${formatCents(input.totalCents)}.${paymentLine}\n\nThank you for your business,\n${input.businessName}`;
  const html = wrapHtml(
    input.businessName,
    `<p>${greeting}</p>
     <p>Your invoice <strong>${input.invoiceNumber}</strong> is attached.</p>
     <p style="font-size:18px;font-weight:700;">Total due: ${formatCents(input.totalCents)}</p>
     ${input.paymentInstructions ? `<p>${input.paymentInstructions}</p>` : ""}
     <p>Thank you for your business,<br/>${input.businessName}</p>`,
  );
  return { subject, text, html };
}

export interface QuoteEmailInput {
  businessName: string;
  quoteNumber: string;
  customerName: string | null;
  totalCents: number;
  expiresAt: Date | null;
}

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "long" });

export function quoteEmailTemplate(input: QuoteEmailInput) {
  const greeting = input.customerName ? `Hi ${input.customerName},` : "Hello,";
  const subject = `Quote ${input.quoteNumber} from ${input.businessName}`;
  const expiryLine = input.expiresAt
    ? `\n\nThis quote is valid until ${DATE_FMT.format(input.expiresAt)}.`
    : "";
  const text = `${greeting}\n\nYour quote ${input.quoteNumber} is attached. Total: ${formatCents(input.totalCents)}.${expiryLine}\n\nThank you,\n${input.businessName}`;
  const html = wrapHtml(
    input.businessName,
    `<p>${greeting}</p>
     <p>Your quote <strong>${input.quoteNumber}</strong> is attached.</p>
     <p style="font-size:18px;font-weight:700;">Total: ${formatCents(input.totalCents)}</p>
     ${input.expiresAt ? `<p>This quote is valid until ${DATE_FMT.format(input.expiresAt)}.</p>` : ""}
     <p>Thank you,<br/>${input.businessName}</p>`,
  );
  return { subject, text, html };
}

export interface JobConfirmationEmailInput {
  businessName: string;
  jobNumber: string;
  customerName: string | null;
  serviceAddress: string | null;
  scheduledAt: Date | null;
  issueDescription: string | null;
}

const DATETIME_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "long", timeStyle: "short" });

export function jobConfirmationEmailTemplate(input: JobConfirmationEmailInput) {
  const greeting = input.customerName ? `Hi ${input.customerName},` : "Hello,";
  const subject = `Appointment confirmation — ${input.businessName}`;
  const scheduleLine = input.scheduledAt
    ? `We have you scheduled for ${DATETIME_FMT.format(input.scheduledAt)}.`
    : "We'll be in touch to confirm a time.";
  const addressLine = input.serviceAddress ? `\nService address: ${input.serviceAddress}` : "";
  const issueLine = input.issueDescription ? `\nJob: ${input.issueDescription}` : "";
  const text = `${greeting}\n\nThis confirms your appointment with ${input.businessName} (Job ${input.jobNumber}).\n\n${scheduleLine}${addressLine}${issueLine}\n\nSee you soon,\n${input.businessName}`;
  const html = wrapHtml(
    input.businessName,
    `<p>${greeting}</p>
     <p>This confirms your appointment with <strong>${input.businessName}</strong> (Job ${input.jobNumber}).</p>
     <p>${scheduleLine}</p>
     ${input.serviceAddress ? `<p>Service address: ${input.serviceAddress}</p>` : ""}
     ${input.issueDescription ? `<p>Job: ${input.issueDescription}</p>` : ""}
     <p>See you soon,<br/>${input.businessName}</p>`,
  );
  return { subject, text, html };
}

export interface LeadNotificationEmailInput {
  name: string;
  phone: string;
  email: string | null;
  issueDescription: string;
  emergency: boolean;
  /** Already-formatted, e.g. "Service area: Saskatoon" — the lead's own
   *  sourceDetails field (src/lib/crm/leads.ts), reused as-is rather than
   *  re-deriving it here. */
  sourceDetails: string | null;
}

export function leadNotificationEmailTemplate(input: LeadNotificationEmailInput) {
  const subject = `${input.emergency ? "[EMERGENCY] " : ""}New lead: ${input.name}`;
  const lines = [
    `New lead submitted on the website.`,
    ``,
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    input.email ? `Email: ${input.email}` : null,
    input.sourceDetails,
    input.emergency ? `EMERGENCY` : null,
    ``,
    `Issue: ${input.issueDescription}`,
  ].filter((line): line is string => line !== null);
  const text = lines.join("\n");
  const html = wrapHtml(
    "Mr. Drain",
    `<p><strong>New lead submitted on the website.</strong></p>
     <p>Name: ${input.name}<br/>
     Phone: ${input.phone}<br/>
     ${input.email ? `Email: ${input.email}<br/>` : ""}
     ${input.sourceDetails ? `${input.sourceDetails}<br/>` : ""}
     ${input.emergency ? `<strong style="color:#b91c1c;">EMERGENCY</strong><br/>` : ""}
     </p>
     <p>Issue: ${input.issueDescription}</p>`,
  );
  return { subject, text, html };
}
