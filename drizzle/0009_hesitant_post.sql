CREATE TYPE "public"."dashboard_mode" AS ENUM('operations', 'financial');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dashboard_mode" "dashboard_mode" DEFAULT 'operations' NOT NULL,
	"dashboard_widget_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dashboard_widget_hidden" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sidebar_item_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sidebar_item_hidden" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;