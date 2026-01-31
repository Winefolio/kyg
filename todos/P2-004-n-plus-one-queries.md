# P2-004: N+1 Query in getUserActiveJourneys

## Priority: HIGH (P2)
## Status: Open
## Category: Performance

## Summary
`getUserActiveJourneys` performs N+1 queries by fetching journey details in a loop instead of using a JOIN.

## Affected Files
- `server/storage.ts` (getUserActiveJourneys function)

## Problematic Code
```typescript
async getUserActiveJourneys(userId: number) {
  const userJourneys = await db.select().from(userJourneys).where(eq(userJourneys.userId, userId));

  // N+1: One query per journey
  const journeys = await Promise.all(
    userJourneys.map(uj => this.getJourney(uj.journeyId))
  );
  return journeys;
}
```

## Fix Required
Use a single query with JOIN:

```typescript
async getUserActiveJourneys(userId: number) {
  const results = await db
    .select({
      userJourney: userJourneys,
      journey: journeys
    })
    .from(userJourneys)
    .innerJoin(journeys, eq(userJourneys.journeyId, journeys.id))
    .where(eq(userJourneys.userId, userId));

  return results.map(r => ({
    ...r.userJourney,
    journey: r.journey
  }));
}
```

## Impact
- 10 active journeys = 11 queries instead of 1
- Page load time increases linearly with journey count
- Database connection pool exhaustion under load

## Found By
Performance Oracle Agent
