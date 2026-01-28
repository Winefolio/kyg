# P1-001: Missing Database Migrations for New Schema Fields

## Priority: CRITICAL (P1)
## Status: Open
## Category: Data Integrity

## Summary
The implementation adds new columns to `users` and `tastings` tables but no migrations exist to add these columns to the database. This will cause **runtime failures** in production.

## Affected Files
- `shared/schema.ts` (lines defining new columns)
- `server/routes/tastings.ts` (code using new columns)

## Missing Migrations

### Users Table
```sql
ALTER TABLE users ADD COLUMN tasting_level VARCHAR(20) DEFAULT 'intro';
ALTER TABLE users ADD COLUMN tastings_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level_up_prompt_eligible BOOLEAN DEFAULT false;
```

### Tastings Table
```sql
ALTER TABLE tastings ADD COLUMN recommendations JSONB;
```

### Chapters Table
```sql
ALTER TABLE chapters ADD COLUMN wine_options JSONB;
```

## Fix Required
1. Create migration file: `drizzle/migrations/XXXX_add_tasting_level_system.sql`
2. Run `npm run db:push` to apply schema changes
3. Verify columns exist in production before deploying code

## Risk if Not Fixed
- Application will crash when accessing `user.tastingLevel`
- All level-up functionality will fail
- Recommendations feature will not work

## Found By
Data Integrity Guardian Agent
