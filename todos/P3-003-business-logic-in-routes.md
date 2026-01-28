# P3-003: Business Logic Mixed into Route Files

## Priority: MEDIUM (P3)
## Status: Open
## Category: Architecture

## Summary
Route files contain business logic that should be in service layer, making testing harder and violating separation of concerns.

## Affected Files
- `server/routes/tastings.ts` (level-up calculation logic)
- `server/routes.ts` (various inline calculations)

## Problematic Pattern
```typescript
// In routes/tastings.ts
router.post('/level-up', async (req, res) => {
  const user = await storage.getUser(userId);

  // Business logic mixed in route handler
  const thresholds = { intro: 10, intermediate: 25, advanced: null };
  const currentThreshold = thresholds[user.tastingLevel];
  if (user.tastingsCompleted >= currentThreshold) {
    // ...
  }
});
```

## Fix Required
Extract to service layer:

```typescript
// server/services/userLevel.ts
export class UserLevelService {
  private thresholds: Record<TastingLevel, number | null> = {
    intro: 10,
    intermediate: 25,
    advanced: null
  };

  async checkLevelUpEligibility(userId: number): Promise<boolean> {
    const user = await storage.getUser(userId);
    const threshold = this.thresholds[user.tastingLevel];
    return threshold !== null && user.tastingsCompleted >= threshold;
  }

  async performLevelUp(userId: number): Promise<TastingLevel> {
    // Atomic level-up logic
  }
}
```

Then in route:
```typescript
router.post('/level-up', async (req, res) => {
  const result = await userLevelService.performLevelUp(userId);
  res.json(result);
});
```

## Benefits
- Routes become thin controllers
- Business logic is testable in isolation
- Easier to reuse logic across endpoints

## Found By
Architecture Strategist Agent
