import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  appSettings,
  contactEmails,
  contactPhones,
  contacts,
  jobs,
  leadStatusEnum,
  leads,
  organizations,
  properties,
  serviceAreas,
  services,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { allocateSequenceNumber } from "@/lib/sequences/allocate";
import type { NormalizedPhone } from "@/lib/phone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];

export interface CreateLeadInput {
  contactId?: string | null;
  propertyId?: string | null;
  organizationId?: string | null;
  serviceId?: string | null;
  issueDescription?: string | null;
  emergency?: boolean;
  /** Set as both originalSource and latestSource — this is the first touch. */
  source?: string | null;
  sourceDetails?: string | null;
  landingPage?: string | null;
}

/**
 * Manual (dashboard) lead creation. A lead may be created without a
 * contact/property/organization, mirroring how jobs work elsewhere in this
 * app — none of PROJECT_SPEC.md's lead fields are described as required
 * beyond the lead itself existing.
 */
export async function createLead<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateLeadInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .insert(leads)
      .values({
        contactId: input.contactId || null,
        propertyId: input.propertyId || null,
        organizationId: input.organizationId || null,
        serviceId: input.serviceId || null,
        issueDescription: input.issueDescription || null,
        emergency: input.emergency ?? false,
        originalSource: input.source || null,
        latestSource: input.source || null,
        sourceDetails: input.sourceDetails || null,
        landingPage: input.landingPage || null,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "lead",
      entityId: lead.id,
      action: "lead_created",
      newValue: { status: lead.status, source: lead.originalSource },
    });

    return lead;
  });
}

export interface UpdateLeadInput {
  contactId?: string | null;
  propertyId?: string | null;
  organizationId?: string | null;
  serviceId?: string | null;
  issueDescription?: string | null;
  emergency?: boolean;
  // Deliberately no `originalSource` here — PROJECT_SPEC.md §6.4 requires it
  // never be overwritten once set. Omitting it from this input type makes
  // that a compile-time guarantee for every caller, not just a runtime rule.
  latestSource?: string | null;
  sourceDetails?: string | null;
  landingPage?: string | null;
}

export async function updateLead<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  leadId: string,
  input: UpdateLeadInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(leads).where(eq(leads.id, leadId));
    if (!before) throw new Error(`Lead ${leadId} not found`);

    const [after] = await tx.update(leads).set(input).where(eq(leads.id, leadId)).returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "lead",
      entityId: leadId,
      action: "lead_updated",
      oldValue: {
        contactId: before.contactId,
        propertyId: before.propertyId,
        organizationId: before.organizationId,
        serviceId: before.serviceId,
        issueDescription: before.issueDescription,
        emergency: before.emergency,
        latestSource: before.latestSource,
        sourceDetails: before.sourceDetails,
        landingPage: before.landingPage,
      },
      newValue: {
        contactId: after.contactId,
        propertyId: after.propertyId,
        organizationId: after.organizationId,
        serviceId: after.serviceId,
        issueDescription: after.issueDescription,
        emergency: after.emergency,
        latestSource: after.latestSource,
        sourceDetails: after.sourceDetails,
        landingPage: after.landingPage,
      },
    });

    return after;
  });
}

export type ChangeLeadStatusResult =
  { ok: true } | { ok: false; error: "not_found" | "cannot_set_won_directly" | "lead_already_won" };

/**
 * "Won" is set exclusively by convertLeadToJob (docs/PROJECT_SPEC.md §6.4:
 * "if converted, lead becomes Won, job is linked") — allowing it here too
 * would let a lead reach Won with no job behind it, an inconsistent state
 * nothing else in the app expects. Once a lead is Won, its status is
 * likewise fixed — un-converting isn't a defined operation.
 */
export async function changeLeadStatus<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  leadId: string,
  status: Exclude<LeadStatus, "won">,
  actorUserId: string | null,
): Promise<ChangeLeadStatusResult> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(leads).where(eq(leads.id, leadId));
    if (!before) return { ok: false, error: "not_found" };
    if (before.status === "won") return { ok: false, error: "lead_already_won" };
    if (before.status === status) return { ok: true };

    await tx.update(leads).set({ status }).where(eq(leads.id, leadId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "lead",
      entityId: leadId,
      action: "lead_status_changed",
      oldValue: { status: before.status },
      newValue: { status },
    });

    return { ok: true };
  });
}

export type ConvertLeadToJobResult =
  | { ok: true; jobId: string; jobNumber: string }
  | { ok: false; error: "not_found" | "already_converted" | "lead_lost" };

/**
 * Creates a real `jobs` row from a lead — the approved Phase 4 decision.
 * Job management UI is Phase 5's, so this only creates the row (draft
 * status, sequential number, bidirectional link, tax-inclusion snapshot);
 * there is no job detail page to send the user to yet.
 */
