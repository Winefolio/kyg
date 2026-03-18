# Institutional Learnings: Question Generation & Learning Journeys

## Research Date
2026-02-20

## Search Scope
Institutional knowledge from KYG documentation covering:
- Question generation for wine tastings
- Solo tasting flow and user experience
- Learning journey features
- User preference discovery and onboarding
- Wine characteristic assessment
- AI-driven personalization

---

## Critical Learnings

### 1. Silent Data Loss Chain in Solo Tastings (CRITICAL)

**File**: `/Users/andreszubillaga/kyg-dev/docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md`

**Module**: Solo Tastings
**Severity**: CRITICAL
**Date Fixed**: 2026-02-15

#### The Problem
Users complete solo tastings but data vanishes. The bug chain masks itself:
1. Session store wipes on deploy → 401 errors
2. Auth fallback masks 401s → UI still feels logged in
3. Save error handler shows fake success → data loss hidden from user
4. Stale cache (5-minute `staleTime`) → saved tastings invisible even after success
5. AI question section mapping broken → answers silently dropped

#### Key Prevention Insights for Question Generation

1. **NEVER fake success on error** — especially for data saves
   - Old code showed "Your tasting notes have been saved" even on failed API calls
   - Comment said "Still mark as complete so user isn't stuck"
   - This creates the worst outcome: user thinks data is saved and leaves
   - **Pattern**: Always show error with retry button, never fake completion

2. **AI-generated categories must map explicitly to your schema**
   ```typescript
   // WRONG: Assume AI categories align with your data keys
   // AI returns: {fruit, secondary, tertiary, body, acidity}
   // Schema has: {visual, aroma, taste, structure, overall}
   // Result: silent data loss for unmapped answers

   // RIGHT: Add explicit mapping layer
   const sectionToResponseKey: Record<string, keyof TastingResponses> = {
     visual: "visual", aroma: "aroma", taste: "taste",
     structure: "structure", overall: "overall",
     fruit: "aroma", secondary: "aroma", tertiary: "aroma",
     body: "structure", acidity: "structure",
   };
   ```

3. **Don't rate-limit save endpoints**
   - Rate limiter was on save because it triggers background AI jobs
   - This intermittently blocked saves (~10 req/min limit)
   - **Pattern**: Rate-limit the expensive downstream operations separately, never the save itself

4. **Always invalidate TanStack Query cache after mutations**
   ```typescript
   onSuccess: (data) => {
     queryClient.invalidateQueries({ queryKey: ["/api/solo/tastings"] });
     queryClient.invalidateQueries({ queryKey: ["/api/solo/preferences"] });
     queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
     setIsComplete(true);
   },
   ```
   - The default 5-minute `staleTime` means saved data won't appear for 5 minutes without invalidation
   - Every mutation that writes data must invalidate all queries reading that data

5. **Use persistent session stores in production**
   - Never use `MemoryStore` in production (Express default)
   - Every Railway deploy wipes all sessions
   - Always use `connect-pg-simple` with PostgreSQL backing
   - Use `createTableIfMissing: true` for zero-config setup

#### Relevant Files Modified
- `server/index.ts` - Session store persistence
- `server/routes/tastings.ts` - Remove rate limiter from save
- `client/src/pages/SoloTastingSession.tsx` - Error handling, cache invalidation, section mapping
- `client/src/hooks/useAuth.ts` - Remove localStorage fallback ghost sessions

---

### 2. AI Chat UX Patterns — Character Design Drives Engagement

**File**: `/Users/andreszubillaga/kyg-dev/docs/solutions/best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md`

**Module**: Sommelier Chat (Pierre AI)
**Severity**: HIGH
**Date**: 2026-02-13

#### Key Patterns for Conversational Features

1. **Named Character > Generic Assistant**
   - System prompt with personality and backstory drives engagement
   - "Pierre, the personal AI sommelier who worked a harvest in Burgundy"
   - Specific voice guidance: "three perfect sentences, not a textbook"
   - Instruction to meet users where they are (new vs. experienced)
   - **Pattern**: Generic "helpful assistant" produces generic responses

