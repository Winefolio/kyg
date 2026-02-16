---
module: Sommelier Chat
date: 2026-02-15
problem_type: ui_bug
component: assistant
symptoms:
  - "Pierre chat closes when scrolling through messages on mobile (swipe-to-dismiss triggers on content area)"
  - "Every close/reopen wipes conversation to blank welcome screen"
  - "Desktop: invisible full-screen div catches clicks and closes chat with no visual indication"
  - "Failed messages disappear from UI with only a small error banner"
  - "Retrying a failed image message silently drops the image attachment"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags: [drawer-dismiss, state-persistence, chat-stability, retry, error-recovery, vaul, handleOnly, image-retry]
files_modified:
  - client/src/hooks/useSommelierChat.ts
  - client/src/components/sommelier/SommelierChatSheet.tsx
  - client/src/components/sommelier/ChatMessage.tsx
  - client/src/components/sommelier/MessageList.tsx
related:
  - docs/solutions/best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md
  - docs/solutions/integration-issues/auth-chat-state-sync-race-condition-20260214.md
  - docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md
---

# Troubleshooting: State Loss and Accidental Dismiss in Pierre Chat

## Problem

Pierre chat sheet closes unexpectedly via accidental gestures, wipes conversation state on every reopen, and provides no recovery path for failed messages. Users experience conversations as "lost" even when messages are saved server-side, because the UI resets to a blank welcome screen every time.

## Environment
- Module: Sommelier Chat (Pierre)
- Stack: React + Vaul drawer + Framer Motion
- Affected Components: `SommelierChatSheet.tsx`, `useSommelierChat.ts`, `ChatMessage.tsx`, `MessageList.tsx`
- Date: 2026-02-15

## Symptoms
- Scrolling up through chat messages on mobile triggers drawer dismiss (swipe gesture)
- Accidental close + reopen = conversation gone (blank welcome screen)
- On desktop, clicking anywhere outside the chat panel closes it (invisible backdrop `div` at `z-40`)
- When a message fails to send, the user's typed text vanishes from the UI
- Retrying a failed image message only resends the text, silently dropping the image

## What Didn't Work

**Direct solution:** Bugs were identified through the plan at `docs/plans/2026-02-15-fix-solo-tasting-saves-pierre-stability-plan.md`. No false starts — fixes were clear once traced.

## Solution

Five fixes applied to make the chat feel stable and recoverable:

### Fix 1: Prevent Accidental Drawer Dismiss (`SommelierChatSheet.tsx`)

Vaul `Drawer` treated the entire content area as a swipe-to-dismiss target. Scrolling up through messages triggered close.

```tsx
// Before (broken): entire sheet is swipeable
<Drawer open={open} onOpenChange={onOpenChange}>

// After (fixed): only the drag handle triggers dismiss
<Drawer open={open} onOpenChange={onOpenChange} handleOnly>
```

The `handleOnly` prop restricts the dismiss gesture to the small drag handle at the top of the drawer. Users can scroll freely without accidentally closing the chat.

### Fix 2: Preserve Chat State Across Close/Reopen (`useSommelierChat.ts:51-57`)

The `useEffect` on `isOpen` wiped `messages`, `activeChatId`, and `error` every time the sheet opened. This meant any close (accidental or intentional) destroyed the conversation.

```typescript
// Before (broken): state wiped on every open
useEffect(() => {
  if (!isOpen) {
    setMessages([]);
    setActiveChatId(null);
    setError(null);
  }
}, [isOpen]);

// After (fixed): only abort active streams on close, preserve state
useEffect(() => {
  if (!isOpen) {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    abortControllerRef.current = null;
  }
}, [isOpen]);
```

State reset now only happens on explicit "New Chat" action (`startNewChat()`), not on every close. Reopening shows the last active conversation.

### Fix 3: Remove Invisible Desktop Backdrop (`SommelierChatSheet.tsx:276-282`)

A fully transparent full-screen `<div>` at `z-40` caught all clicks and closed the chat. No visual indication that clicking outside would dismiss the panel.

