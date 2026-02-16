---
title: "fix: Solo Tasting Save Failures + Pierre Chat Stability"
type: fix
date: 2026-02-15
---

# Fix: Solo Tasting Save Failures + Pierre Chat Stability

## Overview

Two critical bug areas affecting core user flows: (1) solo tastings intermittently not saving, and (2) Pierre chat closing unexpectedly, losing conversations, and having poor UI feedback. Root causes identified through code tracing and existing institutional learnings in `docs/solutions/`.

## Problem Statement

**Solo Tastings:** Users complete tastings but can't find their data afterward. This is intermittent, caused by a chain of compounding bugs: sessions lost on deploy, save errors silently swallowed, and cache preventing saved data from appearing.

**Pierre Chat:** The chat sheet closes on accidental swipes/clicks, wipes conversation state on every reopen, and provides no recovery path. Messages appear lost even when saved server-side because the UI resets to a blank welcome screen.

---

## Phase 1: Stop Active Data Loss (P0)

### 1.1 Wire Up Persistent Session Store

**File:** `server/index.ts` (lines 28-39)

**Bug:** Express session uses the default in-memory `MemoryStore`. Every Railway deploy wipes all sessions. Users get 401 on their next API call. `connect-pg-simple` is already in `package.json` but never imported.

**Fix:**
```typescript
import pgSession from 'connect-pg-simple';
const PgStore = pgSession(session);

app.use(session({
  store: new PgStore({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { /* existing config */ },
  name: 'cata.sid'
}));
```

- [x] Import and configure `connect-pg-simple` in `server/index.ts`
- [ ] Test that sessions survive server restart

### 1.2 Show Error on Failed Tasting Save (Not Fake "Complete")

**File:** `client/src/pages/SoloTastingSession.tsx` (lines 394-399)

**Bug:** `onError` handler sets `isComplete(true)` and shows "Your tasting notes have been saved" even when the save failed. The comment says "Still mark as complete so user isn't stuck" -- but this creates silent data loss.

**Fix:**
- [x] Remove `setIsComplete(true)` from `onError`
- [x] Show an error state with a "Retry" button instead
- [x] Preserve the user's answers in state so retry works without re-entering data
- [ ] Add localStorage auto-save of answers as a safety net (clear on successful server save)

### 1.3 Invalidate Query Cache After Tasting Save

**File:** `client/src/pages/SoloTastingSession.tsx`

**Bug:** No `queryClient.invalidateQueries` after save. TanStack Query's 5-minute `staleTime` (from `client/src/lib/queryClient.ts:53`) means saved tastings don't appear in the journal for up to 5 minutes.

