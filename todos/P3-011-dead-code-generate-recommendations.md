# P3-011: Dead Code - Unused generateRecommendations Function

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality

## Summary
The `generateRecommendations` function in `openai-client.ts` appears to be unused dead code. It was likely replaced by `generateNextBottleRecommendations` but never removed.

## Affected Files
- `server/openai-client.ts`

## Evidence
```bash
# Search for usage
grep -r "generateRecommendations" server/
# Only definition found, no imports or calls
```

## Dead Code
```typescript
// ~50 lines of unused code
export async function generateRecommendations(
  preferences: UserPreferences,
  recentTastings: Tasting[]
): Promise<Recommendation[]> {
  // Old implementation
}
```

## Fix Required
1. Verify the function is truly unused:
   ```bash
   grep -r "generateRecommendations" --include="*.ts" --include="*.tsx"
   ```

2. If unused, delete the function entirely

3. Also check for any related unused types or helpers

## LOC Reduction
- ~50 lines can be removed

## Found By
Code Simplicity Reviewer Agent
