# P2-001: Race Condition in Level-Up Logic

## Priority: HIGH (P2)
## Status: Open
## Category: Data Integrity

## Summary
The level-up logic performs non-atomic read-modify-write operations, allowing race conditions when multiple requests arrive simultaneously.

## Affected Files
- `server/routes/tastings.ts` (level-up endpoint)

## Problematic Pattern
```typescript
// Read
const user = await storage.getUser(userId);
// Modify (gap where another request could read stale data)
const newLevel = calculateNextLevel(user.tastingLevel);
// Write
await storage.updateUser(userId, { tastingLevel: newLevel });
```

## Fix Required
Use database transaction with row locking:

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .for('update'); // Row lock

  if (user.levelUpPromptEligible) {
    await tx
      .update(users)
      .set({
        tastingLevel: calculateNextLevel(user.tastingLevel),
        levelUpPromptEligible: false
      })
      .where(eq(users.id, userId));
  }
});
```

## Risk if Not Fixed
- User could level up twice from single eligibility
- Tasting counts could become inconsistent
- Data corruption over time

## Found By
Performance Oracle Agent, Data Integrity Guardian Agent
