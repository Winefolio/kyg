import { pgTable, text, serial, uuid, integer, boolean, timestamp, jsonb, varchar, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sommeliers table for multi-tenant authentication
export const sommeliers = pgTable("sommeliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  profileImageUrl: text("profile_image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  emailIdx: index("idx_sommeliers_email").on(table.email)
}));

// Wine characteristics table for tracking attributes
export const wineCharacteristics = pgTable("wine_characteristics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(), // 'structure', 'flavor', 'aroma', etc.
  description: text("description"),
  scaleType: varchar("scale_type", { length: 20 }).notNull(), // 'numeric', 'descriptive', 'boolean'
  scaleMin: integer("scale_min"),
  scaleMax: integer("scale_max"),
  scaleLabels: jsonb("scale_labels"), // Array of label options
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  categoryIdx: index("idx_wine_characteristics_category").on(table.category)
}));

// Slide templates for reusable question patterns
export const slideTemplates = pgTable("slide_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  sommelierId: uuid("sommelier_id"),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(),
  sectionType: varchar("section_type", { length: 20 }),
  payloadTemplate: jsonb("payload_template").notNull(),
  isPublic: boolean("is_public").default(false), // Can be used by other sommeliers
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  typeIdx: index("idx_slide_templates_type").on(table.type)
}));

// Packages table with sommelier ownership
export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sommelierId: uuid("sommelier_id"),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(false), // Can be viewed/used by other sommeliers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  codeIdx: index("idx_packages_code").on(table.code)
}));

// Package wines table with enhanced tracking capabilities
export const packageWines = pgTable("package_wines", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageId: uuid("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  wineName: text("wine_name").notNull(),
  wineDescription: text("wine_description"),
  wineImageUrl: text("wine_image_url"),
  // Wine Analytics Attributes
  wineType: varchar("wine_type", { length: 50 }), // 'red', 'white', 'rosé', 'sparkling', 'dessert'
  vintage: integer("vintage"),
  region: text("region"),
  producer: text("producer"),
  grapeVarietals: jsonb("grape_varietals"), // Array of grape varieties
  alcoholContent: text("alcohol_content"), // e.g., "13.5%"
  // Expected characteristics for analytics comparison
  expectedCharacteristics: jsonb("expected_characteristics"), // Sommelier's expected ratings
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniquePosition: unique().on(table.packageId, table.position),
  wineTypeIdx: index("idx_package_wines_type").on(table.wineType),
  vintageIdx: index("idx_package_wines_vintage").on(table.vintage)
}));

// Wine response analytics for tracking user accuracy
export const wineResponseAnalytics = pgTable("wine_response_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageWineId: uuid("package_wine_id").notNull().references(() => packageWines.id, { onDelete: "cascade" }),
  characteristicName: varchar("characteristic_name", { length: 100 }).notNull(),
  expectedValue: text("expected_value"), // Sommelier's expected answer
  averageUserValue: text("average_user_value"), // Average user response
  accuracyScore: integer("accuracy_score"), // 0-100 percentage
  responseCount: integer("response_count").default(0),
  lastUpdated: timestamp("last_updated").defaultNow()
}, (table) => ({
  wineCharacteristicIdx: index("idx_wine_analytics_wine_char").on(table.packageWineId, table.characteristicName)
}));

// Define all allowed slide types
const slideTypes = ['question', 'media', 'interlude', 'video_message', 'audio_message', 'transition'] as const;

// Slides table - ALL content lives here, now linked to package wines
export const slides = pgTable("slides", {
  id: uuid("id").primaryKey().defaultRandom(),
  packageWineId: uuid("package_wine_id").references(() => packageWines.id, { onDelete: "cascade" }), // Now nullable
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "cascade" }), // New field for package-level slides
  position: integer("position").notNull(),
  globalPosition: integer("global_position").notNull().default(0),
  type: varchar("type", { length: 50 }).$type<typeof slideTypes[number]>().notNull(),
  section_type: varchar("section_type", { length: 20 }),
  payloadJson: jsonb("payload_json").notNull(),
  genericQuestions: jsonb("generic_questions"), // New generic questions format
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  packageWinePositionIdx: index("idx_slides_package_wine_position").on(table.packageWineId, table.position),
  globalPositionIdx: index("idx_slides_global_position").on(table.packageWineId, table.globalPosition),
  packageWineIdx: index("idx_slides_package_wine_id").on(table.packageWineId),
  packageIdIdx: index("idx_slides_package_id").on(table.packageId)
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

