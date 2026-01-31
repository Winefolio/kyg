# P3-001: OpenAI Client Initialization Duplicated

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality

## Summary
OpenAI client is initialized in 3 separate files instead of using a shared instance.

## Affected Files
- `server/openai-client.ts`
- `server/wine-intelligence.ts`
- `server/services/questionGenerator.ts`

## Current Pattern (duplicated)
```typescript
// In each file:
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

## Fix Required
Create shared client module:

```typescript
// server/lib/openai.ts
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

Then import from shared module:
```typescript
import { openai } from './lib/openai';
```

## Benefits
- Single point of configuration
- Easier to add retry logic, logging
- Consistent error handling
- Can mock for tests

## Found By
Pattern Recognition Specialist Agent
