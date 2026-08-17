import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { contactEmails, contactPhones, contacts } from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

// Below this trigram similarity, two names are treated as coincidentally
// alike rather than a likely duplicate. Tuned to catch typos/nickname
// variants ("Jon Smith" / "John Smith") without flooding results with
// unrelated common surnames.
const NAME_SIMILARITY_THRESHOLD = 0.35;

export interface DuplicateCandidate {
  contactId: string;
  displayName: string;
  matchReasons: Array<"phone" | "email" | "similar_name">;
}

/**
 * Stateless by design — recomputed every time, nothing persisted. Never
 * merges anything itself; the result is only ever a suggestion for the
 * merge UI to present. See docs/ROADMAP.md Phase 3 acceptance: "duplicates
 * are not automatically merged."
 */
export async function findDuplicateContacts<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  contactId: string,
): Promise<DuplicateCandidate[]> {
  const [target] = await db.select().from(contacts).where(eq(contacts.id, contactId));
  if (!target) return [];

  const candidates = new Map<string, DuplicateCandidate>();
  const addReason = (
    id: string,
    displayName: string,
    reason: DuplicateCandidate["matchReasons"][number],
  ) => {
    const existing = candidates.get(id);
    if (existing) {
      if (!existing.matchReasons.includes(reason)) existing.matchReasons.push(reason);
    } else {
      candidates.set(id, { contactId: id, displayName, matchReasons: [reason] });
    }
  };

  const targetPhones = await db
    .select({ phoneNormalized: contactPhones.phoneNormalized })
    .from(contactPhones)
    .where(eq(contactPhones.contactId, contactId));

  if (targetPhones.length > 0) {
    const rows = await db
      .select({ id: contacts.id, displayName: contacts.displayName })
      .from(contacts)
      .innerJoin(contactPhones, eq(contactPhones.contactId, contacts.id))
      .where(
        and(
          inArray(
            contactPhones.phoneNormalized,
            targetPhones.map((p) => p.phoneNormalized),
          ),
          ne(contacts.id, contactId),
          isNull(contacts.archivedAt),
        ),
      );
    for (const r of rows) addReason(r.id, r.displayName, "phone");
  }

  const targetEmails = await db
    .select({ email: contactEmails.email })
    .from(contactEmails)
    .where(eq(contactEmails.contactId, contactId));

  if (targetEmails.length > 0) {
    const rows = await db
      .select({ id: contacts.id, displayName: contacts.displayName })
      .from(contacts)
      .innerJoin(contactEmails, eq(contactEmails.contactId, contacts.id))
      .where(
        and(
          inArray(
            contactEmails.email,
            targetEmails.map((e) => e.email),
          ),
          ne(contacts.id, contactId),
          isNull(contacts.archivedAt),
        ),
      );
    for (const r of rows) addReason(r.id, r.displayName, "email");
  }

  const nameMatches = await db
    .select({
      id: contacts.id,
      displayName: contacts.displayName,
    })
    .from(contacts)
    .where(
      and(
        ne(contacts.id, contactId),
        isNull(contacts.archivedAt),
        sql`similarity(${contacts.displayName}, ${target.displayName}) > ${NAME_SIMILARITY_THRESHOLD}`,
      ),
    )
    .orderBy(sql`similarity(${contacts.displayName}, ${target.displayName}) desc`)
    .limit(10);
  for (const r of nameMatches) addReason(r.id, r.displayName, "similar_name");

  return Array.from(candidates.values());
}
