import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Use the correct Supabase connection string for direct PostgreSQL access
const connectionString = `postgresql://postgres.byearryckdwmajygqdpx:Wineman25@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

console.log("Connecting to Supabase database...");

// Create the database connection
const sql = postgres(connectionString, { ssl: 'require' });
export const db = drizzle(sql, { schema });