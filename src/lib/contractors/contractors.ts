import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
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
  notes?: string | null;
  defaultPayoutArrangement?: string | null;
}

/**
 * Full create — Phase 6's quick-create (name/phone/email only) is still
 * reachable by simply omitting notes/defaultPayoutArrangement. The row is
 * always created active.
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
        notes: input.notes || null,
        defaultPayoutArrangement: input.defaultPayoutArrangement || null,
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

export interface UpdateContractorInput {
  name?: string;
  phone?: NormalizedPhone | null;
  email?: string | null;
  notes?: string | null;
  defaultPayoutArrangement?: string | null;
}

/**
 * `defaultPayoutArrangement` is a free-text note only (e.g. "60/40") — it is
 * never read by any calculation. Actual payout stays exclusively the manual
 * `jobs.contractorPayoutCents` field (docs/CLAUDE.md §6,
 * docs/PROJECT_SPEC.md §10).
 */
export async function updateContractor<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
  input: UpdateContractorInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(contractors).where(eq(contractors.id, contractorId));
    if (!before) throw new Error(`Contractor ${contractorId} not found`);

    const [after] = await tx
      .update(contractors)
      .set({
        name: input.name,
        phone: input.phone !== undefined ? (input.phone?.e164 ?? null) : undefined,
        email: input.email !== undefined ? input.email || null : undefined,
        notes: input.notes !== undefined ? input.notes || null : undefined,
        defaultPayoutArrangement:
          input.defaultPayoutArrangement !== undefined
            ? input.defaultPayoutArrangement || null
            : undefined,
      })
      .where(eq(contractors.id, contractorId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contractor",
      entityId: contractorId,
      action: "contractor_updated",
      oldValue: {
        name: before.name,
        phone: before.phone,
        email: before.email,
        notes: before.notes,
        defaultPayoutArrangement: before.defaultPayoutArrangement,
      },
      newValue: {
        name: after.name,
        phone: after.phone,
        email: after.email,
        notes: after.notes,
        defaultPayoutArrangement: after.defaultPayoutArrangement,
      },
    });

    return after;
  });
}

/**
 * Deactivating a contractor is forward-looking only — it stops them
 * appearing in `searchContractors` (used by the job assignment picker) for
 * *new* assignments, but never hides their existing data, jobs, or payout
 * history, unlike Contacts' archive pattern which does hide from default
 * list views. There is no "hard delete" for contractors, consistent with
 * docs/CLAUDE.md §6 ("important business records are archived ... instead
 * of hard-deleted").
 */
export async function setContractorActive<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contractorId: string,
  active: boolean,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [contractor] = await tx
      .update(contractors)
      .set({ active })
      .where(eq(contractors.id, contractorId))
      .returning();
    if (!contractor) throw new Error(`Contractor ${contractorId} not found`);

    await recordActivity(tx, {
      actorUserId,
      entityType: "contractor",
      entityId: contractorId,
      action: active ? "contractor_activated" : "contractor_deactivated",
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

export interface ListContractorsFilters {
  search?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}

export async function listContractors<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListContractorsFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (filters.status === "inactive") {
    conditions.push(eq(contractors.active, false));
  } else if (filters.status !== "all") {
    conditions.push(eq(contractors.active, true));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(contractors.name, term),
        ilike(contractors.phone, term),
        ilike(contractors.email, term),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(contractors)
    .where(where)
    .orderBy(asc(contractors.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contractors)
    .where(where);

  return { rows, total: count, page, pageSize };
}
