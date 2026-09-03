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

/**
 * Website editor overhaul, phase 1 (Sep 2026) — a real media library.
 * Every image upload across the CMS (service images, service-area images,
 * gallery photos, hero collage photos, background images) previously went
 * straight to storage with no row tracking it, so nothing could be listed,
 * searched, or reused — every image field was its own fresh upload with no
 * memory of what had already been uploaded elsewhere. This table is the
 * single source of truth for "what images exist," independent of where a
 * given image happens to be used; uploadPublicAsset's storage key format is
 * unchanged, so existing image references (already-stored keys on services/
 * serviceAreas/galleryItems/homepageSections) keep resolving exactly as
 * before — this is additive, not a migration of existing data.
 */
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  // Short blurb — used on the /services listing cards and as the meta
  // description fallback. Kept separate from `content` (below) rather than
  // reused for both, which is what the service detail page used to do —
  // SEO audit (Sep 2026) P1 finding: that's why every service page had a
  // one-sentence body and nothing else.
  description: text("description"),
  // Full body content for the service's own detail page — one or more
  // paragraphs, admin-editable, blank line separated. Optional: a service
  // can exist with just the short description above until its detail page
  // gets a real content pass.
  content: text("content"),
  // Structured FAQ pairs for the same page — also drives FAQPage schema
  // (only emitted when non-empty, since the content has to actually be on
  // the page for that schema to be legitimate).
  faqs: jsonb("faqs").$type<{ question: string; answer: string }[]>().notNull().default([]),
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
  // Structured FAQ pairs for this area's own page — same shape and purpose
  // as services.faqs (drives FAQPage schema, only when non-empty).
  faqs: jsonb("faqs").$type<{ question: string; answer: string }[]>().notNull().default([]),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  // CallRail tracking number for this area's "Call Now" CTA — see
  // docs/PROJECT_SPEC.md §16. Not a secret; safe as a plain column.
  callrailTrackingNumber: text("callrail_tracking_number"),
  // Free text (e.g. "SK", "BC"), not an enum — grouping/filtering only
  // (admin list page), never validated against a fixed province list.
  // A service area can exist purely for CallRail/CRM attribution without
  // a public page at all (active: false) — e.g. a region CallRail tracks
  // that doesn't have its own marketing page yet.
  region: text("region"),
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
