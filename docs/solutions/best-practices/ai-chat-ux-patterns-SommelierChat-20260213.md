---
module: Sommelier Chat
date: 2026-02-13
problem_type: best_practice
component: assistant
symptoms:
  - "FAB with plain wine glass icon not recognized as AI chat entry point"
  - "Generic welcome copy (Hi, I'm your sommelier) fails to engage users"
  - "Full-screen chat sheet feels abrasive on desktop"
  - "Camera/vision capability hidden in small input bar icon"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags: [ai-chat, sse-streaming, fab-design, system-prompt, vision, responsive-ui, onboarding-copy]
---

# Best Practice: AI Chat UX Patterns (Pierre Sommelier)

## Problem

Building a conversational AI feature (Pierre, the AI sommelier) that is discoverable, engaging on first open, and works well across desktop and mobile. The initial implementation was functional but had UX issues: the entry point wasn't recognizable, the welcome state was bland, the chat window was one-size-fits-all, and the key differentiator (photo/vision) was buried.

## Environment
- Stack: React + Express + TypeScript
- AI: OpenAI GPT-5.2 (chat + vision), GPT-5-mini (compaction)
- Streaming: SSE via Express + ReadableStream on client
- Date: 2026-02-13

## Key Patterns Discovered

### 1. FAB Design: Pill with Name > Plain Icon Circle

**Before (less discoverable):**
```tsx
// Circle with wine glass icon — users didn't recognize it as AI chat
<button className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-800">
  <Wine className="w-6 h-6 text-white" />
</button>
```

**After (immediately clear):**
```tsx
// Pill shape with custom icon + name — reads as "tap to chat with Pierre"
<button className="flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-gradient-to-br from-purple-600 to-purple-800">
  <PierreIcon className="w-6 h-6 text-white" />
  <span className="text-sm font-medium text-white">Pierre</span>
</button>
```

**Why:** A named AI with a visible label is immediately understood as a chat entry point. An abstract icon requires the user to guess. Naming the AI ("Pierre") creates personality before the user even opens the chat.

### 2. Welcome Copy: Chip & Dan Heath "Made to Stick" Principles

**Before (generic):**
```
"Hi, I'm your sommelier"
"Ask me anything about wine."
```

**After (unexpected + concrete):**
```
"I already know what you like."
"I've been paying attention to your tastings. Ask me anything — or show me what's in front of you."
```

**Suggested prompts — scenario-based, not generic:**
```
"I'm staring at a wine wall. Help me pick."          // Concrete situation
"What's a wine I'd love but haven't tried yet?"      // Personalized + surprising
"I'm cooking tonight — what should I open?"           // Practical + relatable
```

**Why:** The Heath brothers' SUCCES framework (Simple, Unexpected, Concrete, Credible, Emotional, Stories). "I already know what you like" breaks the pattern — the user expects a greeting, gets a statement that implies the AI has been paying attention. The suggested prompts put the user in a specific situation rather than asking them to think of a question.

### 3. Responsive Chat Container: Float on Desktop, Drawer on Mobile

**Pattern:**
```tsx
const isMobile = useIsMobile(); // 768px breakpoint

if (isMobile) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92vh]">
        <ChatContent {...props} />
      </DrawerContent>
    </Drawer>
  );
}

// Desktop: floating panel like Intercom/Drift
return (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed bottom-6 right-6 w-[400px] h-[600px] rounded-2xl shadow-2xl">
        <ChatContent {...props} />
      </motion.div>
    )}
  </AnimatePresence>
);
```

**Why:** Full-screen drawers feel native on mobile (WhatsApp, iMessage pattern) but feel "abrasive" on desktop where the user has more screen real estate. A floating panel (400x600px, anchored bottom-right) is the standard desktop chat widget pattern and lets the user see their content behind it.

**Key detail:** Extract `ChatContent` as a shared component so both containers render identical content without duplication.

### 4. Vision/Camera: Must Be the Hero CTA, Not Buried

**Before:** Small camera icon in the input bar (easily missed).

