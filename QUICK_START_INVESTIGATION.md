# 🚀 Quick Start: Wine & Media Issues Investigation

## Immediate Actions (First 5 Minutes)

### 1. Create Investigation Todo List
```javascript
TodoWrite({
  todos: [
    { id: "env-check", content: "Check environment variables and deployment config", status: "pending", priority: "high" },
    { id: "db-media-table", content: "Verify media table existence in production DB", status: "pending", priority: "high" },
    { id: "migration-system", content: "Investigate database migration system", status: "pending", priority: "high" },
    { id: "slide-creation", content: "Trace deep dive slide creation process", status: "pending", priority: "high" },
    { id: "media-upload-flow", content: "Map complete media upload flow", status: "pending", priority: "high" },
    { id: "reproduce-issues", content: "Create reproduction scripts", status: "pending", priority: "medium" },
    { id: "implement-fixes", content: "Implement and test fixes", status: "pending", priority: "medium" }
  ]
})
```

### 2. Quick Database Check
```bash
# Run this immediately to check production database state
mcp__supabase__execute_sql query="
SELECT 
  'media' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media') as exists
UNION ALL
SELECT 
  'slides' as table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slides') as exists
UNION ALL
SELECT 
  'empty_slides_last_24h' as metric,
  (SELECT COUNT(*) FROM slides WHERE payload_json = '{}' AND created_at > NOW() - INTERVAL '24 hours')::boolean as exists;"
```

### 3. Environment Quick Check
```bash
# Create and run this immediately
cat > check-env.js << 'EOF'
console.log('🔍 Quick Environment Check\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE:', process.env.SUPABASE_SERVICE_ROLE ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('\nDeployment platform detection:');
console.log('Is Replit:', !!process.env.REPL_ID);
console.log('Is Render:', !!process.env.RENDER);
console.log('Is Vercel:', !!process.env.VERCEL);
EOF
node check-env.js
```

### 4. Find Critical Files
```bash
# Run these greps to quickly locate key files
echo "🔍 Finding critical files..."
echo "\n📁 Migration files:"
find . -name "*migrat*" -o -name "*.sql" | head -10

echo "\n📁 Media-related files:"
grep -r "media" --include="*.ts" --include="*.tsx" -l | grep -E "(upload|media)" | head -10

echo "\n📁 Slide creation files:"
grep -r "createSlide\|deep.dive\|deep_dive" --include="*.ts" -l | head -10
```

## Priority Investigation Path

### 🔴 CRITICAL PATH 1: Media Table Missing (if confirmed)
1. Check `shared/schema.ts` for media table definition
2. Look for migration files: `drizzle/*.sql` or `migrations/*.sql`
3. Check `package.json` scripts for migration commands
4. Investigate `server/index.ts` startup sequence
5. **[ULTRA-THINK]** Why would migrations not run on deploy?

### 🟡 CRITICAL PATH 2: Empty Deep Dive Slides
1. Find slide creation in `server/storage.ts`
2. Look for `questionTemplates.ts` or similar
3. Search for "deep dive" section type
4. Check for `await` usage in slide creation
5. **[ULTRA-THINK]** What makes deep dive different from other slides?

## Red Alert Patterns 🚨

If you see any of these, investigate immediately:

```javascript
// Missing await - DANGER!
createSlide(slideData);  // ❌
await createSlide(slideData);  // ✅

// Swallowed errors - DANGER!
try {
  await uploadMedia();
} catch (error) {
  // Silent fail ❌
}

// Environment-specific code - DANGER!
if (process.env.NODE_ENV === 'development') {
  await runMigrations();  // ❌ Won't run in production!
}
```

## Quick Wins to Try

### 1. Force Media Table Creation (Temporary Fix)
```javascript
// Add to server startup
async function ensureMediaTable() {
  const tableExists = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'media'
    )
  `);
  
  if (!tableExists.rows[0].exists) {
    console.error('[CRITICAL] Media table missing, creating...');
    // Add table creation logic
  }
}
```

### 2. Add Logging to Slide Creation
```javascript
// In createSlide function
console.log('[SLIDE_CREATE] Input:', {
  wineId: slide.packageWineId,
  type: slide.type,
  section: slide.section_type,
  hasPayload: !!slide.payloadJson,
  payloadKeys: Object.keys(slide.payloadJson || {})
});
```

## When to Call for Backup

If you encounter:
1. Database permissions issues → Check Supabase role settings
2. Deployment platform specifics → Check platform docs (Render, Vercel, etc.)
3. Complex migration issues → May need database admin access
4. Supabase Storage 403/404 → Check bucket policies

## Remember

- These issues are **deployment-specific** - focus on environment differences
- The media error is clear: table doesn't exist
- The slide issue is intermittent: likely timing/race condition
- Both issues may be related to deployment initialization order

Start with the quick checks above, then follow the investigation paths in the main prompt!