ALTER TABLE "projects" ALTER COLUMN "fallback_message" SET DEFAULT 'This question does not belong to My Work';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "custom_api_key" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "custom_model" text;