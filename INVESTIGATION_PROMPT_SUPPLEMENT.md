# 🛠️ Supplementary Investigation Techniques & Tools

## Essential MCP Commands for Production Database

### 1. Initial Database State Check
```javascript
// Use these Supabase MCP commands in sequence:

// Check if media table exists
mcp__supabase__execute_sql query="SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media');"

// Get complete table list with creation times
mcp__supabase__execute_sql query="
SELECT 
  schemaname,
  tablename,
  pg_stat_user_tables.n_tup_ins as total_inserts,
  pg_stat_user_tables.n_tup_upd as total_updates
FROM pg_tables 
LEFT JOIN pg_stat_user_tables ON pg_tables.tablename = pg_stat_user_tables.relname
WHERE schemaname = 'public'
ORDER BY tablename;"

// Check for migration tracking table
mcp__supabase__execute_sql query="SELECT * FROM information_schema.tables WHERE table_name LIKE '%migration%' OR table_name LIKE '%schema%';"
```

### 2. Investigate Empty Slides
```javascript
// Find wines with empty deep dive slides
mcp__supabase__execute_sql query="
SELECT 
  pw.wine_name,
  s.section_type,
  s.type,
  s.payload_json,
  s.created_at
FROM slides s
JOIN package_wines pw ON s.package_wine_id = pw.id
WHERE s.section_type = 'deep_dive'
  AND (s.payload_json = '{}' OR s.payload_json IS NULL)
ORDER BY s.created_at DESC
LIMIT 20;"

// Check slide creation patterns
mcp__supabase__execute_sql query="
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  section_type,
  COUNT(*) as total_slides,
  COUNT(CASE WHEN payload_json = '{}' THEN 1 END) as empty_slides
FROM slides
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), section_type
HAVING COUNT(CASE WHEN payload_json = '{}' THEN 1 END) > 0
ORDER BY hour DESC;"
```

### 3. Media System Analysis
```javascript
// Check Supabase storage logs for failures
mcp__supabase__get_logs service="storage"

// Check API logs for upload errors
mcp__supabase__get_logs service="api"

// Get storage configuration
mcp__supabase__get_storage_config

// List storage buckets
mcp__supabase__list_storage_buckets
```

## Critical Code Patterns to Search For

### 1. Race Condition Indicators
```bash
# Find Promise.all without proper error handling
grep -r "Promise\.all" --include="*.ts" --include="*.js" | grep -v "catch"

# Find createSlide calls without await
grep -r "createSlide" --include="*.ts" | grep -v "await"

# Find database transactions
grep -r "transaction\|BEGIN\|COMMIT" --include="*.ts"
```

### 2. Environment-Specific Code
```bash
# Find environment conditionals
grep -r "process\.env\.NODE_ENV\|production\|development" --include="*.ts" --include="*.js"

# Find deployment-specific configurations
grep -r "DATABASE_URL\|SUPABASE\|deploy\|build" --include="*.json" --include="*.yaml" --include="*.toml"
```

### 3. Migration Patterns
```bash
# Find migration runners
grep -r "migrate\|migration\|dbPush\|db:push" --include="*.json" --include="*.ts" --include="*.js"

# Check package.json scripts
cat package.json | jq '.scripts | to_entries[] | select(.value | contains("migrate") or contains("db"))'
```

## Specialized Diagnostic Scripts

### 1. Environment Diagnostic
```javascript
// diagnose-environment.js
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE',
  'NODE_ENV'
];

console.log('🔍 Environment Diagnostic\n');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? '✅ Set' : '❌ Missing'}`);
  if (value && varName.includes('URL')) {
    try {
      const url = new URL(value);
      console.log(`  Protocol: ${url.protocol}`);
      console.log(`  Host: ${url.hostname}`);
    } catch (e) {
      console.log('  ⚠️ Invalid URL format');
    }
  }
});
```

### 2. Media Table Diagnostic
```javascript
// diagnose-media-table.js
const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

async function diagnoseMediaTable() {
  console.log('🔍 Media Table Diagnostic\n');
  
  try {
    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT COUNT(*) 
      FROM information_schema.tables 
      WHERE table_name = 'media'
    `);
    
    console.log('Table exists:', tableCheck.rows[0].count > 0);
    
    if (tableCheck.rows[0].count === 0) {
      console.log('\n❌ Media table is missing!');
      console.log('Checking for migration files...');
      
      // Check for migrations
      const fs = require('fs');
      const path = require('path');
      const migrationsDir = path.join(__dirname, 'migrations');
      
      if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir);
        console.log(`Found ${files.length} migration files`);
        
        const mediaCreation = files.find(f => 
          fs.readFileSync(path.join(migrationsDir, f), 'utf8')
            .includes('CREATE TABLE media')
        );
        
        if (mediaCreation) {
          console.log(`✅ Media table creation found in: ${mediaCreation}`);
          console.log('⚠️ Migration may not have been run!');
        }
      }
    }
  } catch (error) {
    console.error('Diagnostic error:', error);
  }
}
```

## Ultra-Thinking Triggers

Place **[ULTRA-THINK]** markers at these critical points:
1. When analyzing why something works locally but not in production
2. Before proposing any fix that involves database schema changes
3. When encountering race conditions or timing issues
4. When multiple systems interact (frontend → API → Supabase → database)
5. Before implementing any workaround vs proper fix decision

## Sub-Agent Task Distribution

### Agent Network Architecture:
```
Main Investigation Agent
├── Database Agent (migrations, schema, queries)
├── Environment Agent (env vars, deployment config)
├── Storage Agent (Supabase storage, media files)
├── Timing Agent (race conditions, async flows)
└── Deployment Agent (build process, initialization order)
```

Each agent should:
1. Have a specific investigation domain
2. Report findings in a structured format
3. Identify dependencies on other agents' findings
4. Suggest specific code changes with line numbers

## Red Flags to Watch For

1. **Missing `await` keywords** in slide creation
2. **Environment variables** not properly loaded
3. **Migration commands** not in deployment scripts
4. **Race conditions** between app start and DB ready
5. **Transaction boundaries** not properly set
6. **Error swallowing** without logging
7. **Conditional logic** based on environment
8. **Missing error recovery** in media uploads

## Success Metrics

Your investigation is complete when you can answer:
1. ✅ Why does media table exist locally but not in production?
2. ✅ What causes deep dive slides to be empty intermittently?
3. ✅ How can we prevent these issues in future deployments?
4. ✅ What monitoring should be added?

Remember: The goal is not just to fix the immediate issues but to understand the root causes and prevent recurrence!