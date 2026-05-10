ALTER TABLE "sticker_slots" ADD COLUMN "owned" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "sticker_slots" ADD COLUMN "duplicate_count" integer DEFAULT 0 NOT NULL;
