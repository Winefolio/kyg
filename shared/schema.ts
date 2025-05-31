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

// Slides table - ALL content lives here
export const slides = pgTable("slides", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'question', 'media', 'interlude'
  payloadJson: jsonb("payload_json").notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  packagePositionIdx: index("idx_slides_package_position").on(table.packageId, table.position)
}));

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default('waiting').notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  activeParticipants: integer("active_participants").default(0)
});

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

// Insert schemas
export const insertPackageSchema = createInsertSchema(packages, {
  description: z.string().nullable().optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSlideSchema = createInsertSchema(slides, {
  packageId: z.string().nullable().optional()
}).omit({
  id: true,
  createdAt: true
});

export const insertSessionSchema = createInsertSchema(sessions, {
  packageId: z.string().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  activeParticipants: z.number().nullable().optional()
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

// Types
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Slide = typeof slides.$inferSelect;
export type InsertSlide = z.infer<typeof insertSlideSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