```tsx
// Before (broken): invisible click trap
{!isMobile && open && (
  <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
)}

// After (fixed): removed entirely — close via X button only
// (no invisible backdrop div)
```

### Fix 4: Keep Failed Messages with Retry (`useSommelierChat.ts:177-184`, `ChatMessage.tsx`)

On error, the optimistic user message was removed from the UI. The user's typed message vanished.

```typescript
// Before (broken): message removed on error
setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));

// After (fixed): message kept, marked as failed
setMessages(prev => prev
  .filter(m => m.id !== -1)  // Remove streaming placeholder
  .map(m => m.id === optimisticMsg.id ? { ...m, failed: true } : m)
);
```

Failed messages now show with a red indicator and "Tap to retry" button:

```tsx
{message.failed && onRetry && (
  <button onClick={() => onRetry(message.id)}
    className="flex items-center gap-1.5 mt-1.5 text-xs text-red-300 hover:text-white">
    <RotateCcw className="w-3 h-3" /> Tap to retry
  </button>
)}
```

### Fix 5: Handle Image Retry (`useSommelierChat.ts`)

`retryMessage` only called `sendMessage()` (text-only), silently dropping image attachments. Fixed by storing pending image files in a ref.

```typescript
// Store image when creating optimistic message
const pendingImageFiles = useRef<Map<number, File>>(new Map());

// In sendMessageWithImage:
pendingImageFiles.current.set(optimisticMsg.id, imageFile);

// Clear on success:
pendingImageFiles.current.delete(optimisticMsg.id);

// In retryMessage: check for pending image
const retryMessage = useCallback((messageId: number) => {
  const failedMsg = messages.find(m => m.id === messageId && m.failed);
  if (!failedMsg) return;
  setMessages(prev => prev.filter(m => m.id !== messageId));
  const pendingImage = pendingImageFiles.current.get(messageId);
  if (pendingImage) {
    pendingImageFiles.current.delete(messageId);
    sendMessageWithImage(failedMsg.content, pendingImage);
  } else {
    sendMessage(failedMsg.content);
  }
}, [messages, sendMessage, sendMessageWithImage]);
```

## Why This Works

The core problem was that every interaction path — accidental swipe, background click, network error — had the same outcome: conversation gone, no recovery. The fixes address each path:

1. **Swipe dismiss**: `handleOnly` restricts the gesture to the drag handle, matching the user's mental model ("I'm scrolling, not dismissing")
2. **State wipe**: Preserving state across close/reopen means accidental closes are harmless
3. **Invisible backdrop**: Removing it eliminates an undiscoverable dismiss zone
4. **Failed messages**: Keeping them visible with retry gives users confidence their input isn't lost
5. **Image retry**: Storing File objects in a ref ensures retry is lossless

## Prevention

1. **Vaul drawers with scrollable content must use `handleOnly`.** Without it, any upward scroll gesture in the content area triggers dismiss. This is the #1 mobile UX bug with Vaul.

2. **Never wipe UI state on panel close.** Close should pause/hide, not destroy. State reset belongs on explicit "New" actions only. Users expect panels to remember their last state (like minimizing a window).

3. **Invisible click targets are hostile UX.** If clicking somewhere dismisses content, the user must be able to see and expect that behavior. Either add a visible backdrop (`bg-black/10`) or don't have a dismiss zone at all.

4. **Failed messages must be visible with retry.** The worst UX for a chat app is "I typed something, it vanished, and I don't know what happened." Keep the message, mark it as failed, offer retry.

5. **Retry must be lossless.** If the original action included attachments (images, files), the retry must include them too. Store attachment references (in a ref, not state) keyed by optimistic message ID. Clean up on success.

## Related Issues

- See also: [AI Chat UX Patterns](../best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md) — Documents the responsive container pattern (drawer + floating panel) and SSE streaming architecture
- See also: [Auth state desync](../integration-issues/auth-chat-state-sync-race-condition-20260214.md) — Previous Pierre fix for auth desync and fire-and-forget title generation
- See also: [Silent data loss in solo tasting saves](../logic-errors/silent-data-loss-solo-tasting-saves-20260215.md) — Companion fix implemented in the same PR
