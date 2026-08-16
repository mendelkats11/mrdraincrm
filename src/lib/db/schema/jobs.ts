import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts, organizations, properties } from "./crm";
import { galleryItems, services } from "./website";

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "quoted",
  "follow_up",
  "won",
  "lost",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "draft",
  "open",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// Contractor payout amount is a manually entered job-level cost field
// (docs/CLAUDE.md §6); this tracks the separate "has it actually been paid
// out" lifecycle per assignment — docs/PROJECT_SPEC.md §8.5/§10.
export const contractorAssignmentStatusEnum = pgEnum("contractor_assignment_status", [
  "unassigned",
  "assigned",
  "completed",
  "payout_pending",
  "paid",
]);

// Snapshotted onto each job at creation per the approved decision in
// docs/IMPLEMENTATION_PLAN.md §2.1.B — never read live from settings once set.
export const taxInclusionModeEnum = pgEnum("tax_inclusion_mode", ["included", "excluded"]);

// Declared before `jobs` so `leads.convertedJobId` can reference it via a
// lazy thunk (`() => jobs.id`); `jobs.leadId` then references `leads`
// directly below, once `leads` already exists. This is the standard Drizzle
// pattern for the bidirectional lead<->job link required by
// docs/PROJECT_SPEC.md §6.4 ("if converted: lead becomes Won, job is
// linked") without a cross-file circular import.
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "restrict",
  }),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "restrict" }),
  status: leadStatusEnum("status").notNull().default("new"),
  // Original source must never be overwritten once set (docs/PROJECT_SPEC.md
  // §6.4) — enforced at the application layer, not the schema.
  originalSource: text("original_source"),
  latestSource: text("latest_source"),
  sourceDetails: text("source_details"),
  landingPage: text("landing_page"),
  issueDescription: text("issue_description"),
  emergency: boolean("emergency").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  convertedJobId: uuid("converted_job_id").references((): AnyPgColumn => jobs.id, {
    onDelete: "restrict",
  }),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobNumber: text("job_number").notNull().unique(),
    // Jobs may be created without a contact/property/organization/lead —
    // docs/CLAUDE.md §6 — hence every relationship FK below is nullable.
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "restrict" }),
    issueDescription: text("issue_description"),
    emergency: boolean("emergency").notNull().default(false),
    internalNotes: text("internal_notes"),
    status: jobStatusEnum("status").notNull().default("draft"),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
    timeTbd: boolean("time_tbd").notNull().default(false),
    // Snapshot per docs/IMPLEMENTATION_PLAN.md §2.1.B. Application code sets
    // this from the current app_settings default at creation time — there is
    // deliberately no DB-level default referencing another table.
    taxInclusionMode: taxInclusionModeEnum("tax_inclusion_mode").notNull(),
    // Revenue/cost inputs — docs/PROJECT_SPEC.md §11. Integer cents; payment
    // status and invoice status are derived at query time from payments/
    // invoices, not stored here, so they can never drift out of sync
    // (docs/ARCHITECTURE.md §8: "keep source values separate from calculated
    // values").
    jobAmountCents: integer("job_amount_cents").notNull().default(0),
    taxAmountCents: integer("tax_amount_cents").notNull().default(0),
    materialsCents: integer("materials_cents").notNull().default(0),
    contractorPayoutCents: integer("contractor_payout_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    index("jobs_status_idx").on(table.status),
    index("jobs_created_at_idx").on(table.createdAt),
  ],
);

// Job-level revenue-side adjustments; may be positive or negative
// (negative = discount/credit) per the approved decision in
// docs/IMPLEMENTATION_PLAN.md §2.1.C.
export const jobCustomCharges = pgTable("job_custom_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobPhotoCategoryEnum = pgEnum("job_photo_category", [
  "before",
  "during",
  "after",
  "other",
]);

// The one table where hard delete is allowed by spec (docs/PROJECT_SPEC.md
// §18: "delete with confirmation"), so its FK may safely cascade — see
// docs/IMPLEMENTATION_PLAN.md §6.4.
export const jobPhotos = pgTable("job_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  category: jobPhotoCategoryEnum("category").notNull().default("other"),
  caption: text("caption"),
  // Publishing to the gallery is an explicit copy, not a flag flip — see
  // docs/IMPLEMENTATION_PLAN.md §9.4. Set by that copy operation once
  // gallery publishing ships (Phase 5+).
  galleryItemId: uuid("gallery_item_id").references(() => galleryItems.id, {
    onDelete: "restrict",
  }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contractors = pgTable("contractors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  defaultPayoutArrangement: text("default_payout_arrangement"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobContractorAssignments = pgTable(
  "job_contractor_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "restrict" }),
    status: contractorAssignmentStatusEnum("status").notNull().default("assigned"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("job_contractor_assignments_job_idx").on(table.jobId),
    index("job_contractor_assignments_contractor_idx").on(table.contractorId),
  ],
);
