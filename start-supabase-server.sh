#!/bin/bash

echo "🍷 Starting server with Supabase database..."

# Set Supabase environment variables
export DATABASE_URL="postgresql://postgres.byearryckdwmajygqdpx:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4@db.byearryckdwmajygqdpx.supabase.co:5432/postgres"
export SUPABASE_URL="https://byearryckdwmajygqdpx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4"

echo "✅ Environment variables set"
echo "📊 DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "🚀 Starting server on port 3001..."

# Start the server
PORT=3001 npm run dev 