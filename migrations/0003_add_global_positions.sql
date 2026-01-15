-- Add global_position column to slides table for proper ordering across wines
ALTER TABLE slides ADD COLUMN global_position INTEGER;

-- Update existing slides with calculated global positions
-- This assigns positions based on wine position * 1000 + local position
UPDATE slides s
SET global_position = (
  SELECT (pw.position * 1000) + s.position
  FROM package_wines pw
  WHERE pw.id = s.package_wine_id
);

-- Make global_position NOT NULL after populating
ALTER TABLE slides ALTER COLUMN global_position SET NOT NULL;

-- Add index on global_position for performance
CREATE INDEX idx_slides_global_position ON slides(package_wine_id, global_position);

-- Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_slides_package_wine_id ON slides(package_wine_id);
CREATE INDEX IF NOT EXISTS idx_responses_participant_slide ON responses(participant_id, slide_id);
CREATE INDEX IF NOT EXISTS idx_session_wine_selections_session_wine ON session_wine_selections(session_id, package_wine_id);