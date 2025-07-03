# 🚨 Critical Production Issues Investigation: Empty Deep Dive Slides & Media Upload Failures

## Context & Background
You are investigating two critical production issues in a wine tasting application that uses React (frontend), Express/Node.js (backend), PostgreSQL (database), and Supabase Storage (media files). The issues ONLY occur in deployed environments, not locally.

### Issue 1: Empty Deep Dive Slides
- QA tester Pablo reports that when creating new wines, sometimes the "deep dive" slides come back empty
- This is intermittent and deployment-specific
- Works perfectly on local development environments

### Issue 2: Media Upload Failures
- Audio and video uploads are failing with error: `500: {"message":"relation \"media\" does not exist","error":"relation \"media\" does not exist"}`
- This suggests the media table is missing in production
- Previously working feature that broke after recent deployments

## Your Mission
Conduct a comprehensive investigation using ultra-thinking, specialized sub-agents, and systematic analysis to identify root causes and implement fixes.

## 🧠 Investigation Strategy

### Phase 1: Environment & Database Analysis
**[ULTRA-THINK HERE - 30 seconds minimum]** Before taking any action, deeply analyze:
1. What could cause a database table to exist locally but not in production?
2. How might deployment processes affect database migrations?
3. What timing issues could cause slides to be empty intermittently?
4. How do environment differences impact media uploads and slide creation?

#### Sub-Agent 1: Database Migration Detective
**Task**: Investigate the database migration system and media table
```bash
# Commands to execute:
1. Search for migration files: `find . -name "*migration*" -o -name "*migrate*" -o -name "*.sql"`
2. Look for media table creation: `grep -r "CREATE TABLE.*media" --include="*.sql" --include="*.ts" --include="*.js"`
3. Check for schema.ts media table definition
4. Investigate if there's a migration system (Drizzle, Prisma, raw SQL)
5. Look for deployment scripts that run migrations
```

**Critical Questions**:
- Is the media table created via migration or initialization code?
- Are migrations automatically run on deployment?
- Is there a race condition between app startup and migration completion?

#### Sub-Agent 2: Deployment Environment Analyst
**Task**: Compare local vs production environments
```bash
# Investigate:
1. Check for .env files and environment variable usage
2. Look for deployment configuration files (render.yaml, fly.toml, etc.)
3. Find database initialization code (likely in server startup)
4. Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE are properly set
5. Look for conditional logic based on NODE_ENV or similar
```

### Phase 2: Media Upload System Deep Dive
**[ULTRA-THINK HERE]** Trace the complete media upload flow:
1. Frontend: Where do uploads originate? (SlideConfigPanel, QuestionConfigForm)
2. API: How does /api/upload/media handle requests?
3. Storage: How does supabase-storage.ts interact with Supabase?
4. Database: When/how are media records created?

#### Sub-Agent 3: Media Upload Flow Tracer
**Task**: Map the complete upload process
1. Find all media upload components in client/src
2. Trace API endpoint: `/api/upload/media` in routes.ts
3. Analyze `server/supabase-storage.ts` for error handling
4. Check how media records are created in storage.ts
5. Look for transaction handling between storage upload and DB insert

**Key Files to Examine**:
- `client/src/components/ui/media-upload.tsx`
- `server/routes.ts` (upload endpoints)
- `server/supabase-storage.ts`
- `server/storage.ts` (media table operations)
- `shared/schema.ts` (media table definition)

### Phase 3: Slide Creation Investigation
**[ULTRA-THINK HERE]** Analyze why deep dive slides might be empty:
1. What makes a slide "deep dive" vs other types?
2. How are slides created when a wine is added?
3. What data dependencies exist for slide creation?
4. Could there be async timing issues?

#### Sub-Agent 4: Slide Creation Analyzer
**Task**: Understand slide generation process
```javascript
// Investigate these patterns:
1. Search for "deep dive" or "deep_dive" in codebase
2. Find createSlide or similar functions in storage.ts
3. Look for slide templates (questionTemplates.ts)
4. Check how wines trigger slide creation
5. Analyze any batch operations or Promise.all usage
```

### Phase 4: Supabase MCP Database Inspection
**[CRITICAL]** Use Supabase MCP tools to inspect production database directly:

```sql
-- Check if media table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'media';

-- Check all tables to understand migration state
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- If media table exists, check its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'media';

-- Check for recent errors in slides creation
SELECT COUNT(*), section_type, type
FROM slides
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND payload_json = '{}'
GROUP BY section_type, type;
```

### Phase 5: Reproduction & Testing

#### Sub-Agent 5: Issue Reproducer
**Task**: Create scripts to reproduce both issues

**Script 1: test-media-upload.js**
- Test media upload with proper error logging
- Check environment variables
- Verify Supabase connection
- Test database media table access

**Script 2: test-wine-creation.js**
- Create a new wine programmatically
- Log all slide creation steps
- Check for empty payloads
- Measure timing between operations

### Phase 6: Root Cause Analysis
**[ULTRA-THINK HERE - MOST CRITICAL]** Synthesize all findings:
1. **Media Upload Failure Pattern**:
   - Missing media table → Migration not run
   - Environment variable issues → Supabase not configured
   - Permission problems → Storage bucket access

2. **Empty Slide Pattern**:
   - Race condition → Slides created before data ready
   - Missing await → Async operations not properly chained
   - Template issues → Deep dive template missing data

### Phase 7: Fix Implementation

#### For Media Upload Issue:
1. **Add Migration Check on Startup**:
   ```typescript
   // In server startup
   async function ensureMediaTableExists() {
     // Check and create media table if missing
   }
   ```

2. **Add Graceful Degradation**:
   ```typescript
   // In media upload handler
   if (!mediaTableExists) {
     console.error('[MEDIA_ERROR] Media table missing, creating...');
     await createMediaTable();
   }
   ```

#### For Empty Slides Issue:
1. **Add Comprehensive Logging**:
   ```typescript
   // In slide creation
   console.log('[SLIDE_CREATE] Creating slides for wine:', wineId);
   console.log('[SLIDE_CREATE] Template data:', templateData);
   ```

2. **Fix Async Chain**:
   ```typescript
   // Ensure proper await usage
   await Promise.all(slides.map(async (slide) => {
     await createSlide(slide);
   }));
   ```

## 🎯 Success Criteria
1. Media uploads work consistently in production
2. No empty deep dive slides when creating wines
3. Clear logging to prevent future issues
4. Deployment process ensures all migrations run

## 🔧 Diagnostic Commands to Run First
```bash
# 1. Check migration status
node -e "require('./server/db').checkMigrationStatus()"

# 2. Test Supabase connection
curl -X POST $SUPABASE_URL/storage/v1/list \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE"

# 3. Verify environment variables
node -e "console.log({
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE,
  nodeEnv: process.env.NODE_ENV
})"
```

## 🚀 Action Plan
1. Start with Phase 1 - understand the deployment environment
2. Use Supabase MCP to inspect production database state
3. Create reproduction scripts to isolate issues
4. Implement fixes with comprehensive error handling
5. Add monitoring to prevent recurrence

Remember: These issues are deployment-specific, so focus on:
- Environment differences
- Migration/initialization timing
- Production-only configurations
- Race conditions that only manifest under load

**CRITICAL**: Use the TodoWrite tool to track all investigation phases and findings!