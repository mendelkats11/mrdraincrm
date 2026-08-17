import { and, asc, eq, ilike, isNull, isNotNull, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { organizations, type propertyTypeEnum, properties } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type PropertyType = (typeof propertyTypeEnum.enumValues)[number];

export interface CreatePropertyInput {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  propertyType?: PropertyType;
  businessName?: string | null;
  notes?: string | null;
  organizationId?: string | null;
}

/**
 * Deliberately does NOT require or accept a job — a property must be
 * creatable entirely on its own, per docs/CLAUDE.md §6 and the Phase 3
 * acceptance criteria.
 */
export async function createProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreatePropertyInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [property] = await tx
      .insert(properties)
      .values({
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city,
        province: input.province,
        postalCode: input.postalCode,
        propertyType: input.propertyType ?? "residential",
        businessName: input.businessName || null,
        notes: input.notes || null,
        organizationId: input.organizationId || null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "property",
      entityId: property.id,
      action: "property_created",
      newValue: { addressLine1: property.addressLine1, city: property.city },
    });

    return property;
  });
}

export interface UpdatePropertyInput {
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  province?: string;
  postalCode?: string;
  propertyType?: PropertyType;
  businessName?: string | null;
  notes?: string | null;
  organizationId?: string | null;
}

export async function updateProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
  input: UpdatePropertyInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(properties).where(eq(properties.id, propertyId));
    if (!before) throw new Error(`Property ${propertyId} not found`);

    const [after] = await tx
      .update(properties)
      .set(input)
      .where(eq(properties.id, propertyId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "property",
      entityId: propertyId,
      action: "property_updated",
      oldValue: {
        addressLine1: before.addressLine1,
        addressLine2: before.addressLine2,
        city: before.city,
        province: before.province,
        postalCode: before.postalCode,
        propertyType: before.propertyType,
        businessName: before.businessName,
        notes: before.notes,
        organizationId: before.organizationId,
      },
      newValue: {
        addressLine1: after.addressLine1,
        addressLine2: after.addressLine2,
        city: after.city,
        province: after.province,
        postalCode: after.postalCode,
        propertyType: after.propertyType,
        businessName: after.businessName,
        notes: after.notes,
        organizationId: after.organizationId,
      },
    });

    return after;
  });
}

export async function archiveProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [property] = await tx
      .update(properties)
      .set({ archivedAt: new Date() })
      .where(eq(properties.id, propertyId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "property",
      entityId: propertyId,
      action: "property_archived",
    });

    return property;
  });
}

export async function unarchiveProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [property] = await tx
      .update(properties)
      .set({ archivedAt: null })
      .where(eq(properties.id, propertyId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "property",
      entityId: propertyId,
      action: "property_unarchived",
    });

    return property;
  });
}

export async function getProperty<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  propertyId: string,
) {
  const [row] = await db
    .select({
      id: properties.id,
      addressLine1: properties.addressLine1,
      addressLine2: properties.addressLine2,
      city: properties.city,
      province: properties.province,
      postalCode: properties.postalCode,
      propertyType: properties.propertyType,
      businessName: properties.businessName,
      notes: properties.notes,
      organizationId: properties.organizationId,
      organizationName: organizations.name,
      createdAt: properties.createdAt,
      archivedAt: properties.archivedAt,
    })
    .from(properties)
    .leftJoin(organizations, eq(properties.organizationId, organizations.id))
    .where(eq(properties.id, propertyId));
  return row ?? null;
}

export interface ListPropertiesFilters {
  search?: string;
  status?: "active" | "archived" | "all";
  propertyType?: PropertyType;
  page?: number;
  pageSize?: number;
}

export async function listProperties<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListPropertiesFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (filters.status === "archived") {
    conditions.push(isNotNull(properties.archivedAt));
  } else if (filters.status !== "all") {
    conditions.push(isNull(properties.archivedAt));
  }
  if (filters.propertyType) {
    conditions.push(eq(properties.propertyType, filters.propertyType));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(properties.addressLine1, term),
        ilike(properties.city, term),
        ilike(properties.postalCode, term),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(properties)
    .where(where)
    .orderBy(asc(properties.addressLine1))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(properties)
    .where(where);

  return { rows, total: count, page, pageSize };
}
