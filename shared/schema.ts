import { pgTable, text, serial, uuid, integer, boolean, timestamp, jsonb, varchar, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Packages table
export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  codeIdx: index("idx_packages_code").on(table.code)
}));

// Package wines table - intermediate layer between packages and slides
export const packageWines = pgTable("package_wines", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  wineName: text("wine_name").notNull(),
  wineDescription: text("wine_description"),
  wineImageUrl: text("wine_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePosition: unique().on(table.packageId, table.position)
}));

// Define all allowed slide types
const slideTypes = ['question', 'media', 'interlude', 'video_message', 'audio_message'] as const;

// Slides table - ALL content lives here, now linked to package wines
export const slides = pgTable("slides", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageWineId: uuid("package_wine_id").notNull().references(() => packageWines.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  type: varchar("type", { length: 50 }).$type<typeof slideTypes[number]>().notNull(),
  section_type: varchar("section_type", { length: 20 }),
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  packageWinePositionIdx: index("idx_slides_package_wine_position").on(table.packageWineId, table.position)
}));

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "cascade" }),
  short_code: varchar("short_code", { length: 8 }).unique(),
  status: varchar("status", { length: 20 }).default('waiting').notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  activeParticipants: integer("active_participants").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  packageIdIdx: index("idx_sessions_package_id").on(table.packageId),
  shortCodeIdx: index("idx_sessions_short_code").on(table.short_code)
}));

// Participants table
export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  isHost: boolean("is_host").default(false),
  progressPtr: integer("progress_ptr").default(0),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  sessionIdx: index("idx_participants_session").on(table.sessionId),
  emailSessionIdx: index("idx_participants_email_session").on(table.email, table.sessionId)
}));

// Responses table
export const responses = pgTable("responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id").references(() => participants.id, { onDelete: "cascade" }),
  slideId: uuid("slide_id").references(() => slides.id, { onDelete: "cascade" }),
  answerJson: jsonb("answer_json").notNull(),
  answeredAt: timestamp("answered_at").defaultNow(),
  synced: boolean("synced").default(true)
}, (table) => ({
  participantIdx: index("idx_responses_participant").on(table.participantId),
  syncedIdx: index("idx_responses_synced").on(table.synced),
  uniqueParticipantSlide: unique().on(table.participantId, table.slideId)
}));

// Glossary terms table
export const glossaryTerms = pgTable("glossary_terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: text("term").notNull().unique(),
  variations: text("variations").array(), // For alternate spellings
  definition: text("definition").notNull(),
  category: varchar("category", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  termIdx: index("idx_glossary_terms_term").on(table.term),
  categoryIdx: index("idx_glossary_terms_category").on(table.category)
}));

// Payload schemas for different slide types
export const videoMessagePayloadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  video_url: z.string().url({ message: "Invalid video URL" }),
  poster_url: z.string().url({ message: "Invalid poster URL" }).optional(),
  autoplay: z.boolean().default(false).optional(),
  show_controls: z.boolean().default(true).optional()
});
export type VideoMessagePayload = z.infer<typeof videoMessagePayloadSchema>;

export const audioMessagePayloadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  audio_url: z.string().url({ message: "Invalid audio URL" }),
  autoplay: z.boolean().default(false).optional(),
  show_controls: z.boolean().default(true).optional()
});
export type AudioMessagePayload = z.infer<typeof audioMessagePayloadSchema>;

export const interludePayloadSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  wine_name: z.string().optional(),
  wine_image: z.string().url().optional()
});
export type InterludePayload = z.infer<typeof interludePayloadSchema>;

export const mediaPayloadSchema = z.object({
  image_url: z.string().url(),
  alt_text: z.string().optional(),
  title: z.string().optional()
});
export type MediaPayload = z.infer<typeof mediaPayloadSchema>;

// Insert schemas
export const insertPackageSchema = createInsertSchema(packages, {
  description: z.string().nullable().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPackageWineSchema = createInsertSchema(packageWines, {
  wineDescription: z.string().nullable().optional(),
  wineImageUrl: z.string().nullable().optional()
}).omit({
  id: true,
  createdAt: true
});

export const insertSlideSchema = createInsertSchema(slides, {
  type: z.enum(slideTypes),
  section_type: z.enum(['intro', 'deep_dive', 'ending']).optional().nullable(),
  payloadJson: z.any() // Accept any JSON payload, validation happens in application logic
}).omit({
  id: true,
  createdAt: true
});

export const insertSessionSchema = createInsertSchema(sessions, {
  packageId: z.string().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  activeParticipants: z.number().int().min(0).nullable().optional(),
  status: z.string().optional(),
  updatedAt: z.date().optional(),
  short_code: z.string().length(6, "Short code must be 6 characters").optional()
}).omit({
  id: true,
  startedAt: true
});

export const insertParticipantSchema = createInsertSchema(participants, {
  sessionId: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  isHost: z.boolean().nullable().optional(),
  progressPtr: z.number().nullable().optional()
}).omit({
  id: true,
  lastActive: true,
  createdAt: true
});

export const insertResponseSchema = createInsertSchema(responses, {
  participantId: z.string().nullable().optional(),
  slideId: z.string().nullable().optional(),
  synced: z.boolean().nullable().optional()
}).omit({
  id: true,
  answeredAt: true
});

export const insertGlossaryTermSchema = createInsertSchema(glossaryTerms, {
  variations: z.array(z.string()).nullable().optional(),
  category: z.string().nullable().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type PackageWine = typeof packageWines.$inferSelect;
export type InsertPackageWine = z.infer<typeof insertPackageWineSchema>;
export type Slide = typeof slides.$inferSelect;
export type InsertSlide = z.infer<typeof insertSlideSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type InsertGlossaryTerm = z.infer<typeof insertGlossaryTermSchema>;