**After:** Prominent card in welcome state with its own file input:
```tsx
<motion.button
  onClick={() => fileInputRef.current?.click()}
  className="w-full max-w-sm flex items-center gap-4 px-5 py-4 rounded-2xl
             bg-gradient-to-r from-purple-600/20 to-purple-500/10
             border border-purple-500/30"
>
  <div className="w-11 h-11 rounded-xl bg-purple-600/30 flex items-center justify-center">
    <Camera className="w-5 h-5 text-purple-300" />
  </div>
  <div>
    <span className="text-sm font-medium text-white">Snap a wine list or shelf</span>
    <span className="text-xs text-zinc-400">I'll pick the best one for you</span>
  </div>
</motion.button>
```

**Why:** The photo/vision capability is the unique differentiator — it's the reason someone opens the chat instead of googling. If it's just a small icon in the input bar, most users will never discover it. Making it a visually distinct hero card in the welcome state ensures every user sees it on first open.

### 5. System Prompt: Named Character with Backstory > Generic Assistant

**Before:**
```
You are Cata, a warm and knowledgeable AI sommelier.
```

**After:**
```
You are Pierre, the personal AI sommelier inside the Cata wine tasting app.

About you:
- You're like that friend who worked a harvest in Burgundy and never quite came back
- "You'd love this" beats "I recommend this varietal"
- You've studied every wine this person has tasted
- Be the sommelier who leans in and says three perfect sentences, not the one who recites a textbook

Meeting people where they're at:
- If someone is new to wine, skip the jargon
- If they're experienced, match their level
- Celebrate what they already know
```

**Why:** A character with a name, backstory, and voice produces noticeably better responses than a generic "helpful assistant" prompt. The specific instruction "three perfect sentences, not a textbook" directly shapes response length and quality. The "meeting people where they're at" section adapts tone to user experience level.

### 6. SSE Streaming Architecture

**Server (Express):**
```typescript
async function* generateSSE(): AsyncIterable<string> {
  yield `data: ${JSON.stringify({ type: "start", messageId })}\n\n`;
  for await (const chunk of openaiStream) {
    yield `data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`;
  }
  yield `data: ${JSON.stringify({ type: "done", messageId, fullContent })}\n\n`;
  yield `data: [DONE]\n\n`;
}
```

**Client (React hook):**
```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // Keep incomplete line in buffer
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    // Parse and handle event...
  }
}
```

**Key gotcha:** Always buffer incomplete lines. SSE chunks can split mid-line across reads. The `buffer = lines.pop() || ""` pattern handles this.

### 7. Conversation Compaction

**Pattern:** After every assistant response, check if uncompacted messages > threshold (10). If so, async-summarize older messages into `chat.summary` using a cheaper model (gpt-5-mini).

**What gets sent each turn:**
```
[system prompt + personality + user context + conversation summary]
[last 10 uncompacted messages verbatim]
[new user message]
```

**Why async:** Compaction runs fire-and-forget after the response. It doesn't block the user's next message. The `triggerCompactionIfNeeded()` function wraps the work in a `.catch()` so failures are logged but don't affect the chat.

## Prevention

When building AI chat features in Cata or similar apps:

- **Always name the AI** — a character with a name is more engaging than "AI Assistant"
- **Make the primary action unmissable** in the welcome state — don't rely on small icons
- **Use responsive containers** — mobile drawer + desktop floating panel
- **Write prompts as character direction**, not capability lists
- **Apply Made to Stick principles** to onboarding copy (unexpected, concrete, emotional)
- **Buffer SSE chunks** — never assume a read boundary aligns with a line boundary
- **Run compaction async** — never block the user's next message on summarization

## Files Reference

| File | Purpose |
|------|---------|
| `client/src/components/sommelier/SommelierFAB.tsx` | Pierre pill FAB with custom icon |
| `client/src/components/sommelier/SommelierChatSheet.tsx` | Responsive container + welcome state |
| `client/src/components/sommelier/ChatInput.tsx` | Input with camera button |
| `client/src/hooks/useSommelierChat.ts` | Chat state + SSE parsing |
| `server/services/sommelierChatService.ts` | Streaming chat service |
| `server/services/sommelierContextBuilder.ts` | User context assembly |
| `server/services/chatCompactionService.ts` | Rolling summary compaction |
| `prompts/sommelier_chat.txt` | Pierre personality prompt |

## Related Issues

No related issues documented yet.
