/**
 * Add shopping guide columns to chapters table
 */
import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false } });

  console.log("Adding shopping guide columns to chapters table...");

  try {
    // Add the new columns (IF NOT EXISTS for safety)
    await sql`
      ALTER TABLE chapters
      ADD COLUMN IF NOT EXISTS shopping_tips TEXT,
      ADD COLUMN IF NOT EXISTS price_range JSONB,
      ADD COLUMN IF NOT EXISTS alternatives JSONB,
      ADD COLUMN IF NOT EXISTS ask_for TEXT
    `;

    console.log("✅ Successfully added shopping guide columns to chapters table");

    // Verify the columns exist
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'chapters'
      AND column_name IN ('shopping_tips', 'price_range', 'alternatives', 'ask_for')
    `;

    console.log("Verified columns:", result.map(r => r.column_name).join(", "));
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
