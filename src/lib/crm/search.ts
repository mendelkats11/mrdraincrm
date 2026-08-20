import { and, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  contactEmails,
  contactPhones,
  contacts,
  contractors,
  invoices,
  jobs,
  leads,
  organizations,
  properties,
  quotes,
} from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export interface SearchResult {
  type:
    "contact" | "organization" | "property" | "lead" | "job" | "contractor" | "invoice" | "quote";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const RESULTS_PER_TYPE = 10;

/**
 * Basic cross-entity search — contacts, organizations, and properties only,
 * since those are the only entities that exist as of Phase 3. Structured so
 * later phases (leads, jobs, invoices, quotes, calls, messages, reminders —
 * docs/PROJECT_SPEC.md §7) can append their own query + result mapping here
 * without changing this function's shape. The *polished*, unified,
 * live-typeahead search experience is an explicit docs/ROADMAP.md Phase 17
 * deliverable ("global search polish") — this is the functional baseline.
 */
export async function searchCrm<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  query: string,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const term = `%${trimmed}%`;

  const contactRows = await db
    .select({ id: contacts.id, displayName: contacts.displayName })
    .from(contacts)
    .where(
      and(
        isNull(contacts.archivedAt),
        or(
          ilike(contacts.displayName, term),
          sql`exists (select 1 from ${contactPhones} where ${contactPhones.contactId} = ${contacts.id} and ${contactPhones.phoneNormalized} ilike ${term})`,
          sql`exists (select 1 from ${contactEmails} where ${contactEmails.contactId} = ${contacts.id} and ${contactEmails.email} ilike ${term})`,
        ),
      ),
    )
    .limit(RESULTS_PER_TYPE);

  const organizationRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(and(isNull(organizations.archivedAt), ilike(organizations.name, term)))
    .limit(RESULTS_PER_TYPE);

  const propertyRows = await db
    .select({
      id: properties.id,
      addressLine1: properties.addressLine1,
      city: properties.city,
    })
    .from(properties)
    .where(
      and(
        isNull(properties.archivedAt),
        or(ilike(properties.addressLine1, term), ilike(properties.city, term)),
      ),
    )
    .limit(RESULTS_PER_TYPE);

  // Leads have no name of their own — matched via the linked contact's
  // name/phone/email, same as the contact search above.
  const leadRows = await db
    .select({
      id: leads.id,
      contactName: contacts.displayName,
      issueDescription: leads.issueDescription,
    })
    .from(leads)
    .innerJoin(contacts, eq(leads.contactId, contacts.id))
    .where(
      and(
        ne(leads.status, "lost"),
        or(
          ilike(contacts.displayName, term),
          sql`exists (select 1 from ${contactPhones} where ${contactPhones.contactId} = ${contacts.id} and ${contactPhones.phoneNormalized} ilike ${term})`,
          sql`exists (select 1 from ${contactEmails} where ${contactEmails.contactId} = ${contacts.id} and ${contactEmails.email} ilike ${term})`,
        ),
      ),
    )
    .limit(RESULTS_PER_TYPE);

  // Jobs have their own searchable identifier (the job number) in addition
  // to matching via the linked contact, unlike leads.
  const jobRows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      contactName: contacts.displayName,
    })
    .from(jobs)
    .leftJoin(contacts, eq(jobs.contactId, contacts.id))
    .where(
      and(
        ne(jobs.status, "cancelled"),
        or(
          ilike(jobs.jobNumber, term),
          ilike(jobs.issueDescription, term),
          sql`exists (select 1 from ${contacts} where ${contacts.id} = ${jobs.contactId} and ${contacts.displayName} ilike ${term})`,
          sql`exists (select 1 from ${contactPhones} where ${contactPhones.contactId} = ${jobs.contactId} and ${contactPhones.phoneNormalized} ilike ${term})`,
          sql`exists (select 1 from ${contactEmails} where ${contactEmails.contactId} = ${jobs.contactId} and ${contactEmails.email} ilike ${term})`,
        ),
      ),
    )
    .limit(RESULTS_PER_TYPE);

  // Only active contractors — matches the same visibility rule
  // searchContractors already applies for the job assignment picker.
  const contractorRows = await db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .where(and(eq(contractors.active, true), ilike(contractors.name, term)))
    .limit(RESULTS_PER_TYPE);

  // Matched by invoice number, customer name (the snapshot on the invoice
  // itself), or the linked job's number — docs/PROJECT_SPEC.md §7.
  const invoiceRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerName: invoices.customerName,
    })
    .from(invoices)
    .innerJoin(jobs, eq(invoices.jobId, jobs.id))
    .where(
      or(
        ilike(invoices.invoiceNumber, term),
        ilike(invoices.customerName, term),
        ilike(jobs.jobNumber, term),
      ),
    )
    .limit(RESULTS_PER_TYPE);

  // Matched by quote number, or the linked contact/organization name.
  // Quotes have no jobId to search by (unlike invoices) — they aren't tied
  // to a job until conversion.
  const quoteRows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      contactName: contacts.displayName,
      organizationName: organizations.name,
    })
    .from(quotes)
    .leftJoin(contacts, eq(quotes.contactId, contacts.id))
    .leftJoin(organizations, eq(quotes.organizationId, organizations.id))
    .where(
      or(
        ilike(quotes.quoteNumber, term),
        sql`exists (select 1 from ${contacts} where ${contacts.id} = ${quotes.contactId} and ${contacts.displayName} ilike ${term})`,
        sql`exists (select 1 from ${organizations} where ${organizations.id} = ${quotes.organizationId} and ${organizations.name} ilike ${term})`,
      ),
    )
    .limit(RESULTS_PER_TYPE);

  return [
    ...contactRows.map((c): SearchResult => ({
      type: "contact",
      id: c.id,
      title: c.displayName,
      subtitle: "Contact",
      href: `/contacts/${c.id}`,
    })),
    ...organizationRows.map((o): SearchResult => ({
      type: "organization",
      id: o.id,
      title: o.name,
      subtitle: "Organization",
      href: `/organizations/${o.id}`,
    })),
    ...propertyRows.map((p): SearchResult => ({
      type: "property",
      id: p.id,
      title: p.addressLine1,
      subtitle: p.city,
      href: `/properties/${p.id}`,
    })),
    ...leadRows.map((l): SearchResult => ({
      type: "lead",
      id: l.id,
      title: `Lead: ${l.contactName}`,
      subtitle: l.issueDescription,
      href: `/leads/${l.id}`,
    })),
    ...jobRows.map((j): SearchResult => ({
      type: "job",
      id: j.id,
      title: j.jobNumber,
      subtitle: j.contactName,
      href: `/jobs/${j.id}`,
    })),
    ...contractorRows.map((c): SearchResult => ({
      type: "contractor",
      id: c.id,
      title: c.name,
      subtitle: "Contractor",
      href: `/contractors/${c.id}`,
    })),
    ...invoiceRows.map((i): SearchResult => ({
      type: "invoice",
      id: i.id,
      title: i.invoiceNumber,
      subtitle: i.customerName,
      href: `/invoices/${i.id}`,
    })),
    ...quoteRows.map((q): SearchResult => ({
      type: "quote",
      id: q.id,
      title: q.quoteNumber,
      subtitle: q.organizationName ?? q.contactName,
      href: `/quotes/${q.id}`,
    })),
  ];
}
