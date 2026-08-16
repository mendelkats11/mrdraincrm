import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const propertyTypeEnum = pgEnum("property_type", [
  "residential",
  "commercial",
  "multi_unit",
  "industrial",
  "other",
]);

export const contactPropertyRoleEnum = pgEnum("contact_property_role", [
  "primary_contact",
  "owner",
  "tenant",
  "property_manager",
  "spouse_family",
  "business_contact",
  "other",
]);

// A contact may exist without any job/lead/property attached — see
// docs/CLAUDE.md §6. All relationships below are therefore optional on
// the *other* side (jobs.contact_id etc.), never required here.
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    displayName: text("display_name").notNull(),
    notes: text("notes"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("contacts_display_name_trgm_idx").using("gin", sql`${table.displayName} gin_trgm_ops`),
  ],
);

export const contactPhones = pgTable(
  "contact_phones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    phoneE164: text("phone_e164").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    label: text("label"),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [index("contact_phones_normalized_idx").on(table.phoneNormalized)],
);

export const contactEmails = pgTable(
  "contact_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    label: text("label"),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [index("contact_emails_lower_idx").on(sql`lower(${table.email})`)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [index("organizations_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`)],
);

// Many-to-many: a person can belong to an organization while also having
// personal/residential properties — docs/PROJECT_SPEC.md §6.2.
export const organizationContacts = pgTable(
  "organization_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_contacts_org_contact_idx").on(table.organizationId, table.contactId),
  ],
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    province: text("province").notNull(),
    postalCode: text("postal_code").notNull(),
    propertyType: propertyTypeEnum("property_type").notNull().default("residential"),
    businessName: text("business_name"),
    notes: text("notes"),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("properties_address_trgm_idx").using("gin", sql`${table.addressLine1} gin_trgm_ops`),
    index("properties_city_postal_idx").on(table.city, table.postalCode),
  ],
);

// Many-to-many with a role — a property may have multiple contacts, and a
// contact may relate to multiple properties (docs/PROJECT_SPEC.md §6.3).
export const propertyContacts = pgTable(
  "property_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    role: contactPropertyRoleEnum("role").notNull().default("other"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("property_contacts_property_idx").on(table.propertyId),
    index("property_contacts_contact_idx").on(table.contactId),
  ],
);
