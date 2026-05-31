CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_sticker_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sticker_slot_id" uuid NOT NULL,
	"owned" boolean DEFAULT false NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_sticker_progress" ADD CONSTRAINT "user_sticker_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sticker_progress" ADD CONSTRAINT "user_sticker_progress_sticker_slot_id_sticker_slots_id_fk" FOREIGN KEY ("sticker_slot_id") REFERENCES "public"."sticker_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_sticker_progress_user_slot_unique" ON "user_sticker_progress" USING btree ("user_id","sticker_slot_id");--> statement-breakpoint
CREATE INDEX "user_sticker_progress_user_id_idx" ON "user_sticker_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sticker_progress_slot_id_idx" ON "user_sticker_progress" USING btree ("sticker_slot_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
