-- Performance optimization indexes for Know Your Grape
-- These indexes will significantly improve query performance

-- Add index on slides.packageWineId (frequently used in JOINs and WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_slides_package_wine_id ON slides(package_wine_id);

-- Add index on responses.slideId (used in analytics queries)
CREATE INDEX IF NOT EXISTS idx_responses_slide_id ON responses(slide_id);

-- Add composite index for response lookups
CREATE INDEX IF NOT EXISTS idx_responses_participant_slide ON responses(participant_id, slide_id);

-- Add composite index for participant lookups by session and host status
CREATE INDEX IF NOT EXISTS idx_participants_session_host ON participants(session_id, is_host);

-- Add index on sessionWineSelections.packageWineId
CREATE INDEX IF NOT EXISTS idx_session_wines_package_wine ON session_wine_selections(package_wine_id);

-- Add index on participants.email for email-based lookups
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);

-- Add composite index for participants by session and email (for returning users)
CREATE INDEX IF NOT EXISTS idx_participants_session_email ON participants(session_id, email);

-- Add index on slides.type for filtering question slides
CREATE INDEX IF NOT EXISTS idx_slides_type ON slides(type);

-- Add index on sessions.status for active session queries
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Add index on media.entity_id for media lookups
CREATE INDEX IF NOT EXISTS idx_media_entity_id ON media(entity_id);

-- Analyze tables to update query planner statistics
ANALYZE participants;
ANALYZE responses;
ANALYZE slides;
ANALYZE sessions;
ANALYZE session_wine_selections;