import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { recordActivity } from "@/lib/audit/activity";
import {
  LEAD_SUBMISSION_ATTEMPT_ACTION,
  LEAD_SUBMISSION_IP_ENTITY_TYPE,
  LEAD_SUBMISSION_MAX_ATTEMPTS,
  countRecentLeadSubmissions,
  deterministicIdFrom,
} from "@/lib/auth/rate-limit";
import { normalizePhone, formatPhoneForDisplay } from "@/lib/phone";
import { createLeadFromPublicSubmission } from "@/lib/crm/leads";
import { sendTrackedEmail } from "@/lib/email/send-tracked-email";
import { leadNotificationEmailTemplate } from "@/lib/email/templates";

// Comma-separated list of internal addresses that get an alert for every
// new lead — set once, read server-side only. If unset, no notification is
// sent (the lead is still created either way; this is a courtesy alert,
// not part of the lead's own correctness).
function leadNotificationRecipients(): string[] {
  return (process.env.LEAD_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

// The one genuinely public, unauthenticated write path in the system today
// (docs/IMPLEMENTATION_PLAN.md §18) — hardened at the level appropriate to
// Phase 4 (strict validation, rate limiting, generic errors, no existence
// disclosure), not to Phase 18's full security-hardening pass. A Route
// Handler rather than a Server Action per the route already listed in
// docs/IMPLEMENTATION_PLAN.md §10.

const publicLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: z.string().trim().min(1, "Phone is required").max(32),
  email: z.union([z.literal(""), z.string().trim().max(320).email()]).optional(),
  serviceAreaId: z.union([z.literal(""), z.string().uuid()]).optional(),
  issueDescription: z.string().trim().min(1, "Please describe the issue").max(2000),
  emergency: z.boolean().optional(),
});

const GENERIC_ERROR = "Something went wrong. Please try again or call us directly.";
const RATE_LIMITED_ERROR = "Too many requests. Please try again later or call us directly.";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getClientIp(request: NextRequest): string {
  // x-nf-client-connection-ip is set by Netlify's edge from the actual TCP
  // connection and cannot be overridden by the client — checked first for
  // that reason. x-forwarded-for is checked second only as a local-dev
  // fallback (Netlify not in front of the request): a client can freely set
  // x-forwarded-for on the initial request, and if the platform in front of
  // this handler merely appends to rather than replaces that header, naively
  // trusting its first entry lets an attacker rotate a fake value on every
  // request and defeat the per-IP rate limit below entirely.
  const nfClientIp = request.headers.get("x-nf-client-connection-ip");
  if (nfClientIp) return nfClientIp;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const ipEntityId = deterministicIdFrom(getClientIp(request));

  // Every incoming request counts against the limit before any validation
  // or DB write beyond this tracking row — a flood of malformed payloads is
  // rate-limited exactly like a flood of well-formed ones.
  let priorAttempts: number;
  try {
    priorAttempts = await countRecentLeadSubmissions(db, ipEntityId);
  } catch {
    return errorResponse(GENERIC_ERROR, 500);
  }
  if (priorAttempts >= LEAD_SUBMISSION_MAX_ATTEMPTS) {
    return errorResponse(RATE_LIMITED_ERROR, 429);
  }

  try {
    await recordActivity(db, {
      entityType: LEAD_SUBMISSION_IP_ENTITY_TYPE,
      entityId: ipEntityId,
      action: LEAD_SUBMISSION_ATTEMPT_ACTION,
    });
  } catch {
    return errorResponse(GENERIC_ERROR, 500);
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

  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
  let lead: Awaited<ReturnType<typeof createLeadFromPublicSubmission>>;
  try {
    lead = await createLeadFromPublicSubmission(db, {
      name: parsed.data.name,
      phone,
      email,
      serviceAreaId: parsed.data.serviceAreaId || null,
      issueDescription: parsed.data.issueDescription,
      emergency: parsed.data.emergency ?? false,
      landingPage: request.headers.get("referer") || "/contact",
    });
  } catch (error) {
    // Never leak DB/internal error detail to the public response — logged
    // server-side only.
    console.error("Public lead submission failed:", error);
    return errorResponse(GENERIC_ERROR, 500);
  }

  // Best-effort internal alert — the lead is already safely created above
  // regardless of whether this succeeds; a Resend hiccup must never turn
  // into a failed public submission (sendTrackedEmail already catches and
  // logs internally, its result is deliberately ignored here). Still
  // awaited, not fire-and-forget: Netlify Functions can freeze/terminate
  // the execution context right after the response is returned, so an
  // un-awaited send could simply never happen.
  const recipients = leadNotificationRecipients();
  if (recipients.length > 0) {
    const notification = leadNotificationEmailTemplate({
      name: parsed.data.name,
      phone: formatPhoneForDisplay(phone.e164),
      email,
      issueDescription: parsed.data.issueDescription,
      emergency: parsed.data.emergency ?? false,
      sourceDetails: lead.sourceDetails,
    });
    await sendTrackedEmail(db, {
      to: recipients,
      ...notification,
      template: "lead_notification",
      relatedEntityType: "lead",
      relatedEntityId: lead.id,
    });
  }

  return NextResponse.json({ ok: true });
}
