// Sprint 2 Migration: Add wine characteristics cache and column
import 'dotenv/config';
import postgres from 'postgres';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }

  const sql = postgres(connectionString);

  console.log('Running Sprint 2 migrations...');

  // 1. Create wine_characteristics_cache table
  console.log('Creating wine_characteristics_cache table...');
  await sql`
    CREATE TABLE IF NOT EXISTS wine_characteristics_cache (
      id SERIAL PRIMARY KEY,
      wine_signature VARCHAR(500) NOT NULL UNIQUE,
      characteristics JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;

  // 2. Create index
  console.log('Creating index...');
  await sql`
    CREATE INDEX IF NOT EXISTS idx_wine_cache_signature
    ON wine_characteristics_cache(wine_signature)
  `;

  // 3. Add wine_characteristics column to tastings table
  console.log('Adding wine_characteristics column to tastings table...');
  await sql`
    ALTER TABLE tastings
    ADD COLUMN IF NOT EXISTS wine_characteristics JSONB
  `;

  console.log('✅ Sprint 2 migrations complete!');

  await sql.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
