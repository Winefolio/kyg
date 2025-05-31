import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Use the correct Supabase connection URL format
const databaseUrl = "postgresql://postgres.byearryckdwmajygqdpx:Wineman25@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

console.log("Connecting to database...");

// Create the database connection
const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });