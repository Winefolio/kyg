---
title: "fix: Solo Tasting Data Visibility + Pierre Chat Stability (Round 2)"
type: fix
date: 2026-02-16
---

# Fix: Solo Tasting Data Visibility + Pierre Chat Stability (Round 2)

## Overview

Follow-up to the Feb 15 fix plan. The previous round addressed session persistence, error handling, section mapping, and drawer dismiss. Users still report: (1) solo tasting data not appearing in dashboards, and (2) Pierre chat closing unexpectedly and losing messages. Root cause investigation identified **5 remaining bugs** across both features.

## Problem Statement

**Solo Tastings:** Data IS being saved to the database, but appears empty in dashboards and preferences. The previous fix mapped AI question sections (`fruit` -> `aroma`, `body` -> `structure`) but the backend still reads hardcoded field paths like `taste.sweetness` that AI-generated questions never populate.

**Pierre Chat:** Three remaining stability issues: (1) navigating to certain routes unmounts the entire FAB component including the open chat, (2) switching browser tabs can kill the FAB via a failed auth re-query, (3) if the client disconnects mid-stream, the assistant's response is never saved to the database.

---

## Phase 1: Fix Solo Tasting Data Visibility

### 1.1 Normalize AI Response Data to Canonical Field Paths

**Files:**
- `client/src/pages/SoloTastingSession.tsx` (lines 338-389, `formatResponsesForSave`)

**Bug:** The `formatResponsesForSave` function derives field names from question IDs by splitting on `_` and dropping the first segment (line 376):
```typescript
const fieldName = q.id.split('_').slice(1).join('_') || q.id;
```

For default tasting questions, this works (`taste_sweetness` -> `sweetness` under `taste`). But for AI-generated questions, the IDs are arbitrary (`body_texture`, `acidity_level`, `fruit_1`), producing unpredictable field names (`texture`, `level`, `1`) stored under mapped sections (`structure`, `structure`, `aroma`).

Meanwhile, the backend reads these exact hardcoded paths in SQL (`storage.ts:4839-4842`):
```sql
AVG((responses->'taste'->>'sweetness')::numeric) as sweetness
AVG((responses->'taste'->>'acidity')::numeric) as acidity
AVG((responses->'taste'->>'tannins')::numeric) as tannins
AVG((responses->'taste'->>'body')::numeric) as body
```

And for overall rating (`storage.ts:5042-5044`):
```typescript
tastingResponses?.overall?.rating || tastingResponses?.overall_rating || 0;
```

**Root cause:** AI questions store data under arbitrary field names in arbitrary sections. Backend expects canonical field names under canonical sections.

**Fix approach:** Normalize responses to ALWAYS include the canonical fields the backend expects, regardless of question source. Two changes needed:

**Change A -- Frontend: Map AI answers to canonical fields**

In `formatResponsesForSave()`, after building responses from all questions, scan the AI-generated responses for values that semantically correspond to canonical fields and copy them:

