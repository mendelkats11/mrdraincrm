ALTER TABLE "notifications" ADD COLUMN "notification_date" date;--> statement-breakpoint
ALTER TABLE "reminders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "reminder_email_notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_reminder_dedupe_idx" ON "notifications" USING btree ("recipient_user_id","entity_type","entity_id","type","notification_date") WHERE "notifications"."entity_type" = 'reminder';