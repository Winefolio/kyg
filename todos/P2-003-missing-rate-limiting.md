# P2-003: Missing Rate Limiting on AI Endpoints

## Priority: HIGH (P2)
## Status: Open
## Category: Security / Cost

## Summary
OpenAI-powered endpoints have no rate limiting, allowing abuse that could result in excessive API costs.

## Affected Files
- `server/routes/tastings.ts` (recommendations endpoint)
- `server/services/questionGenerator.ts`
- `server/wine-intelligence.ts`
- `server/routes/transcription.ts`

## Vulnerable Endpoints
- POST `/api/solo/tastings` (triggers AI question generation)
- POST `/api/transcribe` (Whisper API)
- Any endpoint calling `generateNextBottleRecommendations()`

## Fix Required

```typescript
import rateLimit from 'express-rate-limit';

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});

// Strict limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute per user
  keyGenerator: (req) => req.session?.user?.id || req.ip,
  message: { error: 'AI rate limit exceeded' }
});

app.use('/api/', apiLimiter);
app.use('/api/transcribe', aiLimiter);
app.use('/api/solo/tastings', aiLimiter);
```

## Risk if Not Fixed
- Excessive OpenAI API costs from abuse
- DoS via resource exhaustion
- Budget overruns

## Found By
Security Sentinel Agent, Performance Oracle Agent