// Session Wine Selections - allows hosts to choose specific wines for their session
export const sessionWineSelections = pgTable("session_wine_selections", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  packageWineId: uuid("package_wine_id").notNull().references(() => packageWines.id, { onDelete: "cascade" }),
  position: integer("position").notNull(), // Custom order set by host
  isIncluded: boolean("is_included").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  sessionIdIdx: index("idx_session_wines_session_id").on(table.sessionId),
  sessionPositionIdx: index("idx_session_wines_session_position").on(table.sessionId, table.position),
  uniqueSessionWine: index("idx_unique_session_wine").on(table.sessionId, table.packageWineId)
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

// Media table for secure file references
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicId: varchar("public_id", { length: 12 }).notNull().unique(), // Public-facing ID
  sommelierId: uuid("sommelier_id"), // Owner
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'slide', 'wine', 'package'
  entityId: uuid("entity_id"), // Reference to the entity
  mediaType: varchar("media_type", { length: 20 }).notNull(), // 'video', 'audio', 'image'
  fileName: text("file_name").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  storageUrl: text("storage_url").notNull(), // Internal Supabase URL (never exposed)
  thumbnailUrl: text("thumbnail_url"), // For video/image thumbnails
  duration: integer("duration"), // For audio/video in seconds
  metadata: jsonb("metadata"), // Additional metadata
  isPublic: boolean("is_public").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at")
}, (table) => ({
  publicIdIdx: index("idx_media_public_id").on(table.publicId),
  entityIdx: index("idx_media_entity").on(table.entityType, table.entityId),
  sommelierIdx: index("idx_media_sommelier").on(table.sommelierId)
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
  video_url: z.string().url({ message: "Invalid video URL" }).optional(), // Legacy support
  video_publicId: z.string().optional(), // New secure reference
  video_fileName: z.string().optional(),
  video_fileSize: z.number().optional(),
  poster_url: z.string().url({ message: "Invalid poster URL" }).optional(),
  autoplay: z.boolean().default(false).optional(),
  show_controls: z.boolean().default(true).optional()
});
export type VideoMessagePayload = z.infer<typeof videoMessagePayloadSchema>;

export const audioMessagePayloadSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  audio_url: z.string().url({ message: "Invalid audio URL" }).optional(), // Legacy support
  audio_publicId: z.string().optional(), // New secure reference
  audio_fileName: z.string().optional(),
  audio_fileSize: z.number().optional(),
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

export const transitionPayloadSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  backgroundImage: z.string().url().optional(),
  duration: z.number().default(2000), // Duration in ms
  showContinueButton: z.boolean().default(false),
  animation_type: z.enum(['wine_glass_fill', 'fade', 'slide']).default('wine_glass_fill')
});
export type TransitionPayload = z.infer<typeof transitionPayloadSchema>;

