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
