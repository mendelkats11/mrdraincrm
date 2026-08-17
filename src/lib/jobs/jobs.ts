import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  appSettings,
  contactEmails,
  contactPhones,
  contacts,
  jobCustomCharges,
  jobStatusEnum,
  jobs,
  organizations,
  properties,
  services,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";
import { allocateSequenceNumber } from "@/lib/sequences/allocate";
import { createContact } from "@/lib/crm/contacts";
import type { NormalizedPhone } from "@/lib/phone";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export type JobStatus = (typeof jobStatusEnum.enumValues)[number];

export interface CreateJobInput {
  contactId?: string | null;
  /** Creates a new contact in the same transaction — ignored if contactId is set. */
  newContact?: {
    displayName: string;
    phone?: NormalizedPhone | null;
    email?: string | null;
  } | null;
  propertyId?: string | null;
  organizationId?: string | null;
  serviceId?: string | null;
  issueDescription?: string | null;
  emergency?: boolean;
  internalNotes?: string | null;
  status?: JobStatus;
  jobAmountCents?: number;
  taxAmountCents?: number;
  materialsCents?: number;
  contractorPayoutCents?: number;
}

/**
 * Manual (dashboard) job creation. A job may be created with none of
 * contact/property/organization/lead attached (docs/CLAUDE.md §6). There is
 * deliberately no `leadId` on this input — a manually created job never has
 * lead provenance; that link is set exclusively by
 * convertLeadToJob (src/lib/crm/leads.ts), so `jobs.lead_id` always means
 * "actually converted from this lead," never an arbitrary pick.
 */
export async function createJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateJobInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    let contactId = input.contactId || null;
    if (!contactId && input.newContact) {
      const created = await createContact(tx, input.newContact, actorUserId);
      contactId = created.id;
    }

    const [settings] = await tx.select().from(appSettings).limit(1);
    const taxInclusionMode = settings?.taxInclusionDefault ?? "excluded";

    const jobNumber = await allocateSequenceNumber(tx, "job");

    const [job] = await tx
      .insert(jobs)
      .values({
        jobNumber,
        contactId,
        propertyId: input.propertyId || null,
        organizationId: input.organizationId || null,
        serviceId: input.serviceId || null,
        issueDescription: input.issueDescription || null,
        emergency: input.emergency ?? false,
        internalNotes: input.internalNotes || null,
        status: input.status ?? "draft",
        taxInclusionMode,
        jobAmountCents: input.jobAmountCents ?? 0,
        taxAmountCents: input.taxAmountCents ?? 0,
        materialsCents: input.materialsCents ?? 0,
        contractorPayoutCents: input.contractorPayoutCents ?? 0,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: job.id,
      action: "job_created",
      newValue: { jobNumber: job.jobNumber, status: job.status },
    });

    return job;
  });
}

export interface UpdateJobInput {
  contactId?: string | null;
  propertyId?: string | null;
  organizationId?: string | null;
  serviceId?: string | null;
  issueDescription?: string | null;
  emergency?: boolean;
  internalNotes?: string | null;
}

export async function updateJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  input: UpdateJobInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(jobs).where(eq(jobs.id, jobId));
    if (!before) throw new Error(`Job ${jobId} not found`);

    const [after] = await tx
      .update(jobs)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_updated",
      oldValue: {
        contactId: before.contactId,
        propertyId: before.propertyId,
        organizationId: before.organizationId,
        serviceId: before.serviceId,
        issueDescription: before.issueDescription,
        emergency: before.emergency,
        internalNotes: before.internalNotes,
      },
      newValue: {
        contactId: after.contactId,
        propertyId: after.propertyId,
        organizationId: after.organizationId,
        serviceId: after.serviceId,
        issueDescription: after.issueDescription,
        emergency: after.emergency,
        internalNotes: after.internalNotes,
      },
    });

    return after;
  });
}

// Raw manual dollar inputs only — docs/CLAUDE.md §6 ("materials cost is one
// manually entered internal dollar amount," "contractor payout is manually
// entered per job," "tax is a manually entered dollar amount"). This never
// computes or stores a derived total/profit/margin — that is exclusively
// Phase 8's `lib/financials` module, reading these same raw columns.
export interface UpdateJobFinancialsInput {
  jobAmountCents?: number;
  taxAmountCents?: number;
  materialsCents?: number;
  contractorPayoutCents?: number;
}

export async function updateJobFinancials<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  input: UpdateJobFinancialsInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(jobs).where(eq(jobs.id, jobId));
    if (!before) throw new Error(`Job ${jobId} not found`);

    const [after] = await tx
      .update(jobs)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
      .returning();

    // A dedicated action (distinct from job_updated) so financial changes
    // are unambiguous in the timeline with an explicit before/after —
    // docs/PROJECT_SPEC.md §8.6.
    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_financials_changed",
      oldValue: {
        jobAmountCents: before.jobAmountCents,
        taxAmountCents: before.taxAmountCents,
        materialsCents: before.materialsCents,
        contractorPayoutCents: before.contractorPayoutCents,
      },
      newValue: {
        jobAmountCents: after.jobAmountCents,
        taxAmountCents: after.taxAmountCents,
        materialsCents: after.materialsCents,
        contractorPayoutCents: after.contractorPayoutCents,
      },
    });

    return after;
  });
}

export type ChangeJobStatusResult = { ok: true } | { ok: false; error: "not_found" };

