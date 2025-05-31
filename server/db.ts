import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Force connection to Supabase database and clear conflicting PG environment variables
delete process.env.PGHOST;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;
delete process.env.PGPORT;

const connectionString = "postgresql://postgres.byearryckdwmajygqdpx:wineboyman1@aws-0-us-west-1.pooler.supabase.com:6543/postgres";

if (!connectionString) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set. The application cannot connect to the database. Please ensure DATABASE_URL is configured in your Replit Secrets or environment.");
  process.exit(1); // Exit the process with an error code
}

console.log("Connecting to PostgreSQL database...");
console.log("Connection string (masked):", connectionString?.replace(/:([^:@]+)@/, ':***@'));

// Create the database connection with explicit SSL requirement
const sql = postgres(connectionString as string, {
  ssl: 'require'
});
export const db = drizzle(sql, { schema });