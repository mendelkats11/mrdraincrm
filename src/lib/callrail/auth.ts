import { timingSafeEqual } from "node:crypto";

/**
 * Phase 11 decision: CallRail's outbound-webhook configuration lets you
 * attach a custom header or query parameter, but not a specific signing
 * scheme guaranteed for every plan — so this checks a shared secret via
 * either a header (`x-callrail-webhook-secret`) or a `secret` query param,
 * whichever the owner's actual CallRail dashboard configuration ends up
 * using. Constant-time comparison, same primitive used for session tokens.
 */
export function verifyCallRailWebhookSecret(request: Request): boolean {
  const configured = process.env.CALLRAIL_WEBHOOK_SECRET;
  if (!configured) return false;

  const url = new URL(request.url);
  const provided =
    request.headers.get("x-callrail-webhook-secret") ?? url.searchParams.get("secret");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
