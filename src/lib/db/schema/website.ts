import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Website content is data-driven (docs/ARCHITECTURE.md §19) — the public
// site reads published/active rows, never hard-coded content.

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageKey: text("image_key"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceAreas = pgTable("service_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  copy: text("copy"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  // CallRail tracking number for this area's "Call Now" CTA — see
  // docs/PROJECT_SPEC.md §16. Not a secret; safe as a plain column.
  callrailTrackingNumber: text("callrail_tracking_number"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryBeforeAfterEnum = pgEnum("gallery_before_after", ["before", "after", "na"]);

export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  storageKey: text("storage_key").notNull(),
  caption: text("caption"),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "restrict" }),
  serviceAreaId: uuid("service_area_id").references(() => serviceAreas.id, {
    onDelete: "restrict",
  }),
  beforeAfter: galleryBeforeAfterEnum("before_after").notNull().default("na"),
  featured: boolean("featured").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  takenAt: timestamp("taken_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    reviewText: text("review_text"),
    rating: integer("rating").notNull(),
    reviewDate: timestamp("review_date", { withTimezone: true }).notNull().defaultNow(),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`)],
);

export const homepageSectionTypeEnum = pgEnum("homepage_section_type", [
  "hero",
  "services",
  "gallery",
  "service_areas",
  "reviews",
  "why_mr_drain",
  "cta",
]);

// Structured sections, not a free-form page builder — docs/PROJECT_SPEC.md
// §19.1. `config` holds per-section content/selection/ordering only; it can
// never introduce a new section type or break page structure.
export const homepageSections = pgTable("homepage_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionType: homepageSectionTypeEnum("section_type").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});
