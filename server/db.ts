import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Ensure environment variables are loaded
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:Wineman25@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create the database connection
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });