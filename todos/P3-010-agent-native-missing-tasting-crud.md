# P3-010: Agent-Native Gaps - Missing Tasting CRUD Operations

## Priority: MEDIUM (P3)
## Status: Open
## Category: Agent Accessibility

## Summary
The API is only 68% agent-accessible. Key CRUD operations and search capabilities are missing, limiting what AI agents can do on behalf of users.

## Affected Files
- `server/routes/tastings.ts`
- `server/routes/journeys.ts`

## Missing Capabilities

### 1. No PUT/PATCH for Tasting Updates
```typescript
// Missing endpoint
app.patch('/api/solo/tastings/:id', requireAuth, async (req, res) => {
  // Allow updating wine details, notes, ratings after creation
});
```

### 2. No Search/Filter on Tastings
```typescript
// Current: GET /api/solo/tastings returns all
// Needed: GET /api/solo/tastings?grape=Pinot+Noir&region=Burgundy&minRating=4
```

### 3. Journey Progress Uses Email in URL
```typescript
// Current (not agent-friendly):
GET /api/journeys/:email/progress

// Should be (uses session):
GET /api/me/journey-progress
```

### 4. No Bulk Operations
```typescript
// Missing: Delete multiple tastings
DELETE /api/solo/tastings?ids=1,2,3

// Missing: Bulk update
PATCH /api/solo/tastings/bulk
```

## Fix Required

### Add Missing Endpoints
```typescript
// PATCH - Update tasting
app.patch('/api/solo/tastings/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  const updates = req.body;

  // Validate ownership
  const tasting = await db.query.tastings.findFirst({
    where: and(eq(tastings.id, parseInt(id)), eq(tastings.userId, userId))
  });

  if (!tasting) return res.status(404).json({ error: 'Not found' });

  const [updated] = await db.update(tastings)
    .set(updates)
    .where(eq(tastings.id, parseInt(id)))
    .returning();

  return res.json(updated);
});

// GET with filters
app.get('/api/solo/tastings', requireAuth, async (req, res) => {
  const { grape, region, minRating, wineType, limit = 50, offset = 0 } = req.query;

  let conditions = [eq(tastings.userId, req.session.userId)];

  if (grape) conditions.push(ilike(tastings.grapeVariety, `%${grape}%`));
  if (region) conditions.push(ilike(tastings.wineRegion, `%${region}%`));
  // ... etc

  const results = await db.query.tastings.findMany({
    where: and(...conditions),
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return res.json({ tastings: results, total: results.length });
});
```

## Agent-Native Score
- Current: 68% (15/22 capabilities)
- Target: 90%+ (20/22 capabilities)

## Found By
Agent-Native Reviewer Agent