```typescript
// client/src/pages/SoloTastingSession.tsx

const formatResponsesForSave = () => {
  // ... existing logic builds responses ...

  // After all questions are processed, ensure canonical fields exist
  // for any AI-generated tasting that has scale-type answers in related sections
  normalizeCanonicalFields(responses, allQuestions, answers);

  return responses;
};

/**
 * Ensure the backend's expected canonical fields are populated.
 * AI questions with matching semantics get their values copied to canonical paths.
 */
function normalizeCanonicalFields(
  responses: TastingResponses,
  questions: TastingQuestion[],
  answers: Record<string, any>
) {
  // Map of canonical field -> { section, keywords to match in question title/id }
  const canonicalFields = [
    { section: 'taste', field: 'sweetness', keywords: ['sweetness', 'sweet', 'residual sugar'] },
    { section: 'taste', field: 'acidity', keywords: ['acidity', 'acid', 'tartness', 'crisp'] },
    { section: 'taste', field: 'tannins', keywords: ['tannin', 'tannins', 'tannic', 'astringent'] },
    { section: 'taste', field: 'body', keywords: ['body', 'weight', 'fullness', 'mouthfeel'] },
    { section: 'overall', field: 'rating', keywords: ['rating', 'overall', 'score', 'overall_rating'] },
  ];

  for (const { section, field, keywords } of canonicalFields) {
    const target = responses[section as keyof TastingResponses] as Record<string, any> | undefined;
    if (!target || target[field] !== undefined) continue; // Already populated

    // Find an AI question whose ID or title matches these keywords
    for (const q of questions) {
      const answer = answers[q.id];
      if (answer === undefined) continue;
      const idLower = q.id.toLowerCase();
      const titleLower = (q.config?.title || '').toLowerCase();
      if (keywords.some(kw => idLower.includes(kw) || titleLower.includes(kw))) {
        target[field] = answer;
        break;
      }
    }
  }
}
```

**Change B -- Backend: Also check `structure` section for taste-related values**

In `storage.ts` `getSoloTastingPreferences`, update the SQL to also look in `structure` (where AI questions about body/acidity get stored):

```sql
-- storage.ts getSoloTastingPreferences
SELECT
  COALESCE(
    AVG((responses->'taste'->>'sweetness')::numeric),
    AVG((responses->'structure'->>'sweetness')::numeric)
  ) as sweetness,
  COALESCE(
    AVG((responses->'taste'->>'acidity')::numeric),
    AVG((responses->'structure'->>'acidity')::numeric)
  ) as acidity,
  COALESCE(
    AVG((responses->'taste'->>'tannins')::numeric),
    AVG((responses->'structure'->>'tannins')::numeric)
  ) as tannins,
  COALESCE(
    AVG((responses->'taste'->>'body')::numeric),
    AVG((responses->'structure'->>'body')::numeric)
  ) as body,
  COUNT(*) as count
FROM tastings
WHERE user_id = ${userId}
```

- [x] Add `normalizeCanonicalFields()` function in `SoloTastingSession.tsx`
- [x] Call it at the end of `formatResponsesForSave()`
- [x] Update `getSoloTastingPreferences` SQL to COALESCE across `taste` and `structure` sections
- [x] Update any other backend SQL that reads hardcoded `taste.*` paths (check `routes/tastings.ts:97-100`, `routes/dashboard.ts`)
- [ ] Verify with a test: complete an AI-generated tasting, check that preferences show in dashboard

### 1.2 Fix Cache Invalidation Key Mismatch

**Files:**
- `client/src/pages/SoloTastingSession.tsx` (lines 409-411, `onSuccess`)

**Bug:** The invalidation calls:
```typescript
queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
```

But some dashboard components use URL-embedded email as a single string key element:
```typescript
queryKey: [`/api/dashboard/${email}`]
```

TanStack Query's prefix matching compares array elements. `['/api/dashboard']` matches `['/api/dashboard', email]` (prefix) but does NOT match `['/api/dashboard/john@example.com']` (different string).

**Fix:** Invalidate more broadly by also covering the URL-embedded format:

```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['/api/solo/tastings'] });
  queryClient.invalidateQueries({ queryKey: ['/api/solo/preferences'] });
  queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
  // Also invalidate URL-embedded dashboard queries
  queryClient.invalidateQueries({ predicate: (query) =>
    typeof query.queryKey[0] === 'string' &&
    (query.queryKey[0] as string).startsWith('/api/dashboard')
  });
  setSavedTastingId(data?.tasting?.id);
  setIsComplete(true);
  setIsSaving(false);
},
```

- [x] Update `onSuccess` in `SoloTastingSession.tsx` to invalidate dashboard queries with predicate
- [ ] Also update `SoloTastingNew.tsx` if it has similar invalidation logic

