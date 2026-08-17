import { and, asc, eq, ilike, isNull, isNotNull, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { organizations } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface CreateOrganizationInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function createOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateOrganizationInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "organization",
      entityId: organization.id,
      action: "organization_created",
      newValue: { name: organization.name },
    });

    return organization;
  });
}

export interface UpdateOrganizationInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function updateOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
  input: UpdateOrganizationInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    if (!before) throw new Error(`Organization ${organizationId} not found`);

    const [after] = await tx
      .update(organizations)
      .set(input)
      .where(eq(organizations.id, organizationId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "organization",
      entityId: organizationId,
      action: "organization_updated",
      oldValue: {
        name: before.name,
        phone: before.phone,
        email: before.email,
        address: before.address,
        notes: before.notes,
      },
      newValue: {
        name: after.name,
        phone: after.phone,
        email: after.email,
        address: after.address,
        notes: after.notes,
      },
    });

    return after;
  });
}

export async function archiveOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .update(organizations)
      .set({ archivedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "organization",
      entityId: organizationId,
      action: "organization_archived",
    });

    return organization;
  });
}

export async function unarchiveOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .update(organizations)
      .set({ archivedAt: null })
      .where(eq(organizations.id, organizationId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "organization",
      entityId: organizationId,
      action: "organization_unarchived",
    });

    return organization;
  });
}

export async function getOrganization<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  organizationId: string,
) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  return organization ?? null;
}

export interface ListOrganizationsFilters {
  search?: string;
  status?: "active" | "archived" | "all";
  page?: number;
  pageSize?: number;
}

export async function listOrganizations<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListOrganizationsFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (filters.status === "archived") {
    conditions.push(isNotNull(organizations.archivedAt));
  } else if (filters.status !== "all") {
    conditions.push(isNull(organizations.archivedAt));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(organizations.name, term),
        ilike(organizations.email, term),
        ilike(organizations.address, term),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(organizations)
    .where(where)
    .orderBy(asc(organizations.name))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizations)
    .where(where);

  return { rows, total: count, page, pageSize };
}
