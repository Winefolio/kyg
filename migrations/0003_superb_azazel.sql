CREATE TABLE "auth_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(12) NOT NULL,
	"sommelier_id" uuid,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"media_type" varchar(20) NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"storage_url" text NOT NULL,
	"thumbnail_url" text,
	"duration" integer,
	"metadata" jsonb,
	"is_public" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now(),
	"last_accessed_at" timestamp,
	CONSTRAINT "media_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "package_wines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"wine_name" text NOT NULL,
	"wine_description" text,
	"wine_image_url" text,
	"wine_type" varchar(50),
	"vintage" integer,
	"region" text,
	"producer" text,
	"grape_varietals" jsonb,
	"alcohol_content" text,
	"expected_characteristics" jsonb,
	"discussion_questions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "package_wines_package_id_position_unique" UNIQUE("package_id","position")
);
--> statement-breakpoint
CREATE TABLE "session_wine_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"package_wine_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"is_included" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "slide_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sommelier_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"section_type" varchar(20),
	"payload_template" jsonb NOT NULL,
	"is_public" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sommeliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"profile_image_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sommeliers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tastings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wine_name" varchar(255) NOT NULL,
	"wine_region" varchar(255),
	"wine_vintage" integer,
	"grape_variety" varchar(255),
	"wine_type" varchar(50),
	"photo_url" text,
	"tasted_at" timestamp DEFAULT now() NOT NULL,
	"responses" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wine_characteristics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"scale_type" varchar(20) NOT NULL,
	"scale_min" integer,
	"scale_max" integer,
	"scale_labels" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "wine_characteristics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wine_response_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_wine_id" uuid NOT NULL,
	"characteristic_name" varchar(100) NOT NULL,
	"expected_value" text,
	"average_user_value" text,
	"accuracy_score" integer,
	"response_count" integer DEFAULT 0,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP INDEX "idx_slides_package_position";--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "sommelier_id" uuid;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "is_public" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "sommelier_feedback" text;--> statement-breakpoint
ALTER TABLE "slides" ADD COLUMN "package_wine_id" uuid;--> statement-breakpoint
ALTER TABLE "slides" ADD COLUMN "global_position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "slides" ADD COLUMN "generic_questions" jsonb;--> statement-breakpoint
ALTER TABLE "slides" ADD COLUMN "comparable" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "package_wines" ADD CONSTRAINT "package_wines_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_wine_selections" ADD CONSTRAINT "session_wine_selections_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_wine_selections" ADD CONSTRAINT "session_wine_selections_package_wine_id_package_wines_id_fk" FOREIGN KEY ("package_wine_id") REFERENCES "public"."package_wines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tastings" ADD CONSTRAINT "tastings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wine_response_analytics" ADD CONSTRAINT "wine_response_analytics_package_wine_id_package_wines_id_fk" FOREIGN KEY ("package_wine_id") REFERENCES "public"."package_wines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_attempts_email" ON "auth_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_auth_attempts_ip" ON "auth_attempts" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_auth_attempts_attempted_at" ON "auth_attempts" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "idx_media_public_id" ON "media" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "idx_media_entity" ON "media" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_media_sommelier" ON "media" USING btree ("sommelier_id");--> statement-breakpoint
CREATE INDEX "idx_package_wines_type" ON "package_wines" USING btree ("wine_type");--> statement-breakpoint
CREATE INDEX "idx_package_wines_vintage" ON "package_wines" USING btree ("vintage");--> statement-breakpoint
CREATE INDEX "idx_session_wines_session_id" ON "session_wine_selections" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_wines_session_position" ON "session_wine_selections" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "idx_unique_session_wine" ON "session_wine_selections" USING btree ("session_id","package_wine_id");--> statement-breakpoint
CREATE INDEX "idx_slide_templates_type" ON "slide_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_sommeliers_email" ON "sommeliers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_tastings_user_id" ON "tastings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tastings_tasted_at" ON "tastings" USING btree ("tasted_at");--> statement-breakpoint
CREATE INDEX "idx_tastings_responses" ON "tastings" USING gin ("responses");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_wine_characteristics_category" ON "wine_characteristics" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_wine_analytics_wine_char" ON "wine_response_analytics" USING btree ("package_wine_id","characteristic_name");--> statement-breakpoint
ALTER TABLE "slides" ADD CONSTRAINT "slides_package_wine_id_package_wines_id_fk" FOREIGN KEY ("package_wine_id") REFERENCES "public"."package_wines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_slides_package_wine_position" ON "slides" USING btree ("package_wine_id","position");--> statement-breakpoint
CREATE INDEX "idx_slides_global_position" ON "slides" USING btree ("package_wine_id","global_position");--> statement-breakpoint
CREATE INDEX "idx_slides_package_wine_id" ON "slides" USING btree ("package_wine_id");--> statement-breakpoint
CREATE INDEX "idx_slides_package_id" ON "slides" USING btree ("package_id");