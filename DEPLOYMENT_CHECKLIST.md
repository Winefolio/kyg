# Deployment Checklist for Know Your Grape

## Issue: Database Migrations Not Running on Deployment

Based on the analysis of the codebase and deployment configuration, here's what we found:

### Current Deployment Process (from .replit)
```yaml
[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]
```

### The Problem
1. The build command only runs `vite build && esbuild` to compile the frontend and backend
2. The start command only runs the production server
3. **Database migrations are NOT automatically run during deployment**

### Required Manual Steps

#### Before Each Deployment:
1. **Run database migrations manually**:
   ```bash
   npm run db:push
   ```
   This command runs `drizzle-kit push` which applies schema changes to the database.

2. **Verify migrations were applied**:
   - Check that the tables exist with correct schema
   - Verify constraints and indexes are properly created

#### Migration Files to Apply:
- `0000_careless_korvac.sql` - Initial schema
- `0001_worried_kate_bishop.sql` - Updates
- `0002_add_generic_questions.sql` - Generic question support
- `0003_add_global_positions.sql` - Global positioning
- `0004_package_level_slides.sql` - Package-level slides
- `0005_fix_slide_constraints_supabase.sql` - Latest constraint fixes

### Recommended Fix

Update the deployment configuration in `.replit` to include migrations:

```yaml
[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "npm run build && npm run db:push"]
run = ["npm", "run", "start"]
```

Or create a deployment script:
```bash
#!/bin/bash
# deploy.sh
echo "Building application..."
npm run build

echo "Running database migrations..."
npm run db:push

echo "Starting production server..."
npm run start
```

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string (required)
- `SUPABASE_URL` - For media storage (optional)
- `SUPABASE_SERVICE_ROLE` - For media storage (optional)

### Verification Steps
1. After deployment, check that:
   - All tables exist in the database
   - Constraints are properly applied
   - The application can create and retrieve data
   - No 500 errors when accessing the app

### Notes
- The `initializeWineTastingData()` function in `storage.ts` runs automatically when the server starts if no data exists
- This creates initial packages, wines, and slides
- If migrations aren't run first, this initialization will fail with constraint errors