**Fix:**
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['/api/solo/tastings'] });
  queryClient.invalidateQueries({ queryKey: ['/api/solo/preferences'] });
  queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  setIsComplete(true);
  setIsSaving(false);
},
```

- [x] Import `useQueryClient` in `SoloTastingSession.tsx`
- [x] Invalidate tasting, preferences, and dashboard queries in `onSuccess`

### 1.4 Fix AI Question Section Mapping

**File:** `client/src/pages/SoloTastingSession.tsx` (lines 254-270, 348-363)

**Bug:** `convertAIQuestions` maps AI categories to sections like `fruit`, `secondary`, `tertiary`, `body`, `acidity`. But `TastingResponses` only has keys: `visual`, `aroma`, `taste`, `structure`, `overall`. Answers for unmapped sections are silently dropped.

**Fix:**
- [x] Add a section mapping in `formatResponsesForSave` that maps AI categories to existing `TastingResponses` keys:
  - `fruit` -> `aroma`
  - `secondary` -> `aroma`
  - `tertiary` -> `aroma`
  - `body` -> `structure`
  - `acidity` -> `structure`
- [x] Verify answers are correctly populated after mapping

---

## Phase 2: Fix Pierre Chat Stability (P0/P1)

### 2.1 Prevent Accidental Drawer Dismiss on Mobile

**File:** `client/src/components/sommelier/SommelierChatSheet.tsx` (lines 260-268)

**Bug:** Vaul `Drawer` allows the entire content area as a swipe-to-dismiss target. Scrolling up through messages triggers drawer dismiss. No `handleOnly` prop set.

**Fix:**
- [x] Add `handleOnly` prop to the `Drawer` component so only the drag handle triggers dismiss
- [ ] Alternatively, increase `closeThreshold` and add `snapPoints={[0.92]}` as additional protection
- [x] Test on mobile: scroll through messages without accidental dismiss

### 2.2 Preserve Active Chat Across Close/Reopen

**File:** `client/src/hooks/useSommelierChat.ts` (lines 48-55)

**Bug:** `useEffect` on `isOpen` wipes `messages`, `activeChatId`, and `error` every time the sheet opens. This means accidental close + reopen = conversation gone.

**Fix:**
- [x] Remove the state reset from the `isOpen` useEffect
- [x] Only reset to fresh chat on explicit "New Chat" action (button tap)
- [x] When reopening, if `activeChatId` exists, conversation state is preserved
- [x] "New Chat" already exists in sidebar -- startNewChat() handles intentional reset

### 2.3 Fix Desktop Backdrop Click-to-Close

**File:** `client/src/components/sommelier/SommelierChatSheet.tsx` (lines 276-282)

**Bug:** A fully transparent full-screen `<div>` at `z-40` catches clicks and closes the chat. No visual indication that clicking outside closes the panel.

**Fix:**
- [x] Remove the invisible backdrop div entirely -- let the chat panel float without a dismiss zone
- [x] Users close via the explicit X button in `ChatHeader`
- [ ] Alternatively, add a semi-transparent backdrop (`bg-black/10`) so the dismiss zone is visible

### 2.4 Abort SSE Stream on Sheet Close

**File:** `client/src/hooks/useSommelierChat.ts`

**Bug:** When the sheet closes during SSE streaming, the stream continues in the background but the client state is wiped. The server may or may not save the assistant's response depending on timing.

**Fix:**
- [x] Call `abortControllerRef.current?.abort()` when the sheet closes
- [ ] On the server side (`server/services/sommelierChatService.ts`), save partial content on stream abort with a flag indicating incompleteness
- [ ] When loading chat history, show incomplete messages with a visual indicator

### 2.5 Preserve User Message on Send Error

**File:** `client/src/hooks/useSommelierChat.ts` (lines 175-178)

**Bug:** On error, the optimistic user message is removed from the UI. The user's typed message vanishes with only a small error banner.

**Fix:**
- [x] Keep the optimistic user message in the list on error
- [x] Add a "retry" affordance (tap-to-retry icon) on the failed message
- [x] Preserve the message text so the user doesn't have to retype

---

## Phase 3: Auth Resilience (P1)

### 3.1 Fix useAuth localStorage Fallback

**File:** `client/src/hooks/useAuth.ts` (lines 46-53, 79-85)

**Bug:** When the server auth check fails, useAuth falls back to localStorage and creates a user object without an `id`. The UI shows the user as logged in, but all server-side operations fail with 401 (silently, due to Bug 1.2).

**Fix:**
- [x] When auth check fails, do NOT set user state from localStorage alone
- [x] Show the user as unauthenticated and redirect to login
- [x] Remove the `return { success: true }` from the login catch block -- a failed login is a failed login

### 3.2 Fix Chapter Completion Fake Tasting ID

**File:** `client/src/pages/SoloTastingNew.tsx` (line 294)

**Bug:** `completeChapterMutation.mutateAsync(Date.now())` passes a fake tasting ID instead of the real one from the save response.

**Fix:**
- [x] Pass the real tasting ID from `saveTastingMutation`'s response through the `onComplete` callback
- [x] Use that ID in `completeChapterMutation`

---

## Phase 4: Data Integrity (P2)

### 4.1 Wrap createSommelierMessage in Transaction

**File:** `server/storage.ts` (around line 6458)

**Bug:** Message insert and messageCount increment are two separate queries. If the count update fails, the count drifts. Chats with `messageCount: 0` are filtered out of the sidebar.

**Fix:**
- [x] Wrap the insert + count update in `db.transaction()`

### 4.2 Remove Rate Limiter from Tasting Save

**File:** `server/routes/tastings.ts` (line 280)

**Bug:** `aiRateLimit` (10 req/min) is on the save endpoint because it triggers background AI jobs. But the save itself should never be rate-limited.

**Fix:**
- [x] Remove `aiRateLimit` from the `POST /api/solo/tastings` route
- [x] Apply rate limiting only to the background AI jobs themselves

---

## Acceptance Criteria

- [x] Sessions survive server restarts (no more 401 after deploy)
- [x] Failed tasting saves show an error with retry, not a fake "Complete"
- [x] Saved tastings appear immediately in the journal (cache invalidated)
- [x] AI-generated question answers are not silently dropped
- [x] Pierre chat does not close on mobile scroll gestures
- [x] Reopening Pierre shows the last active conversation, not a blank screen
- [x] Desktop click outside Pierre does not close it (or shows visible backdrop)
- [x] Network errors in Pierre preserve the user's message with retry option
- [x] Chapter completion references the real tasting ID

## Dependencies & Risks

- `connect-pg-simple` is already in `package.json` -- no new dependencies needed
- Session store migration: existing users will be logged out once (one-time cost)
- Vaul drawer `handleOnly` may require testing across iOS/Android browsers for gesture handling
- Removing the state reset on Pierre reopen changes the UX model from "always fresh" to "continue last chat" -- verify this feels right

## References

- Auth desync solution: `docs/solutions/integration-issues/auth-chat-state-sync-race-condition-20260214.md`
- AI chat UX patterns: `docs/solutions/best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md`
- Fire-and-forget todo: `todos/P1-005-fire-and-forget-jobs-no-tracking.md`
- Missing transaction todo: `todos/P2-006-missing-transaction-tasting-creation.md`
- Previous Pierre fixes: commits `668d93f`, `d5cb90a`, `d121f99`
