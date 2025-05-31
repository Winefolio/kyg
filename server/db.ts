import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL ERROR: DATABASE_URL environment variable is not set. The application cannot connect to the database. Please ensure DATABASE_URL is configured in your Replit Secrets or environment.");
  process.exit(1); // Exit the process with an error code
}

console.log("Connecting to PostgreSQL database...");
console.log("Connection string (masked):", connectionString?.replace(/:([^:@]+)@/, ':***@'));

// Create the database connection
const sql = postgres(connectionString as string);
export const db = drizzle(sql, { schema });