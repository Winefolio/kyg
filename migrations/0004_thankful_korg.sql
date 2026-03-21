CREATE TABLE "ai_response_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"cache_key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"response_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_response_cache_user_email_cache_key_unique" UNIQUE("user_email","cache_key")
);
--> statement-breakpoint
CREATE TABLE "chapter_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"tasting_id" integer NOT NULL,
	"wine_photo_url" text,
	"wine_validation" jsonb,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_completions_user_id_chapter_id_unique" UNIQUE("user_id","chapter_id")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"wine_requirements" jsonb,
	"learning_objectives" jsonb,
	"tasting_prompts" jsonb,
	"completion_criteria" jsonb,
	"shopping_tips" text,
	"price_range" jsonb,
	"alternatives" jsonb,
	"ask_for" text,
	"wine_options" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_journey_id_chapter_number_unique" UNIQUE("journey_id","chapter_number")
);
--> statement-breakpoint
CREATE TABLE "generated_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_completion_id" integer NOT NULL,
	"questions" jsonb NOT NULL,
	"wine_context" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"liaison_id" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"difficulty_level" varchar(20) DEFAULT 'beginner' NOT NULL,
	"estimated_duration" varchar(50),
	"wine_type" varchar(50),
	"cover_image_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"total_chapters" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sommelier_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(200),
	"summary" text,
	"last_summary_at" timestamp,
	"message_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sommelier_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"image_description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"journey_id" integer NOT NULL,
	"current_chapter" integer DEFAULT 1 NOT NULL,
	"completed_chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "user_journeys_user_id_journey_id_unique" UNIQUE("user_id","journey_id")
);
--> statement-breakpoint
CREATE TABLE "user_taste_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"profile_data" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"synthesized_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_taste_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "wine_characteristics_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"wine_signature" varchar(500) NOT NULL,
	"characteristics" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wine_characteristics_cache_wine_signature_unique" UNIQUE("wine_signature")
);
--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "wine_characteristics" jsonb;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "recommendations" jsonb;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "tasting_mode" varchar(20) DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "tastings" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tasting_level" varchar(20) DEFAULT 'intro' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tastings_completed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "level_up_prompt_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "wine_archetype" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_data" jsonb;--> statement-breakpoint
ALTER TABLE "chapter_completions" ADD CONSTRAINT "chapter_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_completions" ADD CONSTRAINT "chapter_completions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_completions" ADD CONSTRAINT "chapter_completions_tasting_id_tastings_id_fk" FOREIGN KEY ("tasting_id") REFERENCES "public"."tastings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_questions" ADD CONSTRAINT "generated_questions_chapter_completion_id_chapter_completions_id_fk" FOREIGN KEY ("chapter_completion_id") REFERENCES "public"."chapter_completions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_liaison_id_users_id_fk" FOREIGN KEY ("liaison_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sommelier_chats" ADD CONSTRAINT "sommelier_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sommelier_messages" ADD CONSTRAINT "sommelier_messages_chat_id_sommelier_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."sommelier_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_journeys" ADD CONSTRAINT "user_journeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_journeys" ADD CONSTRAINT "user_journeys_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_taste_profiles" ADD CONSTRAINT "user_taste_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_response_cache_email" ON "ai_response_cache" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_chapter_completions_user" ON "chapter_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chapter_completions_chapter" ON "chapter_completions" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_chapters_journey" ON "chapters" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_generated_questions_completion" ON "generated_questions" USING btree ("chapter_completion_id");--> statement-breakpoint
CREATE INDEX "idx_journeys_liaison" ON "journeys" USING btree ("liaison_id");--> statement-breakpoint
CREATE INDEX "idx_journeys_published" ON "journeys" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "idx_journeys_difficulty" ON "journeys" USING btree ("difficulty_level");--> statement-breakpoint
CREATE INDEX "idx_sommelier_chats_user" ON "sommelier_chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sommelier_chats_updated" ON "sommelier_chats" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_sommelier_messages_chat" ON "sommelier_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "idx_sommelier_messages_chat_created" ON "sommelier_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_journeys_user" ON "user_journeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_journeys_journey" ON "user_journeys" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "idx_wine_cache_signature" ON "wine_characteristics_cache" USING btree ("wine_signature");--> statement-breakpoint
CREATE INDEX "idx_participants_email" ON "participants" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_slides_type" ON "slides" USING btree ("type");