### 1.3 Add localStorage Auto-Save for Crash Protection

**File:** `client/src/pages/SoloTastingSession.tsx`

**Bug:** All answers are held in React state only. If the browser tab closes, app crashes, or phone goes to sleep aggressively, all unsaved answers are lost. This was an unchecked item from the Feb 15 plan.

**Fix:** Auto-save answers to localStorage on each change, restore on mount, clear on successful server save.

```typescript
// SoloTastingSession.tsx
const STORAGE_KEY = `cata-tasting-draft-${wine?.id || 'unknown'}`;

// Restore on mount
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setAnswers(parsed.answers || {});
      setCurrentQuestionIndex(parsed.questionIndex || 0);
    } catch {}
  }
}, []);

// Auto-save on change (debounced)
useEffect(() => {
  const timeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers,
      questionIndex: currentQuestionIndex,
      timestamp: Date.now()
    }));
  }, 500);
  return () => clearTimeout(timeout);
}, [answers, currentQuestionIndex]);

// Clear on successful save
onSuccess: (data) => {
  localStorage.removeItem(STORAGE_KEY);
  // ... existing invalidation logic
};
```

- [x] Add localStorage auto-save with debounce in `SoloTastingSession.tsx`
- [x] Restore draft on component mount
- [x] Clear draft on successful save
- [x] Add expiry check (discard drafts older than 24 hours)

---

## Phase 2: Fix Pierre Chat Stability

### 2.1 Decouple Chat State from FAB Route Visibility

**File:** `client/src/components/sommelier/SommelierFAB.tsx` (lines 55-110)

**Bug:** This is the **primary remaining cause** of Pierre closing unexpectedly. The FAB component conditionally returns `null` when the route doesn't match `SHOWN_ROUTE_PATTERNS` (line 79):

```typescript
if (!isAuthenticated || isHidden || !isShown) return null;
```

When it returns `null`, both the FAB button AND the `SommelierChatSheet` are unmounted. This destroys all chat state -- messages, streaming connection, everything. The user navigates to `/journeys/123` (not in SHOWN_ROUTE_PATTERNS), Pierre vanishes mid-conversation.

**Fix:** Separate the FAB button visibility from the chat sheet lifecycle. The chat sheet should NEVER unmount while open, regardless of route:

```typescript
// SommelierFAB.tsx
export function SommelierFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { triggerHaptic } = useHaptics();
  const { data: authData } = useQuery<{ user: { id: number; email: string } }>({
    queryKey: ["/api/auth/me"],
    // ... existing config but with retry: 1 (see 2.2)
  });

  const isAuthenticated = !!authData?.user;
  const isHidden = HIDDEN_ROUTE_PATTERNS.some((p) => p.test(location));
  const isShown = SHOWN_ROUTE_PATTERNS.some((p) => p.test(location));

  // FAB button only shows on allowed routes when not chatting
  const showFABButton = isAuthenticated && !isHidden && isShown && !isOpen;

  // Chat sheet stays mounted as long as it's open, regardless of route
  const showChatSheet = isAuthenticated && isOpen;

  return (
    <>
      <AnimatePresence>
        {showFABButton && (
          <motion.button
            // ... existing FAB button code
            onClick={() => { triggerHaptic("selection"); setIsOpen(true); }}
          >
            <PierreIcon className="w-6 h-6 text-white" />
            <span>Pierre</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat sheet is always rendered while open -- never unmounted by route changes */}
      {showChatSheet && (
        <SommelierChatSheet open={isOpen} onOpenChange={setIsOpen} />
      )}
    </>
  );
}
```

The key change: `showChatSheet` only depends on `isAuthenticated && isOpen`, NOT on `isHidden` or `isShown`. Route changes hide the FAB button but leave the chat sheet intact.

