# P3-004: Missing Caching for OpenAI Responses

## Priority: MEDIUM (P3)
## Status: Open
## Category: Performance / Cost

## Summary
OpenAI calls for wine characteristics and recommendations are made repeatedly for the same inputs without caching.

## Affected Files
- `server/wine-intelligence.ts`
- `server/openai-client.ts`

## Current Behavior
- Same wine looked up multiple times = multiple API calls
- Recommendations regenerated on page refresh
- No TTL or invalidation strategy

## Fix Required

### Option 1: In-memory cache (simple)
```typescript
import NodeCache from 'node-cache';

const wineCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

async function getWineCharacteristics(wine: string) {
  const cached = wineCache.get(wine);
  if (cached) return cached;

  const result = await openai.chat.completions.create(...);
  wineCache.set(wine, result);
  return result;
}
```

### Option 2: Database cache (persistent)
Already have `wineCharacteristicsCache` table - use it:
```typescript
async function getWineCharacteristics(wine: string) {
  const cached = await storage.getWineCharacteristics(wine);
  if (cached && !isStale(cached)) return cached;

  const result = await fetchFromOpenAI(wine);
  await storage.cacheWineCharacteristics(wine, result);
  return result;
}
```

## Benefits
- Reduced OpenAI API costs
- Faster response times for repeat queries
- Better user experience

## Found By
Performance Oracle Agent
