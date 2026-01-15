import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: false,
  max: 1,
  connect_timeout: 30
});

async function createTables() {
  try {
    await sql`
      -- Create journeys table
      CREATE TABLE IF NOT EXISTS journeys (
        id SERIAL PRIMARY KEY,
        liaison_id INTEGER REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        description TEXT,
        difficulty_level VARCHAR(20) NOT NULL DEFAULT 'beginner',
        estimated_duration VARCHAR(50),
        wine_type VARCHAR(50),
        cover_image_url TEXT,
        is_published BOOLEAN NOT NULL DEFAULT false,
        total_chapters INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log("Created journeys table");

    await sql`
      -- Create chapters table
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        wine_requirements JSONB,
        learning_objectives JSONB,
        tasting_prompts JSONB,
        completion_criteria JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(journey_id, chapter_number)
      )
    `;
    console.log("Created chapters table");

    await sql`
      -- Create user_journeys table
      CREATE TABLE IF NOT EXISTS user_journeys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        journey_id INTEGER NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
        current_chapter INTEGER NOT NULL DEFAULT 1,
        completed_chapters JSONB NOT NULL DEFAULT '[]',
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL,
        completed_at TIMESTAMP,
        UNIQUE(user_id, journey_id)
      )
    `;
    console.log("Created user_journeys table");

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_journeys_liaison ON journeys(liaison_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_journeys_published ON journeys(is_published)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_journeys_difficulty ON journeys(difficulty_level)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chapters_journey ON chapters(journey_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_journeys_user ON user_journeys(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_journeys_journey ON user_journeys(journey_id)`;
    console.log("Created indexes");

    console.log("All journey tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    await sql.end();
  }
}

createTables();