/**
 * Free transitions between all six statuses — no state machine, per the
 * approved Phase 5 decision. "Cancelled" is the archive-equivalent for jobs
 * (docs/PROJECT_SPEC.md §27: "Jobs: cancel/archive") — never a hard delete,
 * always reversible, no separate archivedAt column. cancelledAt tracks the
 * most recent cancellation and is cleared when a job moves off Cancelled,
 * matching what the column name implies.
 */
export async function changeJobStatus<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  status: JobStatus,
  actorUserId: string | null,
): Promise<ChangeJobStatusResult> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(jobs).where(eq(jobs.id, jobId));
    if (!before) return { ok: false, error: "not_found" };
    if (before.status === status) return { ok: true };

    await tx
      .update(jobs)
      .set({
        status,
        updatedAt: new Date(),
        cancelledAt: status === "cancelled" ? new Date() : null,
      })
      .where(eq(jobs.id, jobId));

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_status_changed",
      oldValue: { status: before.status },
      newValue: { status },
    });

    return { ok: true };
  });
}

export interface JobWithLabels {
  id: string;
  jobNumber: string;
  contactId: string | null;
  propertyId: string | null;
  organizationId: string | null;
  leadId: string | null;
  serviceId: string | null;
  issueDescription: string | null;
  emergency: boolean;
  internalNotes: string | null;
  status: JobStatus;
  taxInclusionMode: "included" | "excluded";
  jobAmountCents: number;
  taxAmountCents: number;
  materialsCents: number;
  contractorPayoutCents: number;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  contactName: string | null;
  organizationName: string | null;
  propertyAddressLine1: string | null;
  propertyCity: string | null;
  serviceName: string | null;
}

export async function getJob<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
): Promise<
  | (JobWithLabels & { customCharges: { id: string; description: string; amountCents: number }[] })
  | null
> {
  const [row] = await db
    .select({
      job: jobs,
      contactName: contacts.displayName,
      organizationName: organizations.name,
      propertyAddressLine1: properties.addressLine1,
      propertyCity: properties.city,
      serviceName: services.name,
    })
    .from(jobs)
    .leftJoin(contacts, eq(jobs.contactId, contacts.id))
    .leftJoin(organizations, eq(jobs.organizationId, organizations.id))
    .leftJoin(properties, eq(jobs.propertyId, properties.id))
    .leftJoin(services, eq(jobs.serviceId, services.id))
    .where(eq(jobs.id, jobId));

  if (!row) return null;

  const customCharges = await db
    .select({
      id: jobCustomCharges.id,
      description: jobCustomCharges.description,
      amountCents: jobCustomCharges.amountCents,
    })
    .from(jobCustomCharges)
    .where(eq(jobCustomCharges.jobId, jobId))
    .orderBy(asc(jobCustomCharges.createdAt));

  return {
    ...row.job,
    contactName: row.contactName,
    organizationName: row.organizationName,
    propertyAddressLine1: row.propertyAddressLine1,
    propertyCity: row.propertyCity,
    serviceName: row.serviceName,
    customCharges,
  };
}

export interface ListJobsFilters {
  search?: string;
  /** "active" (default) excludes Cancelled; a specific status filters exactly; "all" applies no status filter. */
  status?: JobStatus | "active" | "all";
  emergencyOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface JobListRow {
  id: string;
  jobNumber: string;
  status: JobStatus;
  issueDescription: string | null;
  emergency: boolean;
  createdAt: Date;
  contactName: string | null;
  propertyAddressLine1: string | null;
}

export async function listJobs<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  filters: ListJobsFilters = {},
): Promise<{ rows: JobListRow[]; total: number; page: number; pageSize: number }> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;

  const conditions = [];
  if (!filters.status || filters.status === "active") {
    conditions.push(ne(jobs.status, "cancelled"));
  } else if (filters.status !== "all") {
    conditions.push(eq(jobs.status, filters.status));
  }
  if (filters.emergencyOnly) {
    conditions.push(eq(jobs.emergency, true));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(jobs.jobNumber, term),
        ilike(jobs.issueDescription, term),
        sql`exists (select 1 from ${contacts} where ${contacts.id} = ${jobs.contactId} and ${contacts.displayName} ilike ${term})`,
        sql`exists (select 1 from ${contactPhones} where ${contactPhones.contactId} = ${jobs.contactId} and ${contactPhones.phoneNormalized} ilike ${term})`,
        sql`exists (select 1 from ${contactEmails} where ${contactEmails.contactId} = ${jobs.contactId} and ${contactEmails.email} ilike ${term})`,
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: jobs.id,
      jobNumber: jobs.jobNumber,
      status: jobs.status,
      issueDescription: jobs.issueDescription,
      emergency: jobs.emergency,
      createdAt: jobs.createdAt,
      contactName: contacts.displayName,
      propertyAddressLine1: properties.addressLine1,
    })
    .from(jobs)
    .leftJoin(contacts, eq(jobs.contactId, contacts.id))
    .leftJoin(properties, eq(jobs.propertyId, properties.id))
    .where(where)
    .orderBy(desc(jobs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(where);

  return { rows, total: count, page, pageSize };
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

export async function addJobCustomCharge<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  description: string,
  amountCents: number,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(jobCustomCharges)
      .values({ jobId, description, amountCents })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_custom_charge_added",
      newValue: { description, amountCents },
    });

    return row;
  });
}

export async function removeJobCustomCharge<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  jobId: string,
  chargeId: string,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(jobCustomCharges)
      .where(and(eq(jobCustomCharges.id, chargeId), eq(jobCustomCharges.jobId, jobId)))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "job",
      entityId: jobId,
      action: "job_custom_charge_removed",
      oldValue: removed
        ? { description: removed.description, amountCents: removed.amountCents }
        : null,
    });
  });
}
