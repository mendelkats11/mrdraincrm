// Plain text is always the source of truth; HTML is a nicer-looking
// companion. Every value interpolated into HTML comes from the public
// contact form, so it is escaped.

const ACCENT = "#1e3a5f";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
                <span style="color:#ffffff;font-size:16px;font-weight:700;">${escapeHtml(businessName)}</span>
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

export interface LeadNotificationEmailInput {
  name: string;
  phone: string;
  email: string | null;
  issueDescription: string;
  emergency: boolean;
  /** Already-formatted, e.g. "Service area: Brighton". */
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
     <p>Name: ${escapeHtml(input.name)}<br/>
     Phone: ${escapeHtml(input.phone)}<br/>
     ${input.email ? `Email: ${escapeHtml(input.email)}<br/>` : ""}
     ${input.sourceDetails ? `${escapeHtml(input.sourceDetails)}<br/>` : ""}
     ${input.emergency ? `<strong style="color:#b91c1c;">EMERGENCY</strong><br/>` : ""}
     </p>
     <p>Issue: ${escapeHtml(input.issueDescription)}</p>`,
  );
  return { subject, text, html };
}
