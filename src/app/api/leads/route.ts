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
import { normalizePhone } from "@/lib/phone";
import { createLeadFromPublicSubmission } from "@/lib/crm/leads";

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
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const nfClientIp = request.headers.get("x-nf-client-connection-ip");
  if (nfClientIp) return nfClientIp;
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

  try {
    await createLeadFromPublicSubmission(db, {
      name: parsed.data.name,
      phone,
      email: parsed.data.email ? parsed.data.email.toLowerCase() : null,
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

  return NextResponse.json({ ok: true });
}
