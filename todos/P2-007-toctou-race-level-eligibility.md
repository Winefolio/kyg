# P2-007: TOCTOU Race Condition in Level-Up Eligibility Check

## Priority: HIGH (P2)
## Status: Open
## Category: Data Integrity

## Summary
The level-up eligibility check reads `levelUpPromptEligible`, then later the response includes this value. Between read and response, another request could change the state (Time-Of-Check to Time-Of-Use race).

## Affected Files
- `server/routes/tastings.ts` (lines 270-400)

## Current Pattern
```typescript
// Time of CHECK
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
});

// ... other operations happen ...

// Time of USE (in response) - value may be stale
return res.json({
  ...newTasting,
  levelUpEligible: user.levelUpPromptEligible  // Stale!
});
```

## Race Scenario
1. Request A: Reads user (tastingsCompleted: 9, eligible: false)
2. Request B: Completes tasting #10, sets eligible: true
3. Request A: Returns eligible: false (stale)
4. User doesn't see level-up prompt despite being eligible

## Fix Required
Return the updated state from the atomic update:

```typescript
// Single atomic operation that returns new state
const [updatedUser] = await db.update(users)
  .set({
    tastingsCompleted: sql`${users.tastingsCompleted} + 1`,
    levelUpPromptEligible: sql`CASE WHEN ... END`
  })
  .where(eq(users.id, userId))
  .returning({
    tastingsCompleted: users.tastingsCompleted,
    levelUpPromptEligible: users.levelUpPromptEligible
  });

// Use the RETURNED value, not a previously read value
return res.json({
  ...newTasting,
  levelUpEligible: updatedUser.levelUpPromptEligible
});
```

## Risk if Not Fixed
- Users miss level-up prompts
- Inconsistent UI state
- Difficult to debug intermittent issues

## Found By
Data Integrity Guardian Agent
