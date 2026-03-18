-- Add updated_at column to tastings table for fingerprint tracking
ALTER TABLE tastings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Trigger to auto-update updated_at on tastings edits
CREATE OR REPLACE FUNCTION update_tastings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tastings_updated_at_trigger ON tastings;
CREATE TRIGGER tastings_updated_at_trigger
  BEFORE UPDATE ON tastings
  FOR EACH ROW EXECUTE FUNCTION update_tastings_updated_at();

-- User taste profiles table (one row per user, upsert pattern)
CREATE TABLE IF NOT EXISTS user_taste_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL,
  fingerprint TEXT NOT NULL,
  synthesized_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