- [x] Refactor `SommelierFAB.tsx` to separate FAB button visibility from chat sheet lifecycle
- [x] Chat sheet stays mounted while `isOpen` is true, regardless of route
- [x] FAB button visibility still respects route patterns
- [ ] Test: open Pierre on `/home`, navigate to `/journeys/123`, chat should remain open

### 2.2 Add Retry to Auth Query to Prevent Chat Death on Tab Switch

**File:** `client/src/components/sommelier/SommelierFAB.tsx` (lines 62-71)

**Bug:** The auth query has `retry: false` (line 69). Combined with `refetchOnWindowFocus: true` in `queryClient.ts`, switching tabs and coming back triggers an auth refetch. If the network is slow or server hiccups, the query fails with no retry, `isAuthenticated` becomes `false`, and the FAB (plus open chat) is unmounted.

**Fix:** Add retry and keep previous data on refetch failure:

```typescript
const { data: authData } = useQuery<{ user: { id: number; email: string } }>({
  queryKey: ["/api/auth/me"],
  queryFn: async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },
  retry: 1,                    // Retry once on failure (was: false)
  staleTime: 5 * 60 * 1000,
  placeholderData: (prev) => prev,  // Keep previous data during refetch (TanStack v5)
});
```

`placeholderData: (prev) => prev` ensures that during a background refetch, the previous successful data is used. Only a confirmed auth failure (after retry) will set `isAuthenticated` to false.

- [x] Change `retry: false` to `retry: 1` in auth query
- [x] Add `placeholderData: (prev) => prev` to keep stale auth data during refetch
- [ ] Test: open Pierre, switch tabs, switch back -- chat should survive

### 2.3 Save Assistant Message on Client Disconnect

**Files:**
- `server/services/sommelierChatService.ts` (lines 166-193, `generateSSE`)
- `server/routes/sommelier-chat.ts` (lines 164-175, stream loop)

**Bug:** The assistant message is saved INSIDE the async generator (line 181), AFTER all tokens have been yielded. When the client disconnects, the route handler sets `clientDisconnected = true` and `break`s out of the loop (line 171). This stops iterating the generator, so the `createSommelierMessage` call at line 181 **never executes**. The user's message is saved (line 144) but the assistant's response is lost forever.

**Fix:** Move the message save to the route handler, OUTSIDE the generator. Accumulate the full content during streaming and save after the loop, regardless of disconnect:

```typescript
// server/routes/sommelier-chat.ts -- updated stream loop
const { stream } = await streamChatResponse(userId, userEmail, message.trim(), undefined, undefined, chatId || undefined);

let fullContent = "";
let chatId_received: number | null = null;

for await (const event of stream) {
  // Extract content from token events for saving
  try {
    const match = event.match(/^data: (.+)$/m);
    if (match) {
      const parsed = JSON.parse(match[1]);
      if (parsed.type === "token" && parsed.content) {
        fullContent += parsed.content;
      }
      if (parsed.type === "start" && parsed.chatId) {
        chatId_received = parsed.chatId;
      }
    }
  } catch {}

  if (!clientDisconnected) {
    res.write(event);
  }
}

// Always save assistant message, even if client disconnected
if (fullContent && chatId_received) {
  try {
    await storage.createSommelierMessage({
      chatId: chatId_received,
      role: "assistant",
      content: fullContent,
      metadata: { model: "gpt-5.2", clientDisconnected },
    });
  } catch (err) {
    console.error("[SommelierChat] Failed to save assistant message on disconnect:", err);
  }
}

res.end();
```

And update the generator to NOT save the message itself -- it only yields events:

```typescript
// server/services/sommelierChatService.ts -- generateSSE simplified
async function* generateSSE(): AsyncIterable<string> {
  yield `data: ${JSON.stringify({ type: "start", messageId: userMsg.id, chatId: chat.id })}\n\n`;

  let fullContent = "";
  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      yield `data: ${JSON.stringify({ type: "token", content: delta })}\n\n`;
    }
  }

  // Yield done event with content (route handler will save)
  yield `data: ${JSON.stringify({ type: "done", fullContent })}\n\n`;
  yield `data: [DONE]\n\n`;
}
```

