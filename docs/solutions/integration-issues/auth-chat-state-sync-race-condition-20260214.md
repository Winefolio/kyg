---
title: Auth state desync + chat title race condition in Pierre sommelier chat
date: 2026-02-14
problem_type: integration_issue
component: react_component, service_layer
symptoms:
  - "Pierre FAB visible on login page before user authentication"
  - "All chats in sidebar showed 'New conversation' instead of GPT-generated titles"
  - "Existing chats had null titles in database after feature launch"
root_cause: state_sync, race_condition
severity: high
tags: [authentication, react-query, useAuth, fire-and-forget, async-race, gpt-4o-mini, title-generation, cache-sharing]
files_modified:
  - client/src/components/sommelier/SommelierFAB.tsx
  - server/services/sommelierChatService.ts
  - server/routes/sommelier-chat.ts
related:
  - docs/solutions/best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md
  - todos/P1-005-fire-and-forget-jobs-no-tracking.md
  - todos/P2-001-race-condition-level-up.md
---

# Auth State Desync + Chat Title Race Condition

Two compounding bugs discovered during the Pierre chat history sidebar feature launch.

## Bug 1: Pierre FAB Showing Before Login

### Symptom

The floating action button for Pierre (AI sommelier) appeared on the login page at `/home` before users authenticated. Users could open the chat before logging in.

### Investigation

1. `SommelierFAB.tsx` used the `useAuth()` hook to check authentication
2. `useAuth()` reads from localStorage and considers user "logged in" even when the server session is expired
3. `HomeV2.tsx` uses `useQuery(["/api/auth/me"])` which correctly fails when not authenticated
4. The two components had **different views of auth state** — useAuth saw a cached user, useQuery saw no session

### Root Cause

`useAuth()` aggressively auto-logs in from localStorage, treating cached credentials as truth. `HomeV2` checks the server directly via React Query. When a session expires, these diverge: useAuth thinks you're logged in, the server says you're not.

### Solution

Replace `useAuth()` with the same React Query pattern HomeV2 uses, sharing cache via identical `queryKey`:

```typescript
// BEFORE (broken) - SommelierFAB.tsx
import { useAuth } from "@/hooks/useAuth";
const { user } = useAuth();
if (!user || isHidden || !isShown) return null;

// AFTER (fixed) - shares React Query cache with HomeV2
import { useQuery } from "@tanstack/react-query";
const { data: authData } = useQuery<{ user: { id: number; email: string } }>({
  queryKey: ["/api/auth/me"],
  queryFn: async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  },
  retry: false,
  staleTime: 5 * 60 * 1000,
});
const isAuthenticated = !!authData?.user;
if (!isAuthenticated || isHidden || !isShown) return null;
```

**Key insight:** Components that need to agree on auth state must use the same `queryKey` so React Query gives them identical cached data.

---

## Bug 2: Chat Titles Showing "New Conversation"

### Symptom

All chats in the history sidebar displayed "New conversation" instead of GPT-generated descriptive titles (e.g., "Budget Friendly Wine Picks").

### Investigation

1. Checked server logs — no title generation logs appearing at all
2. Found `generateChatTitle` was fire-and-forget (`void` return with `.then()` chain)
3. Title generation raced with chat list refetch — frontend loaded list before title was saved to DB
4. Model name `gpt-5-mini` may not exist in OpenAI API — other working code uses `gpt-4o-mini`
5. Existing chats created before the feature had `title: null` and needed backfilling

### Root Cause

Three compounding issues:
1. **Fire-and-forget pattern** — `generateChatTitle` returned void and used `.then()`, so callers couldn't await it. The frontend refetched the chat list before the title write completed.
2. **Wrong model name** — `gpt-5-mini` vs the proven `gpt-4o-mini`
3. **No backfill** — Pre-existing chats had null titles

### Solution

Made `generateChatTitle` async/awaited with correct model and fallback:

```typescript
// BEFORE (broken) - fire-and-forget, wrong model
function generateChatTitle(chatId: number, userMessage: string): void {
  const client = getOpenAIClient();
  if (!client) return;
  client.chat.completions.create({
    model: "gpt-5-mini", // may not exist
    // ...
  }).then(completion => {
    storage.updateSommelierChat(chatId, { title: /* ... */ });
  }).catch(err => { /* ... */ });
}
// Called without await:
generateChatTitle(chat.id, sanitizedMessage);

// AFTER (fixed) - async, awaited, correct model, fallback
export async function generateChatTitle(chatId: number, userMessage: string): Promise<void> {
  try {
    const client = getOpenAIClient();
    if (!client) {
      await storage.updateSommelierChat(chatId, { title: userMessage.slice(0, 50) });
      return;
    }
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // proven working
      messages: [
        { role: "system", content: "Generate a very short title (3-6 words max)..." },
        { role: "user", content: userMessage.slice(0, 200) },
      ],
      max_completion_tokens: 20,
    });
    const title = completion.choices[0]?.message?.content?.trim();
    await storage.updateSommelierChat(chatId, { title: (title || userMessage).slice(0, 100) });
  } catch (err: any) {
    await storage.updateSommelierChat(chatId, { title: userMessage.slice(0, 50) });
  }
}
// Called with await:
await generateChatTitle(chat.id, sanitizedMessage);
```

**Backfill:** Ran a one-time script to generate titles for existing null-titled chats using their first user message. Also added a `POST /api/sommelier-chat/backfill-titles` endpoint.

---

## Prevention

### Rules for This Codebase

1. **Auth state must come from `useQuery(["/api/auth/me"])`** — never from `useAuth()` alone when the component needs to agree with HomeV2 on login state. `useAuth()` reads localStorage which can be stale.

2. **Never fire-and-forget DB writes that have downstream readers.** If another query will refetch data that this write modifies, the write must be awaited. The pattern `someAsyncFn(); // no await` is a race condition when followed by a query invalidation.

3. **Use `gpt-4o-mini` for lightweight tasks** — it's proven working in `wineRecommendations.ts` and `dashboard.ts`. The `gpt-5-mini` name appears in CLAUDE.md but may not resolve to a real model.

4. **Always add fallback for AI-generated content.** If GPT fails, use a truncated version of the input (e.g., `userMessage.slice(0, 50)`). Never leave a field null when a reasonable default exists.

### Code Review Checklist

- [ ] **Auth state:** Is useAuth() the sole source? Does it need to agree with React Query?
- [ ] **Async completion:** Does any `void` function write to the DB? Should callers await it?
- [ ] **Refetch timing:** After a mutation, is the refetch triggered before or after the DB write completes?
- [ ] **Model names:** Is the OpenAI model name verified against working calls elsewhere in the codebase?
- [ ] **Data backfill:** Does this feature add a new field to existing records? Do old records need backfilling?

## Related

- [AI Chat UX Patterns](../best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md) — Documents the fire-and-forget compaction pattern
- [P1-005: Fire-and-forget jobs](../../todos/P1-005-fire-and-forget-jobs-no-tracking.md) — Same pattern in tasting routes
- [P2-001: Race condition in level-up](../../todos/P2-001-race-condition-level-up.md) — Related async race condition
