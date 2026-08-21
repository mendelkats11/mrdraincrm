import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { taxInclusionModeEnum } from "./jobs";

// Singleton row: `singleton` is boolean, NOT NULL, UNIQUE, and always
// `true` — Postgres allows at most one row where a unique column holds a
// given value, so this is a real database-level guarantee of "exactly one
// settings row," not just an application convention.
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  singleton: boolean("singleton").notNull().default(true).unique(),
  businessName: text("business_name"),
  // Phase 8: prefill source for the invoice PDF's business info — an
  // invoice snapshots these at creation time (see invoices.businessName/
  // logoKey in money.ts), it never reads these live, so editing Settings
  // later never rewrites an already-created invoice.
  businessAddress: text("business_address"),
  // R2 object key (private bucket), not a public URL — resolved to a
  // short-lived signed URL wherever it's actually displayed/embedded.
  // Replaces logo_url once logo upload replaced pasting a URL by hand.
  logoKey: text("logo_key"),
  // Curated choices only (see src/lib/pdf/invoice-template.ts) — a small,
  // structured set of options, not an open-ended template builder.
  invoiceAccentColor: text("invoice_accent_color"),
  invoiceFontFamily: text("invoice_font_family"),
  notificationEmail: text("notification_email"),
  // Phase 10: the one email setting docs/PROJECT_SPEC.md §17 asks for
  // ("Email reminder settings are configurable"). Destination address is
  // the notificationEmail field above.
  reminderEmailNotificationsEnabled: boolean("reminder_email_notifications_enabled")
    .notNull()
    .default(true),
  // Default applied to newly created jobs; changing this never rewrites the
  // tax_inclusion_mode already snapshotted on existing jobs — §2.1.B.
  taxInclusionDefault: taxInclusionModeEnum("tax_inclusion_default").notNull().default("excluded"),
  // Phase 16 (Reports) — docs/PROJECT_SPEC.md §11.1: "Tax inclusion in
  // revenue/profit is configurable in Settings." Distinct from
  // taxInclusionDefault above: that field only seeds a new job's own
  // customer-facing tax_inclusion_mode snapshot and is never read again once
  // set. This field is read live, every time a report or the financial
  // dashboard computes revenue/profit, and only affects whether the tax
  // portion of a job counts toward company revenue for that purpose — it
  // never changes what a customer owes (Customer Total always includes tax,
  // per §11.1's base formula) and never rewrites stored job data, satisfying
  // §29's "changing a reporting setting must not rewrite historical raw
  // data."
  includeTaxInRevenue: boolean("include_tax_in_revenue").notNull().default(true),
  // Phase 15 (Website CMS) — public-site-wide content that isn't tied to a
  // specific service/service area/homepage section. tagline/about* feed the
  // hero and About page; publicContactEmail is shown to visitors (distinct
  // from LEAD_NOTIFICATION_EMAILS, which is an internal-only env var);
  // defaultCallrailTrackingNumber is the Call Now number for pages with no
  // more specific service-area tracking number (docs/PROJECT_SPEC.md §2.4)
  // — service area pages use their own serviceAreas.callrailTrackingNumber
  // instead.
  tagline: text("tagline"),
  aboutHeading: text("about_heading"),
  aboutBody: text("about_body"),
  publicContactEmail: text("public_contact_email"),
  defaultCallrailTrackingNumber: text("default_callrail_tracking_number"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Structural template lives in code (React Email); this holds only the
// editable content per template key — docs/IMPLEMENTATION_PLAN.md §9.1.
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  subject: text("subject").notNull(),
  introText: text("intro_text"),
  footerText: text("footer_text"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only audit/activity log — docs/ARCHITECTURE.md §16. Every
// meaningful mutation writes here in the same DB transaction as the change
// it describes, so history can never drift out of sync with the record.
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null actor = system-generated event (e.g. a CallRail webhook).
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    oldValue: jsonb("old_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activities_entity_idx").on(table.entityType, table.entityId, table.createdAt)],
);
