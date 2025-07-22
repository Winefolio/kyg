#!/bin/bash

echo "🏠 Switching back to local database..."

# Restore original DATABASE_URL
export DATABASE_URL="postgresql://localhost:5432/winery_dev"

# Clear Supabase environment variables
unset SUPABASE_URL
unset SUPABASE_SERVICE_ROLE_KEY

echo "✅ Switched back to local database"
echo "🚀 Start your server with: PORT=3001 npm run dev" 