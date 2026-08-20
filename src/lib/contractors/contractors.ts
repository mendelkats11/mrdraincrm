import { and, eq, ilike } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { contractors } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import type { NormalizedPhone } from "@/lib/phone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface CreateContractorInput {
  name: string;
  phone?: NormalizedPhone | null;
  email?: string | null;
}

/**
 * Minimal quick-create for Phase 6 — just enough for the assignment picker
 * to have something to search-or-create against. The resulting row is a
 * normal `contractors` record (active by default, no payout arrangement
 * set) that Phase 7 will later manage fully (profile, payout history,
 * active/inactive, totals) — this function does not anticipate any of that,
 * it only creates the row.
 */
export async function createContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateContractorInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [contractor] = await tx
      .insert(contractors)
      .values({
        name: input.name,
        phone: input.phone?.e164 ?? null,
        email: input.email || null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contractor",
      entityId: contractor.id,
      action: "contractor_created",
      newValue: { name: contractor.name },
    });

    return contractor;
  });
}

export interface ContractorSearchResult {
  id: string;
  name: string;
}

export async function searchContractors<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  query: string,
): Promise<ContractorSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .where(and(eq(contractors.active, true), ilike(contractors.name, `%${trimmed}%`)))
    .limit(10);
}

export async function getContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
) {
  const [row] = await db.select().from(contractors).where(eq(contractors.id, contractorId));
  return row ?? null;
}
