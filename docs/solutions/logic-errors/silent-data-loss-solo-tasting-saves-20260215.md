---
module: Solo Tastings
date: 2026-02-15
problem_type: logic_error
component: service_object
symptoms:
  - "Users complete solo tastings but data never appears in journal"
  - "Save mutation onError shows 'Your tasting notes have been saved' success message"
  - "Saved tastings invisible for up to 5 minutes due to stale TanStack Query cache"
  - "AI-generated question answers silently dropped when section names don't match TastingResponses keys"
  - "401 errors after Railway deploy because in-memory session store is wiped"
root_cause: logic_error
resolution_type: code_fix
severity: critical
tags: [silent-failure, data-loss, session-store, cache-invalidation, error-handling, section-mapping, rate-limiter, auth-fallback]
files_modified:
  - server/index.ts
  - server/storage.ts
  - server/routes/tastings.ts
  - client/src/pages/SoloTastingSession.tsx
  - client/src/pages/SoloTastingNew.tsx
  - client/src/hooks/useAuth.ts
related:
  - docs/solutions/integration-issues/auth-chat-state-sync-race-condition-20260214.md
---

# Troubleshooting: Silent Data Loss in Solo Tasting Saves

## Problem

Users complete solo tastings but can't find their data afterward. The bug is intermittent and particularly insidious because the UI shows a fake "Complete" screen even when the save fails. Root cause is a chain of 6 compounding bugs where each one masks the others.

## Environment
- Module: Solo Tastings (client + server)
- Stack: React + Express + TypeScript, PostgreSQL with Drizzle ORM
- Affected Components: `SoloTastingSession.tsx`, `SoloTastingNew.tsx`, `server/index.ts`, `server/routes/tastings.ts`, `useAuth.ts`
- Date: 2026-02-15

## Symptoms
- Users complete a tasting, see "Your tasting notes have been saved", but the tasting never appears in their journal
- After Railway deploys, users get silent 401 errors on all API calls (sessions wiped)
- AI-generated questions produce answers that are silently dropped during save
- `aiRateLimit` middleware (10 req/min) intermittently blocks the save endpoint
- Chapter completion mutations pass `Date.now()` instead of real tasting IDs

## What Didn't Work

**Direct solution:** The chain of bugs was identified through code tracing and institutional learnings in `docs/solutions/`. No false-start attempts — the root causes were clear once traced.

## Solution

Six fixes applied together because each bug in the chain amplifies the others:

### Fix 1: Persistent Session Store (`server/index.ts`)

Express session used the default `MemoryStore`. Every Railway deploy wiped all sessions, causing 401s.

```typescript
// Before (broken): in-memory sessions, wiped on deploy
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  // no store option = MemoryStore
}));

// After (fixed): PostgreSQL-backed sessions survive deploys
import pgSession from "connect-pg-simple";
const PgStore = pgSession(session);

app.use(session({
  store: new PgStore({
    conString: process.env.DATABASE_URL,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { /* existing config */ },
  name: "cata.sid",
}));
```

`connect-pg-simple` was already in `package.json` but never imported.

### Fix 2: Show Error on Failed Save (`client/src/pages/SoloTastingSession.tsx:394-399`)

The `onError` handler called `setIsComplete(true)` and showed a success message. Comment said "Still mark as complete so user isn't stuck" — but this creates silent data loss.

```typescript
// Before (broken): fake success on error
onError: () => {
  setIsComplete(true); // Shows "Your tasting notes have been saved"
  setIsSaving(false);
},

// After (fixed): show error with retry
onError: (error: any) => {
  setSaveError(error.message || "Failed to save your tasting. Please try again.");
  setIsSaving(false);
  // Do NOT setIsComplete(true) — user needs to retry
},
```

Added a full error screen with a "Try Again" button that calls the save mutation with preserved answers.

### Fix 3: Invalidate Query Cache (`client/src/pages/SoloTastingSession.tsx`)

