# P3-005: Code Simplification Opportunities (566 LOC)

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality

## Summary
Code Simplicity Reviewer identified 566 lines of code that could be simplified or consolidated.

## Key Opportunities

### 1. Duplicate Wine Recommendation Logic
**Files:** `server/openai-client.ts`, `server/wine-intelligence.ts`
**LOC Savings:** ~80 lines

Both files have similar prompt construction and response parsing for wine-related AI calls.

### 2. Question Type Components
**Files:** `client/src/components/questions/*.tsx`
**LOC Savings:** ~120 lines

Multiple question type components share similar structure. Could use composition pattern.

### 3. Error Handling Patterns
**Files:** Various route files
**LOC Savings:** ~60 lines

Repeated try/catch blocks with similar error responses. Use error middleware.

### 4. API Response Formatting
**Files:** Route files
**LOC Savings:** ~40 lines

Repeated `res.json({ success: true, data: ... })` patterns. Create response helpers.

### 5. Authentication Checks
**Files:** Route files
**LOC Savings:** ~30 lines

Repeated session user checks. Already have middleware, but not consistently used.

## Approach
1. Don't refactor during feature work
2. Create separate refactoring tickets
3. Prioritize by risk and benefit
4. Add tests before refactoring

## Found By
Code Simplicity Reviewer Agent
