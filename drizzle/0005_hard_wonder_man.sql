ALTER TABLE "invoices" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "accent_color" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "font_family" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "invoice_accent_color" text;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "invoice_font_family" text;