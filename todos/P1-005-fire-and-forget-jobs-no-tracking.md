# P1-005: Fire-and-Forget Background Jobs Without Tracking

## Priority: CRITICAL (P1)
## Status: Open
## Category: Reliability

## Summary
Multiple asynchronous operations (wine characteristics, recommendations) are started without any tracking, retry mechanism, or queue system. Failed jobs are silently logged and lost, leading to incomplete data and poor user experience.

## Affected Files
- `server/routes/tastings.ts` (lines 312-340)

## Problematic Code
```typescript
// Fire-and-forget pattern - no tracking, no retries
attachCharacteristicsToTasting(newTasting.id).catch(err => {
  console.error("Background wine intel error:", err);
});

generateNextBottleRecommendations(...).then(async (recommendations) => {
  await db.update(tastings).set({ recommendations })...
}).catch(err => {
  console.error("Background recommendation error:", err);
});
```

## Issues
1. **No retry mechanism** - Transient failures (rate limits, timeouts) are permanent
2. **No job tracking** - Cannot know if job succeeded or failed
3. **No alerting** - Errors go to console only
4. **Race conditions** - Multiple concurrent requests may conflict
5. **No backpressure** - Unbounded concurrent OpenAI requests

## Fix Required

### Option A: Simple Job Queue (Recommended for MVP)
```typescript
// Simple in-memory queue with retries
const backgroundQueue = new SimpleQueue({
  maxConcurrency: 3,
  retries: 2,
  retryDelay: 1000
});

// Usage
backgroundQueue.add(() => attachCharacteristicsToTasting(tastingId));
```

### Option B: Production Job Queue (Bull/BullMQ)
```typescript
import { Queue } from 'bullmq';

const wineIntelQueue = new Queue('wine-intel', {
  connection: redisConnection
});

await wineIntelQueue.add('attach-characteristics', { tastingId });
```

### Minimum Fix
At least add a `pending_jobs` table to track status:
```sql
CREATE TABLE background_jobs (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Risk if Not Fixed
- Users see incomplete tasting data
- Wine intelligence and recommendations randomly missing
- No visibility into failure rates
- Cost implications from uncaught API failures

## Found By
Performance Oracle Agent