2. **Discoverable Entry Point: Pill with Name > Icon-Only Circle**
   ```tsx
   // WRONG: Plain icon, not recognized as AI entry point
   <button className="w-14 h-14 rounded-full">
     <Wine className="w-6 h-6" />
   </button>

   // RIGHT: Pill shape with name makes the affordance obvious
   <button className="flex items-center gap-2 px-4 py-2.5 rounded-full">
     <PierreIcon className="w-6 h-6" />
     <span className="text-sm font-medium">Pierre</span>
   </button>
   ```

3. **Welcome Copy Must Use "Made to Stick" Principles**
   - **Unexpected**: "I already know what you like" breaks the pattern of a generic greeting
   - **Concrete**: Specific scenario-based prompts, not generic questions
   - **Emotional**: Acknowledge user preferences, create sense of being understood

   Good examples:
   - "I'm staring at a wine wall. Help me pick." (concrete situation)
   - "What's a wine I'd love but haven't tried yet?" (personalized + surprising)
   - "I'm cooking tonight — what should I open?" (practical + relatable)

4. **Vision/Camera Feature Must Be Hero CTA, Not Hidden**
   - Don't bury photo capability in a small icon in the input bar
   - Make it a prominent card in welcome state with own file input
   - Use gradient border, large icon, clear value prop ("I'll pick the best one for you")
   - **Pattern**: Key differentiators must be immediately visible

5. **Responsive Container: Drawer on Mobile, Float on Desktop**
   ```tsx
   const isMobile = useIsMobile(); // 768px breakpoint

   if (isMobile) {
     // Full-screen drawer (WhatsApp pattern, feels native)
     return <Drawer><DrawerContent className="h-[92vh]" /></Drawer>;
   }

   // Desktop: floating panel (400x600px, bottom-right)
   // Lets user see content behind it
   return <motion.div className="fixed bottom-6 right-6 w-[400px]" />;
   ```

6. **SSE Streaming: Always Buffer Incomplete Lines**
   ```typescript
   let buffer = "";
   while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     buffer += decoder.decode(value, { stream: true });
     const lines = buffer.split("\n");
     buffer = lines.pop() || ""; // Keep incomplete line!
     // Parse complete lines only
   }
   ```
   - SSE chunks can split mid-line across reads
   - Always keep the last incomplete line in buffer for next read
   - Never assume a read boundary aligns with a line boundary

7. **Conversation Compaction: Async, Fire-and-Forget**
   - After each assistant response, check if uncompacted messages > 10
   - If so, async-summarize older messages using gpt-5-mini
   - **Never block the user's next message on compaction**
   - Failures are logged but don't affect chat
   - What gets sent each turn: [system prompt + context + summary + last 10 messages + new user message]

#### Relevant Files
- `client/src/components/sommelier/SommelierFAB.tsx` - Pill FAB design
- `client/src/components/sommelier/SommelierChatSheet.tsx` - Responsive container
- `client/src/components/sommelier/ChatInput.tsx` - Camera integration
- `client/src/hooks/useSommelierChat.ts` - SSE streaming
- `server/services/chatCompactionService.ts` - Conversation compaction

---

### 3. State Loss & Pierre Chat Stability

**File**: `/Users/andreszubillaga/kyg-dev/docs/solutions/ui-bugs/state-loss-accidental-dismiss-pierre-chat-20260215.md`

**Module**: Sommelier Chat
**Severity**: HIGH
**Date**: 2026-02-15

#### Key Patterns for Chat Reliability

1. **Drawer Dismiss Settings** (Vaul library)
   - Use `shouldScaleBackground={false}` to prevent scroll-triggered dismissal
   - Use `handleOnly={true}` to prevent drag-dismiss from content area
   - **Pattern**: Chat state is valuable, protect from accidental loss

