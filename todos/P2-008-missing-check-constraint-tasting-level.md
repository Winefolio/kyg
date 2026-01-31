# P2-008: Missing CHECK Constraint on tasting_level Column

## Priority: HIGH (P2)
## Status: Open
## Category: Data Integrity

## Summary
The `tasting_level` column in the users table has no database-level constraint ensuring valid values. Application code expects only 'intro', 'intermediate', or 'advanced', but invalid values could be inserted.

## Affected Files
- `drizzle/0003_add_tasting_level_system.sql`
- `shared/schema.ts`

## Current Schema
```sql
-- Migration (no CHECK constraint)
ALTER TABLE users ADD COLUMN tasting_level VARCHAR(20) DEFAULT 'intro';
```

```typescript
// TypeScript definition
tastingLevel: text('tasting_level', { enum: ['intro', 'intermediate', 'advanced'] }).default('intro')
```

## Problem
TypeScript enum only provides compile-time safety. At runtime, direct SQL or API bugs could insert invalid values:
- Manual database edits
- SQL injection (if found)
- Future migration mistakes

## Fix Required
Add CHECK constraint in migration:

```sql
-- Option A: Add constraint to existing column
ALTER TABLE users
ADD CONSTRAINT users_tasting_level_check
CHECK (tasting_level IN ('intro', 'intermediate', 'advanced'));

-- Option B: Create new migration
-- drizzle/0004_add_tasting_level_constraint.sql
ALTER TABLE users
ADD CONSTRAINT users_tasting_level_check
CHECK (tasting_level IN ('intro', 'intermediate', 'advanced'));
```

Also verify no invalid data exists:
```sql
SELECT id, email, tasting_level
FROM users
WHERE tasting_level NOT IN ('intro', 'intermediate', 'advanced');
```

## Risk if Not Fixed
- Invalid data could cause application errors
- Level-up logic may behave unexpectedly
- Data integrity issues over time

## Found By
Data Integrity Guardian Agent
