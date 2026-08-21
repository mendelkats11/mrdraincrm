import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts, organizations, properties } from "./crm";
import { jobs } from "./jobs";
import { users } from "./auth";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "void",
]);

// Invoices are independent customer documents; totals are allowed to
// differ from the job's own financial fields — approved decision in
// docs/IMPLEMENTATION_PLAN.md §2.1.A. Job-level fields remain the
// authoritative internal revenue source; this table never feeds back into
// job financial columns.
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "restrict" }),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  // Snapshotted at send time so a later change to business info/branding
  // never rewrites a historical PDF's content.
  businessName: text("business_name"),
  businessAddress: text("business_address"),
  // R2 object key (private bucket) — see the matching comment on
  // appSettings.logoKey. Snapshotted at creation like everything else here.
  logoKey: text("logo_key"),
  // Snapshotted template choices — src/lib/pdf/invoice-template.ts.
  accentColor: text("accent_color"),
  fontFamily: text("font_family"),
  customerName: text("customer_name"),
  customerAddress: text("customer_address"),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull().default(0),
  notes: text("notes"),
  paymentInstructions: text("payment_instructions"),
  footer: text("footer"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// "cancelled" is the staff-initiated void/archive equivalent required by
// docs/PROJECT_SPEC.md §27 ("Quotes: void/archive") — distinct from
// "declined" (the customer said no). Phase 9 decision 2.
export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "cancelled",
]);

export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteNumber: text("quote_number").notNull().unique(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "restrict",
  }),
  status: quoteStatusEnum("status").notNull().default("draft"),
  description: text("description"),
  subtotalCents: integer("subtotal_cents").notNull().default(0),
  taxCents: integer("tax_cents").notNull().default(0),
  notes: text("notes"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  convertedJobId: uuid("converted_job_id").references(() => jobs.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quoteLineItems = pgTable("quote_line_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

// May be positive or negative (negative = discount/credit), mirroring
// job_custom_charges — docs/IMPLEMENTATION_PLAN.md §2.1.C.
export const quoteCustomCharges = pgTable("quote_custom_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMethodEnum = pgEnum("payment_method", [
  "e_transfer",
  "cash",
  "cheque",
  "other",
]);

// Revised payment/balance model approved in
// docs/IMPLEMENTATION_PLAN.md §2.1.D: a payment always belongs to a job and
// may optionally also be allocated to one specific invoice. Job balance and
// invoice balance are computed independently at query time from this table
// (never stored) — an invoice's existence never changes the job balance.
// Refunds are their own payment row with a negative amountCents, not a
// mutation of an existing payment — §2.1.F.
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "restrict" }),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    method: paymentMethodEnum("method").notNull(),
    referenceNote: text("reference_note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // Never hard-deleted — docs/PROJECT_SPEC.md §12. Correction mechanism
    // approved in docs/IMPLEMENTATION_PLAN.md §2.1.E.
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_job_idx").on(table.jobId),
    index("payments_invoice_idx").on(table.invoiceId),
  ],
);

// Transactional sequential numbering for jobs/invoices/quotes —
// docs/ARCHITECTURE.md §7. Allocation logic lives in src/lib/sequences.
export const sequences = pgTable("sequences", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  prefix: text("prefix").notNull().default(""),
  nextNumber: integer("next_number").notNull().default(1),
  minDigits: integer("min_digits").notNull().default(4),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