// Insert schemas
export const insertPackageSchema = createInsertSchema(packages, {
  description: z.string().nullable().optional(),
  sommelierId: z.string().nullable().optional()
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
  payloadJson: z.any(), // Accept any JSON payload, validation happens in application logic
  genericQuestions: z.object({
    format: z.enum(['multiple_choice', 'scale', 'text', 'boolean', 'ranking', 'matrix', 'video_message', 'audio_message']),
    config: z.object({
      title: z.string(),
      description: z.string().optional()
    }).passthrough(), // Allow additional format-specific fields
    metadata: z.object({
      tags: z.array(z.string()).optional(),
      category: z.enum(['appearance', 'aroma', 'taste', 'structure', 'overall', 'general']).optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
      estimatedTime: z.number().optional(),
      pointValue: z.number().optional(),
      expertNote: z.string().optional(),
      glossaryTerms: z.array(z.string()).optional(),
      relatedCharacteristics: z.array(z.string()).optional()
    }).optional(),
    validation: z.object({
      required: z.boolean().optional(),
      customValidation: z.object({
        rule: z.string(),
        message: z.string()
      }).optional(),
      dependencies: z.array(z.object({
        questionId: z.string(),
        condition: z.string()
      })).optional()
    }).optional()
  }).optional()
}).omit({
  id: true,
  createdAt: true
}).refine((data) => {
  // Ensure slides have either packageWineId OR packageId (but not both and not neither)
  const hasWineId = data.packageWineId !== null && data.packageWineId !== undefined;
  const hasPackageId = data.packageId !== null && data.packageId !== undefined;
  return (hasWineId && !hasPackageId) || (!hasWineId && hasPackageId);
}, {
  message: "Slide must belong to either a wine (packageWineId) or directly to a package (packageId), but not both"
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

export const insertSessionWineSelectionSchema = createInsertSchema(sessionWineSelections, {
  sessionId: z.string(),
  packageWineId: z.string(),
  position: z.number(),
  isIncluded: z.boolean().default(true)
}).omit({
  id: true,
  createdAt: true
});

export const insertMediaSchema = createInsertSchema(media, {
  publicId: z.string().min(8).max(12),
  sommelierId: z.string().nullable().optional(),
  entityType: z.enum(['slide', 'wine', 'package']),
  entityId: z.string().nullable().optional(),
  mediaType: z.enum(['video', 'audio', 'image']),
  fileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number().min(0),
  storageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable().optional(),
  duration: z.number().min(0).nullable().optional(),
  metadata: z.any().nullable().optional(),
  isPublic: z.boolean().default(false).optional()
}).omit({
  id: true,
  uploadedAt: true,
  lastAccessedAt: true
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
export type SessionWineSelection = typeof sessionWineSelections.$inferSelect;
export type InsertSessionWineSelection = z.infer<typeof insertSessionWineSelectionSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type GlossaryTerm = typeof glossaryTerms.$inferSelect;
export type InsertGlossaryTerm = z.infer<typeof insertGlossaryTermSchema>;

// Generic Questions Types
export type QuestionFormat = 'multiple_choice' | 'scale' | 'text' | 'boolean' | 'ranking' | 'matrix' | 'video_message' | 'audio_message';

export interface GenericQuestion {
  format: QuestionFormat;
  config: QuestionConfig;
  metadata?: QuestionMetadata;
  validation?: ValidationRules;
}

export interface QuestionConfig {
  title: string;
  description?: string;
  [key: string]: any; // Format-specific fields
}

export interface MultipleChoiceConfig extends QuestionConfig {
  options: Array<{
    id: string;
    text: string;
    value: string;
    description?: string;
    imageUrl?: string;
  }>;
  allowMultiple: boolean;
  allowOther?: boolean;
  otherLabel?: string;
  randomizeOptions?: boolean;
  minSelections?: number;
  maxSelections?: number;
}

export interface ScaleConfig extends QuestionConfig {
  scaleMin: number;
  scaleMax: number;
  scaleLabels: [string, string]; // [min label, max label]
  step?: number;
  showNumbers?: boolean;
  showLabels?: boolean;
  defaultValue?: number;
  visualStyle?: 'slider' | 'buttons' | 'stars';
}

export interface TextConfig extends QuestionConfig {
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number; // for textarea
  inputType?: 'text' | 'textarea' | 'email' | 'number';
  pattern?: string; // regex validation
}

export interface BooleanConfig extends QuestionConfig {
  trueLabel?: string;  // default: "Yes"
  falseLabel?: string; // default: "No"
  defaultValue?: boolean;
  visualStyle?: 'buttons' | 'toggle' | 'checkbox';
}

export interface VideoMessageConfig extends QuestionConfig {
  video_url: string;
  duration?: number;
  thumbnail_url?: string;
  autoplay?: boolean;
  controls?: boolean;
}

export interface AudioMessageConfig extends QuestionConfig {
  audio_url: string;
  duration?: number;
  autoplay?: boolean;
  waveform_data?: string;
}

export interface QuestionMetadata {
  tags?: string[];
  category?: 'appearance' | 'aroma' | 'taste' | 'structure' | 'overall' | 'general';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number; // seconds
  pointValue?: number;
  expertNote?: string;
  glossaryTerms?: string[]; // auto-highlighted terms
  relatedCharacteristics?: string[]; // wine characteristic IDs
}

export interface ValidationRules {
  required?: boolean;
  customValidation?: {
    rule: string; // JS expression
    message: string;
  };
  dependencies?: Array<{
    questionId: string;
    condition: string; // JS expression
  }>;
}