export async function convertLeadToJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  leadId: string,
  actorUserId: string | null,
): Promise<ConvertLeadToJobResult> {
  return db.transaction(async (tx) => {
    // FOR UPDATE locks this lead row for the rest of the transaction — two
    // concurrent conversion requests (double-click, or a client retry
    // racing the original) would otherwise both read convertedJobId as
    // null under READ COMMITTED and both proceed, each creating its own
    // job. The second transaction blocks here until the first commits (and
    // then sees convertedJobId set), rather than racing past this check.
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) return { ok: false, error: "not_found" };
    if (lead.convertedJobId) return { ok: false, error: "already_converted" };
    if (lead.status === "lost") return { ok: false, error: "lead_lost" };

    const [settings] = await tx.select().from(appSettings).limit(1);
    const taxInclusionMode = settings?.taxInclusionDefault ?? "excluded";

    const jobNumber = await allocateSequenceNumber(tx, "job");

    const [job] = await tx
      .insert(jobs)
      .values({
        jobNumber,
        contactId: lead.contactId,
        propertyId: lead.propertyId,
        organizationId: lead.organizationId,
        leadId: lead.id,
        serviceId: lead.serviceId,
        issueDescription: lead.issueDescription,
        emergency: lead.emergency,
        taxInclusionMode,
      })
      .returning();

    await tx
      .update(leads)
      .set({ status: "won", convertedAt: new Date(), convertedJobId: job.id })
      .where(eq(leads.id, leadId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "lead",
      entityId: leadId,
      action: "lead_converted",
      oldValue: { status: lead.status },
      newValue: { status: "won", jobNumber: job.jobNumber },
      metadata: { jobId: job.id },
    });
    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: job.id,
      action: "job_created_from_lead",
      newValue: { jobNumber: job.jobNumber, status: job.status, taxInclusionMode },
      metadata: { leadId: lead.id },
    });

    return { ok: true, jobId: job.id, jobNumber: job.jobNumber };
  });
}

export interface LeadWithLabels {
  id: string;
  contactId: string | null;
  propertyId: string | null;
  organizationId: string | null;
  serviceId: string | null;
  status: LeadStatus;
  originalSource: string | null;
  latestSource: string | null;
  sourceDetails: string | null;
  landingPage: string | null;
  issueDescription: string | null;
  emergency: boolean;
  createdAt: Date;
  convertedAt: Date | null;
  convertedJobId: string | null;
  contactName: string | null;
  organizationName: string | null;
  propertyAddressLine1: string | null;
  propertyCity: string | null;
  serviceName: string | null;
  convertedJobNumber: string | null;
}

export async function getLead<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  leadId: string,
): Promise<LeadWithLabels | null> {
  const [row] = await db
    .select({
      lead: leads,
      contactName: contacts.displayName,
      organizationName: organizations.name,
      propertyAddressLine1: properties.addressLine1,
      propertyCity: properties.city,
      serviceName: services.name,
      convertedJobNumber: jobs.jobNumber,
    })
    .from(leads)
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .leftJoin(organizations, eq(leads.organizationId, organizations.id))
    .leftJoin(properties, eq(leads.propertyId, properties.id))
    .leftJoin(services, eq(leads.serviceId, services.id))
    .leftJoin(jobs, eq(leads.convertedJobId, jobs.id))
    .where(eq(leads.id, leadId));

  if (!row) return null;

  return {
    ...row.lead,
    contactName: row.contactName,
    organizationName: row.organizationName,
    propertyAddressLine1: row.propertyAddressLine1,
    propertyCity: row.propertyCity,
    serviceName: row.serviceName,
    convertedJobNumber: row.convertedJobNumber,
  };
}