2. **Persist Conversation State**
   - Don't reset to blank welcome screen on every reopen
   - Store messages in localStorage as backup
   - Restore on mount if available

3. **Failed Message Recovery**
   - Keep failed messages in UI with error indicator
   - Provide "Try Again" button that preserves all message state
   - Don't delete user-typed text on failed send

4. **Image Retry Handling**
   - When retrying a message with image attachment, preserve the image
   - Don't silently drop attachments on retry

---

### 4. Onboarding & Learning Journey Design

**File**: `/Users/andreszubillaga/kyg-dev/docs/plans/2026-02-17-feat-enhanced-onboarding-with-pierre-tutorial-plan.md`

**Type**: Feature Plan (In Progress)
**Date**: 2026-02-17

#### Problem Statement
Users report: "I didn't know what to do when I got in." The onboarding quiz is too thin and doesn't teach users what they can do.

#### Solution: Richer Quiz (5 screens) + Pierre Welcome Tutorial

**Quiz Screens** (order: 1-3 existing, 4-5 new):

1. **Wine Knowledge** (existing, add "Not sure yet")
   - Auto-advance on selection

2. **Wine Style** (existing, add "Not sure yet")
   - Auto-advance on selection

3. **"What flavors do you reach for?"** (reframed food screen)
   - Changed from "What do you love to eat?"
   - Add options: Chocolate/Desserts, Fresh/Salads, Comfort Food
   - Allow 0 selections (skip-friendly)

4. **"What do you usually drink?"** (NEW)
   - Reveals non-wine drink preferences (coffee, tea, juice, cola, kombucha)
   - Maps to wine palate profiles in context builder
   - Skip-friendly (0 selections allowed)
   - **Insight**: "This tells us more about your palate than you'd think"

5. **"What brings you here?"** (NEW)
   - Single-select occasion/goal:
     - Learning for fun
     - Finding my go-to bottle
     - Impressing at dinners
     - Date night picks
     - Not sure yet

#### Pierre Welcome Message (the Tutorial)

After quiz, instead of generic welcome state:

1. Inject synthetic assistant message from `?pierre=welcome` query param
2. Message assembled client-side from quiz answers (NOT an API call)
3. Contains **hot links** with in-app markdown that trigger SPA navigation
4. Educates user about: Solo Tastings, Learning Journeys, Group Tastings, Dashboard

**Example**:
```
Hey! I'm Pierre. You like bold flavors and Italian food? We're going to get along.

Cata isn't a wine textbook — it's about discovering what you like. Here's how:

- [Taste a wine](/tasting/new) — snap any bottle, answer questions about what you're tasting
- [Learning Journeys](/journeys) — guided tastings built by a sommelier
- [Group tastings](/home/group) — host a tasting night with friends
- [Your taste profile](/home/dashboard) — watch your palate evolve

Since you want to find a go-to bottle, I'd start by [tasting whatever you're drinking right now](/tasting/new).

Or just ask me anything. What sounds good?
```

#### Hot Links in Chat

Override ReactMarkdown `<a>` component to use wouter's `setLocation()` for SPA navigation instead of full page reloads.

#### Relevant Implementation Changes
- `client/src/pages/OnboardingQuiz.tsx` - 2 new screens, "Not sure" options
- `shared/schema.ts` - Extended OnboardingData
- `server/services/sommelierContextBuilder.ts` - Drink→palate mapping
- `client/src/components/sommelier/ChatMessage.tsx` - Override `<a>` rendering for SPA links
- `client/src/hooks/useSommelierChat.ts` - Accept optional initial message injection

---

## Architecture & Data Flow

### Solo Tasting Flow
```
User snaps wine → Wine validation & characteristics lookup
                → AI question generation based on wine + preferences
                → Multi-section tasting (visual, aroma, taste, structure, overall)
                → Save responses → Cache invalidation
                → Add to user dashboard & learning journey
```

### Question Mapping Pattern
When AI generates questions with custom categories, always map to your schema:

