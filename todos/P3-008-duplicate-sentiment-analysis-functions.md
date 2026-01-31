# P3-008: Duplicate Sentiment Analysis Functions

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality

## Summary
Three nearly identical sentiment analysis functions exist in `openai-client.ts`, sharing ~80% of their code. This duplication increases maintenance burden and risk of inconsistent behavior.

## Affected Files
- `server/openai-client.ts`

## Duplicate Functions
1. `analyzeTextSentiment()` - General text sentiment
2. `analyzeWineSentiment()` - Wine-specific sentiment
3. `analyzeTastingSentiment()` - Tasting notes sentiment

## Common Pattern (80% identical)
```typescript
async function analyze*Sentiment(text: string): Promise<SentimentResult> {
  if (!openai) return defaultResult;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: SIMILAR_SYSTEM_PROMPT },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 200
  });

  // Parse and validate response
  // Return normalized result
}
```

## Fix Required
Consolidate into single configurable function:

```typescript
interface SentimentConfig {
  systemPrompt: string;
  outputSchema?: ZodSchema;
}

async function analyzeSentiment(
  text: string,
  config: SentimentConfig
): Promise<SentimentResult> {
  if (!openai) return defaultSentiment;

  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' },
    max_completion_tokens: 200
  });

  return parseSentimentResponse(completion);
}

// Usage
const WINE_SENTIMENT_CONFIG: SentimentConfig = {
  systemPrompt: 'Analyze wine tasting notes...'
};

export const analyzeWineSentiment = (text: string) =>
  analyzeSentiment(text, WINE_SENTIMENT_CONFIG);
```

## LOC Reduction
- Current: ~150 lines for 3 functions
- After: ~60 lines (1 base function + 3 configs)
- Savings: ~90 lines

## Found By
Code Simplicity Reviewer Agent, Pattern Recognition Specialist Agent