No `queryClient.invalidateQueries` after save. TanStack Query's 5-minute `staleTime` meant saved tastings were invisible in the journal.

```typescript
// After: invalidate all relevant caches
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ["/api/solo/tastings"] });
  queryClient.invalidateQueries({ queryKey: ["/api/solo/preferences"] });
  queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  setIsComplete(true);
  setIsSaving(false);
},
```

### Fix 4: AI Question Section Mapping (`client/src/pages/SoloTastingSession.tsx:254-270`)

`convertAIQuestions` mapped AI categories to sections like `fruit`, `secondary`, `tertiary`, `body`, `acidity`. But `TastingResponses` only has keys: `visual`, `aroma`, `taste`, `structure`, `overall`. Unmapped answers were silently dropped.

```typescript
// Added mapping in formatResponsesForSave()
const sectionToResponseKey: Record<string, keyof TastingResponses> = {
  visual: "visual", aroma: "aroma", taste: "taste",
  structure: "structure", overall: "overall",
  fruit: "aroma", secondary: "aroma", tertiary: "aroma",
  body: "structure", acidity: "structure",
};
```

### Fix 5: Remove Rate Limiter from Save (`server/routes/tastings.ts:280`)

`aiRateLimit` (10 req/min) was applied to the save endpoint because it triggers background AI jobs. But the save itself should never be rate-limited.

```typescript
// Before: rate limiter on save
router.post("/api/solo/tastings", requireAuth, aiRateLimit, async (req, res) => {

// After: no rate limiter on save
router.post("/api/solo/tastings", requireAuth, async (req, res) => {
```

### Fix 6: Auth Fallback + Chapter Completion

- `useAuth.ts`: Removed localStorage fallback that created ghost sessions (user appears logged in but server returns 401)
- `SoloTastingNew.tsx`: Changed `completeChapterMutation.mutateAsync(Date.now())` to pass real tasting ID from save response

## Why This Works

The core problem was a **silent failure chain**: each bug masked the one before it. The session store wipe caused 401s → the auth fallback masked those 401s → the error handler masked save failures → the stale cache masked successful saves → the section mapping dropped answers from what did save. Fixing any single bug wouldn't resolve the user's experience because the next bug in the chain would still cause data loss.

The critical insight: **never show success when an operation fails**. The "still mark as complete so user isn't stuck" comment was well-intentioned but created the worst possible outcome — the user thinks their data is saved and leaves.

## Prevention

1. **Never fake success on error.** If a save fails, show an error with retry. Being "stuck" with a retry button is infinitely better than silent data loss.

2. **Always invalidate TanStack Query cache after mutations.** Any `useMutation` that writes data must `invalidateQueries` for all queries that read that data. The 5-minute `staleTime` in `queryClient.ts` makes this mandatory.

3. **Use persistent session stores in production.** `MemoryStore` is for development only. Any deployment that restarts the process (Railway, Heroku, etc.) will wipe all sessions. `connect-pg-simple` is zero-config with `createTableIfMissing: true`.

4. **Map AI-generated categories to your data model explicitly.** When AI produces categories that don't match your schema keys, add a mapping layer. Never assume the names will align.

5. **Don't rate-limit save endpoints.** Rate-limit the expensive downstream operations (AI calls, background jobs) separately.

6. **Auth checks must hit the server.** LocalStorage-only fallbacks create ghost sessions where the UI thinks the user is logged in but all API calls fail silently.

## Related Issues

- See also: [Auth state desync + chat title race condition](../integration-issues/auth-chat-state-sync-race-condition-20260214.md) — Documents the `useAuth()` localStorage fallback pattern that contributed to this bug chain
- See also: [State loss in Pierre chat](../ui-bugs/state-loss-accidental-dismiss-pierre-chat-20260215.md) — Companion fix for Pierre chat stability, implemented in the same PR
