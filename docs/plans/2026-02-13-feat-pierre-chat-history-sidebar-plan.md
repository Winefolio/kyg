---
title: "feat: Pierre chat history sidebar (ChatGPT-style)"
type: feat
date: 2026-02-13
---

# feat: Pierre Chat History Sidebar

## Overview

Replace Pierre's current "+" new chat button with an OpenAI ChatGPT-style UX: every time the user opens Pierre, they get a fresh conversation. A sidebar drawer on the left shows recent chat history, accessible via a toggle button or swipe gesture on mobile. "Pierre" stays centered in the header as the model name.

This naturally encourages shorter, more focused conversations — reducing compaction pressure and keeping context quality high.

## Problem Statement

Currently, Pierre has a single active chat model with a "+" button to start new conversations. There's no way to browse or resume previous conversations. Users who have had good interactions (like a wine list recommendation) can never get back to them. The "+" button is also not intuitive — it's unclear what it does until you tap it.

## Proposed Solution

Mirror the ChatGPT mobile UX:

```
┌────────────────────────────────┐
│ ☰  │      Pierre      │       │  ← Header: toggle, model name
├────────────────────────────────┤
│                                │
│    Welcome / Messages          │  ← Chat content (new or loaded)
│                                │
├────────────────────────────────┤
│ 📷  │  Ask Pierre...  │  ➤   │  ← Input bar
└────────────────────────────────┘

Sidebar (slides from left):
┌──────────────────┬─────────────┐
│ ✏ New chat       │             │
│──────────────────│             │
│ Today            │             │
│  Wine for salmon │  (dimmed    │
│  Barolo recs     │   chat      │
│ Yesterday        │   behind)   │
│  Wine list help  │             │
│  Birthday dinner │             │
│──────────────────│             │
└──────────────────┴─────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Open behavior | Always new chat | ChatGPT pattern; encourages fresh context |
| Empty chat handling | Don't persist until first message | Prevents history pollution from accidental opens |
| Old chats | Fully editable (can continue) | Users need to resume recommendations |
| Chat titles | First user message, truncated to 50 chars | Simple, no GPT call needed, instantly available |
| Sidebar trigger (mobile) | Hamburger icon top-left + swipe from left edge | Standard mobile pattern |
| Sidebar trigger (desktop) | Hamburger icon top-left | Consistent with mobile |
| Sidebar close (mobile) | Auto-close after selecting a chat | Standard drawer behavior |
| Sidebar close (desktop) | Auto-close after selecting a chat | Keep floating panel compact |
| Time grouping | Today / Yesterday / Previous 7 Days / Older | ChatGPT pattern, easy scanning |
| Delete chats | Swipe-to-delete (mobile) / hover trash (desktop) | Standard patterns |
| Search | Not in v1 | Keep it simple |

## Technical Approach

### New API Endpoints

```
GET  /api/sommelier-chat/list          → { chats: SommelierChat[] }
GET  /api/sommelier-chat/:chatId       → { chat, messages }
DELETE /api/sommelier-chat/:chatId     → 204
```

**GET /list** returns all user chats (newest first), excluding chats with 0 messages. Each chat includes: `id`, `title`, `messageCount`, `updatedAt`. No pagination in v1 — users won't have hundreds of chats yet.

**GET /:chatId** loads a specific chat + last 50 messages. Validates the chat belongs to the requesting user.

**DELETE /:chatId** hard-deletes the chat and its messages (cascade).

### New Storage Methods

```typescript
// In IStorage interface + DatabaseStorage
getUserSommelierChats(userId: number): Promise<SommelierChat[]>
// SELECT * FROM sommelier_chats WHERE user_id = ? AND message_count > 0 ORDER BY updated_at DESC

getSommelierChatById(chatId: number, userId: number): Promise<SommelierChat | undefined>
// SELECT * FROM sommelier_chats WHERE id = ? AND user_id = ?

