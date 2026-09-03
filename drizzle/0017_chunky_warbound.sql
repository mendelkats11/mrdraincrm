ALTER TABLE "services" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "faqs" jsonb DEFAULT '[]'::jsonb NOT NULL;