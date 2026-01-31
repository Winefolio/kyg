# P2-006: Missing Transaction Boundary on Tasting Creation

## Priority: HIGH (P2)
## Status: Open
## Category: Data Integrity

## Summary
Tasting creation involves multiple database operations (insert tasting, update user stats, queue background jobs) without a transaction boundary. Partial failures leave data in inconsistent state.

## Affected Files
- `server/routes/tastings.ts` (lines 270-350)

## Current Flow (No Transaction)
```typescript
// Step 1: Insert tasting
const [newTasting] = await db.insert(tastings).values({...}).returning();

// Step 2: Update user stats - if this fails, tasting exists but count is wrong
await db.update(users).set({
  tastingsCompleted: sql`${users.tastingsCompleted} + 1`,
  ...
}).where(eq(users.id, userId));

// Step 3: Queue background jobs
attachCharacteristicsToTasting(newTasting.id);
```

## Failure Scenarios
1. **Tasting inserted, user update fails** - Tasting count is off by 1
2. **User update succeeds, response fails** - Client retries, creates duplicate
3. **Partial completion** - Inconsistent levelUpPromptEligible state

## Fix Required
Wrap related operations in a transaction:

```typescript
import { db } from './db';

const result = await db.transaction(async (tx) => {
  // Step 1: Insert tasting
  const [newTasting] = await tx.insert(tastings).values({...}).returning();

  // Step 2: Update user stats (atomic)
  await tx.update(users).set({
    tastingsCompleted: sql`${users.tastingsCompleted} + 1`,
    levelUpPromptEligible: sql`CASE WHEN ... END`
  }).where(eq(users.id, userId));

  return newTasting;
});

// Background jobs AFTER transaction commits
attachCharacteristicsToTasting(result.id);
```

## Risk if Not Fixed
- Inaccurate tasting counts over time
- Users may not see level-up prompts when eligible
- Data reconciliation issues

## Found By
Data Integrity Guardian Agent
