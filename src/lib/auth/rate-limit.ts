import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { activities } from "@/lib/db/schema";

/**
 * Brute-force protection for login, backed by the existing `activities`
 * table rather than a new one — see docs/IMPLEMENTATION_PLAN.md §2.1's
 * "safest reversible implementation" principle and the Phase 2 completion
 * report for the full reasoning.
 *
 * `activities.entity_id` is `uuid NOT NULL`, but a failed login attempt
 * against a *nonexistent* email has no real user row to attach to — rate
 * limiting must still cover that case (it's the classic account-
 * enumeration/brute-force target). `deterministicIdFrom` derives a stable
 * pseudo-UUID from a normalized string (email or IP) purely for grouping
 * these rows; it is not a real entity and never referenced by a foreign
 * key. This keeps rate limiting and the authentication audit trail on one
 * table with zero schema changes.
 */

export const LOGIN_ATTEMPT_EMAIL_ENTITY_TYPE = "login_attempt_email";
export const LOGIN_ATTEMPT_IP_ENTITY_TYPE = "login_attempt_ip";

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_ATTEMPTS = 5;

// Public lead-submission rate limiting (Phase 4) — same table, same
// deterministic-IP-to-entity-id trick, its own entity type/action/window so
// it can't be confused with (or exhausted by) login attempts.
export const LEAD_SUBMISSION_IP_ENTITY_TYPE = "lead_submission_ip";
export const LEAD_SUBMISSION_ATTEMPT_ACTION = "lead_submission_attempt";
export const LEAD_SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
export const LEAD_SUBMISSION_MAX_ATTEMPTS = 5;

// CallRail webhook auth-failure rate limiting (Phase 18 hardening) — the
// route is secret-gated rather than session-gated (it's called by CallRail's
// own servers, which have no session cookie), so this doesn't throttle
// legitimate traffic at all: a request with the correct secret never
// touches this counter. It exists purely to slow down someone trying to
// guess/brute-force CALLRAIL_WEBHOOK_SECRET.
export const CALLRAIL_WEBHOOK_FAILED_AUTH_IP_ENTITY_TYPE = "callrail_webhook_failed_auth_ip";
export const CALLRAIL_WEBHOOK_FAILED_AUTH_ACTION = "callrail_webhook_auth_failed";
export const CALLRAIL_WEBHOOK_FAILED_AUTH_WINDOW_MS = 15 * 60 * 1000;
export const CALLRAIL_WEBHOOK_FAILED_AUTH_MAX_ATTEMPTS = 10;

// Password-reset-request rate limiting (Phase 18 hardening) — same table,
// same dual email+IP shape as login: stops both spamming reset emails at
// one address and one IP sweeping many addresses. Counts every request
// (not just ones for a registered email) so the limiter itself can't be
// used to distinguish a registered address from an unregistered one.
export const PASSWORD_RESET_ATTEMPT_EMAIL_ENTITY_TYPE = "password_reset_attempt_email";
export const PASSWORD_RESET_ATTEMPT_IP_ENTITY_TYPE = "password_reset_attempt_ip";
export const PASSWORD_RESET_ATTEMPT_ACTION = "password_reset_attempted";
export const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;

export function deterministicIdFrom(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function countRecentFailedLogins<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  entityType: string,
  entityId: string,
): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const rows = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.entityType, entityType),
        eq(activities.entityId, entityId),
        eq(activities.action, "login_failed"),
        gt(activities.createdAt, since),
      ),
    );
  return rows.length;
}

/**
 * Counts recent public lead-submission attempts from one IP, regardless of
 * whether the submission was ultimately valid — the caller records one
 * `lead_submission_attempt` row per incoming request before doing any real
 * work, so a flood of malformed payloads counts against the limit exactly
 * like a flood of valid ones.
 */
/**
 * Counts recent password-reset requests against one entity (email or IP,
 * both keyed the same way login's dual counters are), regardless of
 * whether the targeted email is actually registered — the caller records
 * one row per incoming request before checking anything else, so the
 * limiter's own behavior can't be used to distinguish a registered address
 * from an unregistered one.
 */
export async function countRecentPasswordResetAttempts<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  entityType: string,
  entityId: string,
): Promise<number> {
  const since = new Date(Date.now() - PASSWORD_RESET_WINDOW_MS);
  const rows = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.entityType, entityType),
        eq(activities.entityId, entityId),
        eq(activities.action, PASSWORD_RESET_ATTEMPT_ACTION),
        gt(activities.createdAt, since),
      ),
    );
  return rows.length;
}

/** Counts recent failed CallRail webhook auth attempts from one IP. */
export async function countRecentCallRailAuthFailures<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  ipEntityId: string,
): Promise<number> {
  const since = new Date(Date.now() - CALLRAIL_WEBHOOK_FAILED_AUTH_WINDOW_MS);
  const rows = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.entityType, CALLRAIL_WEBHOOK_FAILED_AUTH_IP_ENTITY_TYPE),
        eq(activities.entityId, ipEntityId),
        eq(activities.action, CALLRAIL_WEBHOOK_FAILED_AUTH_ACTION),
        gt(activities.createdAt, since),
      ),
    );
  return rows.length;
}

export async function countRecentLeadSubmissions<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
  ipEntityId: string,
): Promise<number> {
  const since = new Date(Date.now() - LEAD_SUBMISSION_WINDOW_MS);
  const rows = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.entityType, LEAD_SUBMISSION_IP_ENTITY_TYPE),
        eq(activities.entityId, ipEntityId),
        eq(activities.action, LEAD_SUBMISSION_ATTEMPT_ACTION),
        gt(activities.createdAt, since),
      ),
    );
  return rows.length;
}
