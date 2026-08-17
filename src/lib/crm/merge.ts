import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  contactEmails,
  contactPhones,
  contacts,
  organizationContacts,
  propertyContacts,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { archiveContact } from "./contacts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type MergeContactsResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "same_contact"
        | "keep_not_found"
        | "archive_not_found"
        | "keep_already_archived"
        | "archive_already_archived";
    };

/**
 * Merges `archiveContactId` (B) into `keepContactId` (A) per the approved
 * mechanics:
 *  - B's phones, emails, organization relationships, and property
 *    relationships are reassigned to A.
 *  - B is archived, never hard-deleted.
 *  - B's existing activity rows are left exactly as they are — nothing is
 *    rewritten or deleted from B's history.
 *  - A single `contact_merged` activity is recorded on A with B's id in
 *    metadata. Archiving B goes through the normal archiveContact() path
 *    (reused, not duplicated), which — consistent with every other archive
 *    in this codebase — also records its own `contact_archived` activity
 *    on B itself (with metadata explaining it was via merge); this is
 *    existing, already-approved archive behavior, not new merge-specific
 *    behavior.
 *
 * Both contacts must currently be active (unarchived); merging into or out
 * of an already-archived contact is rejected rather than silently allowed.
 */
export async function mergeContacts<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  keepContactId: string,
  archiveContactId: string,
  actorUserId: string | null,
): Promise<MergeContactsResult> {
  if (keepContactId === archiveContactId) {
    return { ok: false, error: "same_contact" };
  }

  return db.transaction(async (tx) => {
    const [keep] = await tx.select().from(contacts).where(eq(contacts.id, keepContactId));
    if (!keep) return { ok: false, error: "keep_not_found" };
    if (keep.archivedAt) return { ok: false, error: "keep_already_archived" };

    const [toArchive] = await tx.select().from(contacts).where(eq(contacts.id, archiveContactId));
    if (!toArchive) return { ok: false, error: "archive_not_found" };
    if (toArchive.archivedAt) return { ok: false, error: "archive_already_archived" };

    // Phones/emails: reassign outright. If A had none of its own, let B's
    // keep whatever isPrimary flag they already had (so A ends up with a
    // primary); if A already has some, B's become non-primary additions.
    const keepHasPhone = await tx
      .select({ id: contactPhones.id })
      .from(contactPhones)
      .where(eq(contactPhones.contactId, keepContactId))
      .limit(1);
    if (keepHasPhone.length > 0) {
      await tx
        .update(contactPhones)
        .set({ contactId: keepContactId, isPrimary: false })
        .where(eq(contactPhones.contactId, archiveContactId));
    } else {
      await tx
        .update(contactPhones)
        .set({ contactId: keepContactId })
        .where(eq(contactPhones.contactId, archiveContactId));
    }

    const keepHasEmail = await tx
      .select({ id: contactEmails.id })
      .from(contactEmails)
      .where(eq(contactEmails.contactId, keepContactId))
      .limit(1);
    if (keepHasEmail.length > 0) {
      await tx
        .update(contactEmails)
        .set({ contactId: keepContactId, isPrimary: false })
        .where(eq(contactEmails.contactId, archiveContactId));
    } else {
      await tx
        .update(contactEmails)
        .set({ contactId: keepContactId })
        .where(eq(contactEmails.contactId, archiveContactId));
    }

    // Organization relationships: unique on (organization_id, contact_id).
    // If A is already in the same organization B was, drop B's row rather
    // than reassigning it (which would violate the constraint); otherwise
    // reassign it to A.
    const orgRows = await tx
      .select()
      .from(organizationContacts)
      .where(eq(organizationContacts.contactId, archiveContactId));
    for (const row of orgRows) {
      const [existing] = await tx
        .select({ id: organizationContacts.id })
        .from(organizationContacts)
        .where(
          and(
            eq(organizationContacts.organizationId, row.organizationId),
            eq(organizationContacts.contactId, keepContactId),
          ),
        );
      if (existing) {
        await tx.delete(organizationContacts).where(eq(organizationContacts.id, row.id));
      } else {
        await tx
          .update(organizationContacts)
          .set({ contactId: keepContactId })
          .where(eq(organizationContacts.id, row.id));
      }
    }

    // Property relationships: no DB-level unique constraint, but avoid the
    // same semantic duplication (A and B both attached to the same
    // property) by the same skip-or-reassign logic.
    const propRows = await tx
      .select()
      .from(propertyContacts)
      .where(eq(propertyContacts.contactId, archiveContactId));
    for (const row of propRows) {
      const [existing] = await tx
        .select({ id: propertyContacts.id })
        .from(propertyContacts)
        .where(
          and(
            eq(propertyContacts.propertyId, row.propertyId),
            eq(propertyContacts.contactId, keepContactId),
          ),
        );
      if (existing) {
        await tx.delete(propertyContacts).where(eq(propertyContacts.id, row.id));
      } else {
        await tx
          .update(propertyContacts)
          .set({ contactId: keepContactId })
          .where(eq(propertyContacts.id, row.id));
      }
    }

    await archiveContact(tx, archiveContactId, actorUserId, {
      reason: "merged",
      mergedIntoContactId: keepContactId,
    });

    await recordActivity(tx, {
      actorUserId,
      entityType: "contact",
      entityId: keepContactId,
      action: "contact_merged",
      metadata: {
        mergedContactId: archiveContactId,
        mergedContactDisplayName: toArchive.displayName,
      },
    });

    return { ok: true };
  });
}
