import { and, asc, desc, eq, ilike, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { contactEmails, contactPhones, contacts } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import type { NormalizedPhone } from "@/lib/phone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface CreateContactInput {
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  notes?: string | null;
  source?: string | null;
  phone?: NormalizedPhone | null;
  email?: string | null;
}

/**
 * Deliberately does NOT require or accept a job/lead/property/organization
 * — a contact must be creatable entirely on its own, per docs/CLAUDE.md §6
 * and the Phase 3 acceptance criteria. Attaching to a property/organization
 * is a separate action (src/lib/crm/relationships.ts).
 */
export async function createContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateContactInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [contact] = await tx
      .insert(contacts)
      .values({
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        displayName: input.displayName,
        notes: input.notes || null,
        source: input.source || null,
      })
      .returning();

    if (input.phone) {
      await tx.insert(contactPhones).values({
        contactId: contact.id,
        phoneE164: input.phone.e164,
        phoneNormalized: input.phone.normalized,
        isPrimary: true,
      });
    }
    if (input.email) {
      await tx.insert(contactEmails).values({
        contactId: contact.id,
        email: input.email,
        isPrimary: true,
      });
    }

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contact.id,
      action: "contact_created",
      newValue: { displayName: contact.displayName },
    });

    return contact;
  });
}

export interface UpdateContactInput {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string;
  notes?: string | null;
  source?: string | null;
}

export async function updateContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  input: UpdateContactInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(contacts).where(eq(contacts.id, contactId));
    if (!before) throw new Error(`Contact ${contactId} not found`);

    const [after] = await tx
      .update(contacts)
      .set(input)
      .where(eq(contacts.id, contactId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_updated",
      oldValue: {
        firstName: before.firstName,
        lastName: before.lastName,
        displayName: before.displayName,
        notes: before.notes,
        source: before.source,
      },
      newValue: {
        firstName: after.firstName,
        lastName: after.lastName,
        displayName: after.displayName,
        notes: after.notes,
        source: after.source,
      },
    });

    return after;
  });
}

export async function archiveContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  actorUserId: string | null,
  metadata?: Record<string, unknown>,
) {
  return db.transaction(async (tx) => {
    const [contact] = await tx
      .update(contacts)
      .set({ archivedAt: new Date() })
      .where(eq(contacts.id, contactId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_archived",
      metadata,
    });

    return contact;
  });
}

export async function unarchiveContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [contact] = await tx
      .update(contacts)
      .set({ archivedAt: null })
      .where(eq(contacts.id, contactId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_unarchived",
    });

    return contact;
  });
}

export async function getContact<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
) {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
  if (!contact) return null;

  const phones = await db
    .select()
    .from(contactPhones)
    .where(eq(contactPhones.contactId, contactId))
    .orderBy(desc(contactPhones.isPrimary));
  const emails = await db
    .select()
    .from(contactEmails)
    .where(eq(contactEmails.contactId, contactId))
    .orderBy(desc(contactEmails.isPrimary));

  return { ...contact, phones, emails };
}

export interface ListContactsFilters {
  search?: string;
  status?: "active" | "archived" | "all";
  source?: string;
  page?: number;
  pageSize?: number;
}

export async function listContacts<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListContactsFilters = {},
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (filters.status === "archived") {
    conditions.push(isNotNull(contacts.archivedAt));
  } else if (filters.status !== "all") {
    conditions.push(isNull(contacts.archivedAt));
  }
  if (filters.source) {
    conditions.push(eq(contacts.source, filters.source));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(contacts.displayName, term),
        sql`exists (select 1 from ${contactPhones} where ${contactPhones.contactId} = ${contacts.id} and ${contactPhones.phoneNormalized} ilike ${term})`,
        sql`exists (select 1 from ${contactEmails} where ${contactEmails.contactId} = ${contacts.id} and ${contactEmails.email} ilike ${term})`,
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(contacts)
    .where(where)
    .orderBy(asc(contacts.displayName))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contacts)
    .where(where);

  return { rows, total: count, page, pageSize };
}

// ---- Additional phones/emails (beyond the one collected at quick-create) ----

export async function addContactPhone<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  phone: NormalizedPhone,
  label: string | null,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existingPrimary] = await tx
      .select({ id: contactPhones.id })
      .from(contactPhones)
      .where(and(eq(contactPhones.contactId, contactId), eq(contactPhones.isPrimary, true)));

    const [row] = await tx
      .insert(contactPhones)
      .values({
        contactId,
        phoneE164: phone.e164,
        phoneNormalized: phone.normalized,
        label,
        isPrimary: !existingPrimary,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_phone_added",
      metadata: { phone: phone.e164 },
    });

    return row;
  });
}

export async function removeContactPhone<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  phoneId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    await tx
      .delete(contactPhones)
      .where(and(eq(contactPhones.id, phoneId), eq(contactPhones.contactId, contactId)));

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_phone_removed",
    });
  });
}

export async function addContactEmail<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  email: string,
  label: string | null,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [existingPrimary] = await tx
      .select({ id: contactEmails.id })
      .from(contactEmails)
      .where(and(eq(contactEmails.contactId, contactId), eq(contactEmails.isPrimary, true)));

    const [row] = await tx
      .insert(contactEmails)
      .values({ contactId, email, label, isPrimary: !existingPrimary })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_email_added",
      metadata: { email },
    });

    return row;
  });
}

export async function removeContactEmail<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
  emailId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    await tx
      .delete(contactEmails)
      .where(and(eq(contactEmails.id, emailId), eq(contactEmails.contactId, contactId)));

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: contactId,
      action: "contact_email_removed",
    });
  });
}

/** Batched lookup for list views — avoids one query per row. */
export async function getPrimaryPhonesForContacts<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactIds: string[],
): Promise<Map<string, string>> {
  if (contactIds.length === 0) return new Map();

  const rows = await db
    .select({ contactId: contactPhones.contactId, phoneE164: contactPhones.phoneE164 })
    .from(contactPhones)
    .where(and(inArray(contactPhones.contactId, contactIds), eq(contactPhones.isPrimary, true)));

  return new Map(rows.map((r) => [r.contactId, r.phoneE164]));
}

export async function listDistinctContactSources<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ source: contacts.source })
    .from(contacts)
    .where(isNotNull(contacts.source));
  return rows.map((r) => r.source).filter((s): s is string => Boolean(s));
}
