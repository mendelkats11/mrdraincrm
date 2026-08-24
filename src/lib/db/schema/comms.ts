import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { contacts, organizations, properties } from "./crm";
import { jobs } from "./jobs";
import { serviceAreas } from "./website";
import { users } from "./auth";

// Unknown callers never automatically become contacts (docs/CLAUDE.md §6);
// `matched`/`contactId` reflect that a match was found, `ignored` reflects
// an explicit owner action, not an automatic one.
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    callrailCallId: text("callrail_call_id").notNull().unique(),
    callerNumber: text("caller_number").notNull(),
    callerNumberNormalized: text("caller_number_normalized").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    serviceAreaId: uuid("service_area_id").references(() => serviceAreas.id, {
      onDelete: "restrict",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
    matched: boolean("matched").notNull().default(false),
    answered: boolean("answered").notNull().default(false),
    // "inbound" (the customer called us — the overwhelming majority) or
    // "outbound" (we called them, e.g. the "Call back" feature — see
    // src/lib/callrail/callback.ts). Defaults to inbound since that's what
    // every row before this column existed was.
    direction: text("direction").notNull().default("inbound"),
    durationSeconds: integer("duration_seconds"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>(),
    ignored: boolean("ignored").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("calls_tracking_number_idx").on(table.trackingNumber),
    index("calls_caller_number_idx").on(table.callerNumberNormalized),
  ],
);

// Incoming only in V1 — outgoing SMS is explicitly excluded
// (docs/CLAUDE.md §6).
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  callrailMessageId: text("callrail_message_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  phoneNumberNormalized: text("phone_number_normalized").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
  trackingNumber: text("tracking_number").notNull(),
  body: text("body"),
  mediaUrls: jsonb("media_urls").$type<string[]>().notNull().default([]),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Idempotency ledger for inbound webhooks (CallRail today, others later) —
// docs/ARCHITECTURE.md §15. A row is inserted with ON CONFLICT DO NOTHING
// before any business logic runs; no row returned means "already seen."
export const webhookLog = pgTable(
  "webhook_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    externalEventId: text("external_event_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("webhook_log_provider_event_idx").on(table.provider, table.externalEventId),
  ],
);

export const reminderPriorityEnum = pgEnum("reminder_priority", ["low", "medium", "high"]);

export const reminderRecurrenceEnum = pgEnum("reminder_recurrence", [
  "one_time",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  priority: reminderPriorityEnum("priority").notNull().default("medium"),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "restrict",
  }),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "restrict" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "restrict" }),
  recurrence: reminderRecurrenceEnum("recurrence").notNull().default("one_time"),
  // Completing a reminder preserves it in history — docs/PROJECT_SPEC.md §17.
  completedAt: timestamp("completed_at", { withTimezone: true }),
  // "Don't show again" — Phase 10 decision. Distinct from completedAt: the
  // task wasn't necessarily done, it's just no longer wanted. Preserved in
  // history like everything else, never hard-deleted.
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    // Business-timezone calendar date this notification instance is "for" —
    // Phase 10 decision: an overdue reminder renotifies once per day it
    // remains unresolved, so dedup can't be "once ever." Only populated for
    // entity_type = 'reminder'; other notification types leave it null.
    notificationDate: date("notification_date"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_idx").on(table.recipientUserId),
    // Idempotency guarantee for the scheduled function (docs/PROJECT_SPEC.md
    // §24, Phase 10): a concurrent/duplicate run can never create a second
    // "reminder_due" notification for the same recipient+reminder+day.
    // Scoped to entity_type = 'reminder' so it never constrains a future
    // notification type that legitimately wants to repeat same-day.
    uniqueIndex("notifications_reminder_dedupe_idx")
      .on(
        table.recipientUserId,
        table.entityType,
        table.entityId,
        table.type,
        table.notificationDate,
      )
      .where(sql`${table.entityType} = 'reminder'`),
  ],
);

export const emailEventStatusEnum = pgEnum("email_event_status", [
  "sent",
  "delivered",
  "bounced",
  "failed",
]);

export const emailEvents = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerMessageId: text("provider_message_id"),
  toEmail: text("to_email").notNull(),
  template: text("template").notNull(),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  status: emailEventStatusEnum("status").notNull().default("sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