deleteSommelierChat(chatId: number): Promise<void>
// DELETE FROM sommelier_chats WHERE id = ?  (messages cascade)
```

### Modified API Behavior

**GET /api/sommelier-chat/active** — Keep this endpoint but change behavior:
- Always creates a new empty chat (no longer returns existing active chat)
- Returns `{ chat, messages: [] }`
- The new chat is NOT persisted to history until a message is sent

**POST /api/sommelier-chat/message** — Add auto-title logic:
- After saving the first user message, update `chat.title` with the message text (truncated to 50 chars)
- Update `chat.messageCount`

### Frontend Components

**Modified files:**

| File | Change |
|------|--------|
| `ChatHeader.tsx` | Replace close(X)/new(+) with hamburger toggle and close(X). Center "Pierre" |
| `SommelierChatSheet.tsx` | Add sidebar state, render `ChatHistorySidebar` |
| `useSommelierChat.ts` | Add `loadChat(chatId)`, `deleteChat(chatId)`, `chatList` query |
| `SommelierFAB.tsx` | Always create new chat on open (current behavior is fine) |

**New files:**

| File | Purpose |
|------|---------|
| `ChatHistorySidebar.tsx` | Sidebar drawer with chat list, time groups, delete |

### ChatHistorySidebar Component

```
┌─────────────────────────┐
│  ✏ New chat              │  ← Creates new chat, closes sidebar
│─────────────────────────│
│  Today                   │  ← Time group header
│  ┌─────────────────────┐│
│  │ Wine for grilled...  ││  ← Chat item (highlighted if active)
│  │ 3 msgs · 2h ago     ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ Help me pick a...   ││
│  │ 5 msgs · 5h ago     ││
│  └─────────────────────┘│
│                          │
│  Yesterday               │
│  ┌─────────────────────┐│
│  │ Barolo recommend... ││
│  │ 8 msgs · 1d ago     ││
│  └─────────────────────┘│
└─────────────────────────┘
```

**Rendering approach:**
- Mobile: Use `Drawer` from vaul, `side="left"`, overlay + backdrop
- Desktop: Use `motion.div` from left, same overlay pattern as current chat panel

**Chat item interactions:**
- Tap → load that chat, close sidebar
- Swipe left (mobile) → reveal delete button
- Hover (desktop) → show trash icon on right

**Time grouping logic:**
```typescript
function groupChatsByTime(chats: SommelierChat[]) {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = subDays(today, 1);
  const weekAgo = subDays(today, 7);

  return {
    today: chats.filter(c => new Date(c.updatedAt) >= today),
    yesterday: chats.filter(c => inRange(c.updatedAt, yesterday, today)),
    previous7Days: chats.filter(c => inRange(c.updatedAt, weekAgo, yesterday)),
    older: chats.filter(c => new Date(c.updatedAt) < weekAgo),
  };
}
```

### ChatHeader Layout

```
Mobile:
┌──────────────────────────────────┐
│  ☰  │         Pierre         │ X │
└──────────────────────────────────┘

Desktop (floating panel):
┌──────────────────────────────────┐
│  ☰  │         Pierre         │ X │
└──────────────────────────────────┘
```

- Left: Hamburger menu icon (`Menu` from lucide) — toggles sidebar
- Center: "Pierre" (model name, always visible)
- Right: Close button (`X`) — closes the entire chat panel

### useSommelierChat Hook Changes

```typescript
// New state
const [activeChatId, setActiveChatId] = useState<number | null>(null);

// New query: chat list (for sidebar)
const { data: chatList } = useQuery({
  queryKey: ["/api/sommelier-chat/list"],
  enabled: isOpen,
  staleTime: 10000,
});

// Modified: load specific chat
const loadChat = useCallback(async (chatId: number) => {
  const res = await fetch(`/api/sommelier-chat/${chatId}`, { credentials: "include" });
  const data = await res.json();
  setMessages(data.messages);
  setActiveChatId(chatId);
}, []);

// New: delete chat
const deleteChat = useCallback(async (chatId: number) => {
  await fetch(`/api/sommelier-chat/${chatId}`, { method: "DELETE", credentials: "include" });
  queryClient.invalidateQueries({ queryKey: ["/api/sommelier-chat/list"] });
  if (chatId === activeChatId) {
    // Deleted current chat — start fresh
    setMessages([]);
    setActiveChatId(null);
  }
}, [activeChatId, queryClient]);

// Modified: startNewChat now just resets local state
const startNewChat = useCallback(() => {
  setMessages([]);
  setActiveChatId(null);
}, []);
```

### Empty Chat Lifecycle

```
FAB tap → new empty chat (local state only, no DB record)
         │
         ├─ User sends message → POST /message creates chat + message in DB
         │                        Chat appears in history with auto-title
         │
         ├─ User opens sidebar → Empty chat has no ID, not in history list
         │   └─ Taps old chat → Empty chat discarded, old chat loaded
         │
         └─ User closes Pierre → Empty chat gone (never persisted)