Wait -- there's a subtlety. If the client disconnects, the `for await` loop breaks, which means the generator's remaining code after the `for await` (the `yield "done"`) also doesn't execute. The generator function just gets abandoned.

Better approach: let the generator run to completion always, and have the route handler just not write to the response when disconnected:

```typescript
// server/routes/sommelier-chat.ts -- simpler approach
for await (const event of stream) {
  if (!clientDisconnected) {
    res.write(event);
  }
  // Continue iterating even after disconnect so generator completes
  // (and saves the assistant message inside generateSSE)
}
```

This is the simplest fix -- just remove the `break` and let the generator finish. The client is already disconnected so `res.write` is a no-op, but the generator continues to completion, reaching the `createSommelierMessage` call.

- [x] In `sommelier-chat.ts`: remove the `if (clientDisconnected) break` and instead skip `res.write` when disconnected
- [ ] Test: open Pierre, send a message, close the chat mid-response. Reopen -- the assistant message should be there.
- [x] Consider: add a try/catch around `res.write` for the case where the response stream is already closed

### 2.4 Run Title Generation in Parallel with Streaming

**File:** `server/services/sommelierChatService.ts` (lines 151-154)

**Bug:** `await generateChatTitle(chat.id, sanitizedMessage)` blocks the stream start by 1-3 seconds (waiting for a GPT-5-mini API call). During this delay, users see no response and may close the chat.

**Fix:** Fire title generation without awaiting:

```typescript
// Don't block stream on title generation
if (isNewChat || !chat.title) {
  generateChatTitle(chat.id, sanitizedMessage).catch(err => {
    console.error("[SommelierChat] Title generation failed:", err);
  });
}
```

The chat list sidebar will update on the next refetch (10s staleTime). This is fine since the user is focused on the chat content, not the sidebar title.

- [x] Remove `await` from `generateChatTitle` call
- [x] Add `.catch()` to prevent unhandled promise rejection
- [ ] Test: new chat should start streaming immediately (no 1-3s delay)

---

## Acceptance Criteria

- [ ] AI-generated solo tastings show preference data (sweetness, acidity, etc.) in the dashboard
- [ ] Default tasting questions continue to work as before (no regression)
- [ ] Dashboard updates immediately after saving a tasting (no 5-minute stale window)
- [ ] Tasting answers survive browser tab closure (restored from localStorage)
- [ ] Pierre chat stays open when navigating to unlisted routes (e.g., `/journeys/123`)
- [ ] Pierre chat survives tab-switching on mobile
- [ ] Pierre assistant messages are saved even if user closes chat mid-stream
- [ ] New Pierre chats start streaming immediately (no title-generation delay)

## Dependencies & Risks

- **localStorage auto-save**: Need to handle the case where wine ID changes between drafts (discard stale drafts)
- **Removing `break` from stream loop**: Need to verify that `res.write` after disconnect doesn't throw. Add try/catch as safety.
- **Title generation fire-and-forget**: Sidebar may briefly show "New Chat" until the title fills in on next refetch. Acceptable tradeoff for instant streaming.
- **COALESCE SQL changes**: Must not break existing tastings with data in the canonical `taste.*` paths. COALESCE naturally prefers the first non-null value.

## References

- Previous plan: `docs/plans/2026-02-15-fix-solo-tasting-saves-pierre-stability-plan.md`
- Solo tasting solution: `docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md`
- Pierre chat solution: `docs/solutions/ui-bugs/state-loss-accidental-dismiss-pierre-chat-20260215.md`
- Auth desync solution: `docs/solutions/integration-issues/auth-chat-state-sync-race-condition-20260214.md`
- Codebase review: `docs/CODEBASE_REVIEW_2026-02-16.md`
