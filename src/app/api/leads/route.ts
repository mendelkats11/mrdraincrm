import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { normalizePhone, formatPhoneForDisplay } from "@/lib/phone";
import { getEmailProvider } from "@/lib/email";
import { leadNotificationEmailTemplate } from "@/lib/email/templates";
import { serviceAreas } from "@/lib/website/site-data";

// The site no longer has a database or CRM behind it (Sep 2026 - see
// docs/CLAUDE.md's project overview) - a submitted lead's only destination
// now is a direct email to the business, not a stored `leads` row. Nothing
// here is tracked or persisted anywhere; a failed email send means the
// submission is genuinely lost, which is why the recipient list is
// validated at startup-adjacent time (first request) rather than silently
// doing nothing.

const publicLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().min(1, "Phone is required").max(32),
  email: z.string().trim().min(1, "Email is required").max(320).email(),
  serviceAreaId: z.string().optional(),
  issueDescription: z.string().trim().min(1, "Please describe the issue").max(2000),
  emergency: z.boolean().optional(),
});

const GENERIC_ERROR = "Something went wrong. Please try again or call us directly.";
const RATE_LIMITED_ERROR = "Too many requests. Please try again later or call us directly.";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getClientIp(request: NextRequest): string {
  const nfClientIp = request.headers.get("x-nf-client-connection-ip");
  if (nfClientIp) return nfClientIp;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

// In-memory per-IP rate limit — sufficient on Hostinger's persistent Node
// process (unlike a serverless function, this module-level state actually
// survives between requests), and there's no database left to back a
// durable version with. Resets if the process restarts; that's an
// acceptable tradeoff for a low-traffic lead form, not a security boundary.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const recentAttemptsByIp = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (recentAttemptsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  attempts.push(now);
  recentAttemptsByIp.set(ip, attempts);
  return attempts.length > RATE_LIMIT_MAX_ATTEMPTS;
}

function leadNotificationRecipients(): string[] {
  return (process.env.LEAD_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request))) {
    return errorResponse(RATE_LIMITED_ERROR, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(GENERIC_ERROR, 400);
  }

  const parsed = publicLeadSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(GENERIC_ERROR, 400);
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return errorResponse(GENERIC_ERROR, 400);
  }

  const recipients = leadNotificationRecipients();
  if (recipients.length === 0) {
    console.error("Public lead submission failed: LEAD_NOTIFICATION_EMAILS is not configured.");
    return errorResponse(GENERIC_ERROR, 500);
  }

  const area = parsed.data.serviceAreaId
    ? serviceAreas.find((a) => a.id === parsed.data.serviceAreaId)
    : undefined;

  const notification = leadNotificationEmailTemplate({
    name: parsed.data.name,
    phone: formatPhoneForDisplay(phone.e164),
    email: parsed.data.email.toLowerCase(),
    issueDescription: parsed.data.issueDescription,
    emergency: parsed.data.emergency ?? false,
    sourceDetails: area ? `Service area: ${area.name}` : null,
  });

  try {
    await getEmailProvider().send({ to: recipients, ...notification });
  } catch (error) {
    console.error("Public lead submission failed to send:", error);
    return errorResponse(GENERIC_ERROR, 500);
  }

  return NextResponse.json({ ok: true });
}
