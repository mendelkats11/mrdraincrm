CREATE TABLE "portfolio_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_image_key" text NOT NULL,
	"service_id" uuid,
	"service_area_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "portfolio_jobs" ADD CONSTRAINT "portfolio_jobs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_jobs" ADD CONSTRAINT "portfolio_jobs_service_area_id_service_areas_id_fk" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- One-time, non-destructive backfill: every pre-existing flat gallery photo
-- becomes its own job, with that photo as the cover. Nothing is deleted or
-- altered on gallery_items — this is a pure copy, so it's trivially
-- reversible (DELETE FROM portfolio_jobs would fully undo it) and the old
-- table stays exactly as it was for anyone who still queries it directly.
-- Slugs use the row's own id (guaranteed unique, no admin input available
-- at migration time) rather than the caption, since a caption may be blank,
-- duplicated across rows, or contain characters unsafe for a URL.
INSERT INTO "portfolio_jobs" ("title", "slug", "description", "cover_image_key", "service_id", "service_area_id", "featured", "hidden", "completed_at", "sort_order", "created_at")
SELECT
	COALESCE(NULLIF(TRIM("caption"), ''), 'Completed job'),
	'job-' || substr("id"::text, 1, 8),
	NULL,
	"storage_key",
	"service_id",
	"service_area_id",
	"featured",
	"hidden",
	"taken_at",
	(ROW_NUMBER() OVER (ORDER BY "created_at" DESC) - 1)::int,
	"created_at"
FROM "gallery_items";