```typescript
// Input from AI: {fruit, body, acidity, secondary, ...}
// Target schema: {visual, aroma, taste, structure, overall}
// Mapping: fruit/secondary/tertiary → aroma, body → structure, etc.
```

### Chat Architecture
```
User message → SSE stream from GPT-5.2
           → Buffer incomplete SSE chunks
           → Render tokens as they arrive
           → Save to conversation
           → Check if compaction needed
           → Async summarize old messages if > 10
```

---

## Deployment Considerations

### Session Persistence
- **Never** use Express default `MemoryStore`
- **Always** use PostgreSQL-backed sessions with `connect-pg-simple`
- Railway deploys restart the process, wiping in-memory sessions
- Users get silent 401s after deploy unless session store is persistent

### Cache Invalidation Strategy
- Set `staleTime: 5 * 60 * 1000` (5 minutes) for solo tasting queries
- After every mutation, invalidate all affected query keys
- Failing to invalidate means data appears after 5-minute stale period

---

## Prevention Checklist

When implementing question generation or learning journeys:

- [ ] **Data saves**: Never fake success. Show error with retry button.
- [ ] **AI categories**: Add explicit mapping if AI output doesn't match schema keys.
- [ ] **Rate limiting**: Never rate-limit save endpoints. Rate-limit expensive operations downstream.
- [ ] **Cache**: Always invalidate TanStack Query after mutations.
- [ ] **Sessions**: Use `connect-pg-simple` in production.
- [ ] **Chat UX**: Name the AI, make vision/photo a hero CTA, use responsive containers.
- [ ] **Chat state**: Persist on close, recover on reopen, keep failed messages visible.
- [ ] **SSE streaming**: Buffer incomplete lines, handle mid-line splits.
- [ ] **Onboarding**: Skip-friendly (allow 0 selections), use Made to Stick copy, add Pierre tutorial.
- [ ] **Hot links**: Override markdown `<a>` for SPA navigation, don't trigger full reloads.

---

## Related Documents

- **Architecture**: `/Users/andreszubillaga/kyg-dev/docs/architecture/multi-wine-system.md`
- **Roadmap**: `/Users/andreszubillaga/kyg-dev/docs/roadmap/immediate-priorities.md`
- **Current Issues**: `/Users/andreszubillaga/kyg-dev/docs/issues/current-issues.md`
- **CLAUDE.md**: `/Users/andreszubillaga/kyg-dev/CLAUDE.md` - Tech stack, patterns, API conventions

---

## Implementation Status

### Completed (Sprint 4.1 - 2026-02-16)
- Solo tasting save chain fixes (6 bugs, all fixed)
- Pierre chat stability (state persistence, dismiss handling)
- AI chat UX patterns (FAB design, welcome copy, responsive container)

### In Progress (Sprint 5 - Started 2026-02-17)
- Enhanced onboarding with 5-screen quiz
- Pierre welcome tutorial with hot links
- Drink preference mapping to palate profiles

### Not Yet Started
- Advanced question templates
- Wine characteristic assessment UI
- Learning journey personalization

---

## Quick Links to Code

**Question Generation Service**:
- Server: `server/services/questionGenerator.ts`
- Routes: `server/routes/tastings.ts` - Solo tasting endpoints

**Solo Tasting UI**:
- `client/src/pages/SoloTastingSession.tsx`
- `client/src/pages/SoloTastingNew.tsx`
- Question components: `client/src/components/questions/`

**Pierre Chat**:
- `client/src/components/sommelier/` - All Pierre UI components
- `server/services/sommelierChatService.ts` - Streaming chat
- `server/services/sommelierContextBuilder.ts` - User context assembly

**Onboarding**:
- `client/src/pages/OnboardingQuiz.tsx`
- `shared/schema.ts` - OnboardingData schema

**Data Access**:
- `server/storage.ts` - All Drizzle queries
- `shared/schema.ts` - Database schema (single source of truth)
