# P3-002: Multiple `any` Types Need Proper Interfaces

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality / TypeScript

## Summary
Several places use `any` type instead of proper TypeScript interfaces, reducing type safety.

## Affected Files
- `server/routes/tastings.ts`
- `server/openai-client.ts`
- `client/src/components/NextBottleRecommendations.tsx`

## Examples Found

### 1. API Response parsing
```typescript
// Current
const data: any = await response.json();

// Should be
interface LevelUpResponse {
  success: boolean;
  newLevel?: TastingLevel;
  error?: string;
}
const data: LevelUpResponse = await response.json();
```

### 2. OpenAI response handling
```typescript
// Current
const result: any = JSON.parse(content);

// Should be
interface RecommendationResponse {
  recommendations: TastingRecommendation[];
}
const result = JSON.parse(content) as RecommendationResponse;
```

### 3. Component props
```typescript
// Current
const WineCard = ({ wine }: { wine: any }) => ...

// Should be
interface WineCardProps {
  wine: Wine;
}
const WineCard = ({ wine }: WineCardProps) => ...
```

## Fix Required
1. Define interfaces for all API responses
2. Replace `any` with specific types
3. Add runtime validation where needed (zod)

## Found By
TypeScript Reviewer Agent