export interface ListLeadsFilters {
  search?: string;
  /** "active" (default) excludes Lost; a specific status filters exactly; "all" applies no status filter. */
  status?: LeadStatus | "active" | "all";
  source?: string;
  emergencyOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface LeadListRow {
  id: string;
  status: LeadStatus;
  originalSource: string | null;
  issueDescription: string | null;
  emergency: boolean;
  createdAt: Date;
  contactName: string | null;
}

export async function listLeads<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListLeadsFilters = {},
): Promise<{ rows: LeadListRow[]; total: number; page: number; pageSize: number }> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (!filters.status || filters.status === "active") {
    conditions.push(ne(leads.status, "lost"));
  } else if (filters.status !== "all") {
    conditions.push(eq(leads.status, filters.status));
  }
  if (filters.source) {
    conditions.push(eq(leads.originalSource, filters.source));
  }
  if (filters.emergencyOnly) {
    conditions.push(eq(leads.emergency, true));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(leads.issueDescription, term),
        sql`exists (select 1 from ${contacts} where ${contacts.id} = ${leads.contactId} and ${contacts.displayName} ilike ${term})`,
        sql`exists (select 1 from ${contactPhones} where ${contactPhones.contactId} = ${leads.contactId} and ${contactPhones.phoneNormalized} ilike ${term})`,
        sql`exists (select 1 from ${contactEmails} where ${contactEmails.contactId} = ${leads.contactId} and ${contactEmails.email} ilike ${term})`,
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: leads.id,
      status: leads.status,
      originalSource: leads.originalSource,
      issueDescription: leads.issueDescription,
      emergency: leads.emergency,
      createdAt: leads.createdAt,
      contactName: contacts.displayName,
    })
    .from(leads)
    .leftJoin(contacts, eq(leads.contactId, contacts.id))
    .where(where)
    .orderBy(desc(leads.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(where);

  return { rows, total: count, page, pageSize };
}

export async function listDistinctLeadSources<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<string[]> {
  const rows = await db.selectDistinct({ source: leads.originalSource }).from(leads);
  return rows.map((r) => r.source).filter((s): s is string => Boolean(s));
}

export async function listActiveServices<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder));
}

export async function listActiveServiceAreas<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: serviceAreas.id, name: serviceAreas.name })
    .from(serviceAreas)
    .where(eq(serviceAreas.active, true))
    .orderBy(asc(serviceAreas.sortOrder));
}

export interface PublicLeadSubmissionInput {
  name: string;
  phone: NormalizedPhone;
  email: string | null;
  serviceAreaId: string | null;
  issueDescription: string;
  emergency: boolean;
  landingPage: string;
}

/**
 * The public quote-form path (docs/PROJECT_SPEC.md §3). Matches an existing
 * active contact by exact normalized phone or exact normalized email —
 * fuzzy/name matching is deliberately not used here, since a false-positive
 * match would attach a stranger's lead to the wrong person's record. No
 * information about whether a match occurred is returned to the caller
 * beyond the created lead itself — callers (the API route) must not expose
 * `matchedExistingContact` to the public response.
 */
export async function createLeadFromPublicSubmission<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: PublicLeadSubmissionInput,
) {
  return db.transaction(async (tx) => {
    let contactId: string | null = null;

    const [phoneMatch] = await tx
      .select({ contactId: contactPhones.contactId })
      .from(contactPhones)
      .innerJoin(contacts, eq(contactPhones.contactId, contacts.id))
      .where(
        and(eq(contactPhones.phoneNormalized, input.phone.normalized), isNull(contacts.archivedAt)),
      )
      .limit(1);
    if (phoneMatch) contactId = phoneMatch.contactId;

    if (!contactId && input.email) {
      const [emailMatch] = await tx
        .select({ contactId: contactEmails.contactId })
        .from(contactEmails)
        .innerJoin(contacts, eq(contactEmails.contactId, contacts.id))
        .where(
          and(
            eq(sql`lower(${contactEmails.email})`, input.email.toLowerCase()),
            isNull(contacts.archivedAt),
          ),
        )
        .limit(1);
      if (emailMatch) contactId = emailMatch.contactId;
    }

    const matchedExistingContact = Boolean(contactId);

    if (!contactId) {
      const [contact] = await tx
        .insert(contacts)
        .values({ displayName: input.name, source: "website" })
        .returning();
      contactId = contact.id;

      await tx.insert(contactPhones).values({
        contactId,
        phoneE164: input.phone.e164,
        phoneNormalized: input.phone.normalized,
        isPrimary: true,
      });
      if (input.email) {
        await tx.insert(contactEmails).values({ contactId, email: input.email, isPrimary: true });
      }

      await recordActivity(tx, {
        actorUserId: null,
        entityType: "contact",
        entityId: contactId,
        action: "contact_created",
        newValue: { displayName: input.name },
        metadata: { channel: "public_quote_form" },
      });
    }

    let sourceDetails: string | null = null;
    if (input.serviceAreaId) {
      const [area] = await tx
        .select({ name: serviceAreas.name })
        .from(serviceAreas)
        .where(eq(serviceAreas.id, input.serviceAreaId));
      if (area) sourceDetails = `Service area: ${area.name}`;
    }

    const [lead] = await tx
      .insert(leads)
      .values({
        contactId,
        issueDescription: input.issueDescription,
        emergency: input.emergency,
        originalSource: "website",
        latestSource: "website",
        sourceDetails,
        landingPage: input.landingPage,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId: null,
      entityType: "lead",
      entityId: lead.id,
      action: "lead_created",
      newValue: { status: lead.status, source: "website" },
      metadata: { channel: "public_quote_form", matchedExistingContact },
    });

    return lead;
  });
}
