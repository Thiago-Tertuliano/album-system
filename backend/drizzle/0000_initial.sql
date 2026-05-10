CREATE TABLE "album_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"title" text,
	"preview_image_url" text
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"host_country" text,
	"publisher" text DEFAULT 'Panini' NOT NULL,
	"cover_image_url" text,
	"sticker_total" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"estimated_pack_price_cents" integer,
	"collector_notes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sticker_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"page_id" uuid,
	"album_label" text NOT NULL,
	"sort_index" integer NOT NULL,
	"index_on_page" integer,
	"category" text DEFAULT 'player' NOT NULL,
	"is_special" boolean DEFAULT false NOT NULL,
	"display_name" text NOT NULL,
	"team_code" text,
	"team_name" text,
	"shirt_number" integer,
	"position" text,
	"image_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "album_pages" ADD CONSTRAINT "album_pages_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker_slots" ADD CONSTRAINT "sticker_slots_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sticker_slots" ADD CONSTRAINT "sticker_slots_page_id_album_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."album_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "album_pages_edition_page_unique" ON "album_pages" USING btree ("edition_id","page_number");--> statement-breakpoint
CREATE INDEX "editions_slug_idx" ON "editions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "editions_year_idx" ON "editions" USING btree ("year");--> statement-breakpoint
CREATE UNIQUE INDEX "sticker_slots_edition_album_label_unique" ON "sticker_slots" USING btree ("edition_id","album_label");--> statement-breakpoint
CREATE INDEX "sticker_slots_edition_sort_idx" ON "sticker_slots" USING btree ("edition_id","sort_index");--> statement-breakpoint
CREATE INDEX "sticker_slots_edition_id_idx" ON "sticker_slots" USING btree ("edition_id");--> statement-breakpoint
CREATE INDEX "sticker_slots_page_id_idx" ON "sticker_slots" USING btree ("page_id");