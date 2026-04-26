-- Picks up two pre-existing schema-drift columns that already exist in
-- production (they were added via db:push without a journaled migration).
-- IF NOT EXISTS keeps this safe on already-up-to-date databases.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "starter_recommendations" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_responses_slide_id" ON "responses" USING btree ("slide_id");