```

This is the key insight: **don't create the DB record until the first message**. The `/active` endpoint currently creates a record eagerly — we change it to only create on first message send.

## Implementation Phases

### Phase 1: Backend — New Endpoints + Modified Behavior

- [x] Add `getUserSommelierChats()` to storage
- [x] Add `getSommelierChatById()` to storage
- [x] Add `deleteSommelierChat()` to storage
- [x] Add `GET /api/sommelier-chat/list` endpoint
- [x] Add `GET /api/sommelier-chat/:chatId` endpoint
- [x] Add `DELETE /api/sommelier-chat/:chatId` endpoint
- [x] Modify `POST /message` to auto-create chat on first message + set title
- [x] Modify `GET /active` to return empty state (no eager DB creation)

### Phase 2: Hook — Chat List + Load + Delete

- [x] Add `chatList` query to `useSommelierChat`
- [x] Add `loadChat(chatId)` method
- [x] Add `deleteChat(chatId)` method
- [x] Modify `startNewChat()` to reset local state only
- [x] Modify `sendMessage()` to create chat on first message if no activeChatId
- [x] Invalidate chat list after sending first message

### Phase 3: UI — Sidebar + Header Redesign

- [x] Create `ChatHistorySidebar.tsx` with time-grouped chat list
- [x] Mobile: left-side drawer (vaul or custom) with backdrop
- [x] Desktop: animated slide-in panel from left
- [x] Chat item: title, message count, relative timestamp
- [x] Active chat highlight
- [x] "New chat" button at top of sidebar
- [x] Swipe-to-delete (mobile), hover trash (desktop)
- [x] Delete confirmation
- [x] Empty state: "No previous conversations"
- [x] Redesign `ChatHeader.tsx`: hamburger left, "Pierre" center, X right
- [x] Wire sidebar toggle to header hamburger button
- [x] Update `SommelierChatSheet.tsx` to include sidebar state

### Phase 4: Polish

- [x] Smooth transitions between chats (fade)
- [x] Loading state while fetching a chat from history
- [x] Sidebar skeleton loader while fetching chat list
- [x] Handle edge case: delete currently active chat → reset to new
- [x] Verify mobile touch targets (44px minimum)
- [ ] Test: open Pierre → send message → close → reopen → history shows it
- [ ] Test: open Pierre → open sidebar → tap old chat → conversation loads
- [ ] Test: swipe to delete → confirmation → chat removed from list

## Files Summary

### New Files (1)

| File | Purpose |
|------|---------|
| `client/src/components/sommelier/ChatHistorySidebar.tsx` | Left sidebar with time-grouped chat history |

### Modified Files (5)

| File | Change |
|------|--------|
| `client/src/components/sommelier/ChatHeader.tsx` | Hamburger + "Pierre" + X layout |
| `client/src/components/sommelier/SommelierChatSheet.tsx` | Add sidebar state + render sidebar |
| `client/src/hooks/useSommelierChat.ts` | Add chatList query, loadChat, deleteChat |
| `server/routes/sommelier-chat.ts` | Add list, get-by-id, delete endpoints; modify active/message |
| `server/storage.ts` | Add getUserSommelierChats, getSommelierChatById, deleteSommelierChat |

### No New Dependencies

All UI built with existing: vaul (drawer), framer-motion (animations), lucide-react (icons), TanStack Query.

## Existing Code to Reuse

| What | Where |
|------|-------|
| Drawer component | `client/src/components/ui/drawer.tsx` |
| useIsMobile hook | `client/src/hooks/use-mobile.tsx` |
| Time formatting | Can use `date-fns` if installed, otherwise simple relative time helper |
| Chat CRUD patterns | Existing storage methods in `server/storage.ts` |
| SSE streaming | Unchanged — works with any active chat |
| Rate limiter | Existing `sommelierChatRateLimit` applies to new endpoints |

## v1 Scope Boundaries

**In scope:**
- Sidebar with time-grouped chat history
- Load and continue old conversations
- Delete chats (swipe/hover)
- Auto-title from first message
- Empty chat lifecycle (no DB pollution)
- Responsive (mobile drawer + desktop panel)

**Out of scope (future):**
- Search/filter chat history
- Manual chat renaming
- Chat sharing/export
- Pagination/infinite scroll (not needed until 100+ chats)
- Keyboard shortcuts for sidebar

## Verification

1. Open Pierre → see welcome state (no DB record created yet)
2. Send a message → chat created in DB, title auto-set from first message
3. Close Pierre → reopen → new empty chat, sidebar has previous conversation
4. Open sidebar → see "Today" group with previous chat
5. Tap previous chat → loads conversation, can continue chatting
6. Swipe to delete a chat → confirmation → removed from list
7. Delete currently active chat → resets to fresh new chat
8. First-time user → sidebar shows "No previous conversations"
9. Desktop: floating panel + slide-in sidebar from left
10. Mobile: bottom drawer + left-side drawer for sidebar
