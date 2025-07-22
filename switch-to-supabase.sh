#!/bin/bash

echo "🍷 Switching to Supabase database for testing..."

# Backup current DATABASE_URL
export OLD_DATABASE_URL="$DATABASE_URL"

# Set Supabase connection
export DATABASE_URL="postgresql://postgres.byearryckdwmajygqdpx:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4@db.byearryckdwmajygqdpx.supabase.co:5432/postgres"

# Set Supabase environment variables
export SUPABASE_URL="https://byearryckdwmajygqdpx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4"

echo "✅ Switched to Supabase database"
echo "📊 You can now test with real data using these emails:"
echo "   - blevine379@gmail.com (64 responses)"
echo "   - avadebart@gmail.com (65 responses)"
echo "   - katecerwin@gmail.com (57 responses)"
echo "   - andreayamhures@me.com (63 responses)"
echo "   - samanthakirschner@gmail.com (53 responses)"
echo "   - kzitzmann24@gmail.com (55 responses)"
echo "   - olivianini11@gmail.com (65 responses)"
echo "   - sarahschultz188@gmail.com (59 responses)"
echo "   - kaplanwylie@yahoo.com (65 responses)"
echo ""
echo "🚀 Start your server with: PORT=3001 npm run dev"
echo ""
echo "🔄 To switch back to local database, run: source switch-to-local.sh" 