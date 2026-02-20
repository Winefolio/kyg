---
title: "feat: Enhanced Onboarding with Pierre Tutorial Handoff"
type: feat
date: 2026-02-17
---

# Enhanced Onboarding with Pierre Tutorial Handoff

## Overview

The current onboarding (3 quick quiz screens) collects basic preferences but fails at the critical job: **teaching users what they can do in the app**. The #1 feedback from early users is "I didn't know what to do when I got in." This plan enhances the quiz to feel more personalized and adds a Pierre welcome message that serves as an interactive app tutorial with hot links.

## Problem Statement

1. **Quiz is too thin** — 3 taps and you're done. Doesn't feel like the app is getting to know you.
2. **No escape hatches** — Every question forces a wine-specific answer. New users who don't know wine feel pressured.
3. **No palate discovery** — We only ask about wine and food, missing an opportunity to understand taste preferences through non-wine drinks they already know.
4. **Pierre handoff is broken** — After the quiz, Pierre auto-opens but shows the generic `WelcomeState` (camera CTA + 2 suggested prompts). There's no personalized first message, no mention of quiz answers, no app orientation.
5. **No app tour** — Users land on `/home` with no guidance on what to do first. The three pillars (Solo, Group, Dashboard) go unexplained.

## Proposed Solution

### Part 1: Richer Quiz (5 screens instead of 3)

**Screen 1: Wine Knowledge** (existing, modified)
- Add "Not sure yet" option with shrug emoji
- Keep auto-advance behavior

**Screen 2: Wine Style** (existing, modified)
- Add "Not sure yet" option
- Keep auto-advance behavior

**Screen 3: "What flavors do you reach for?"** (existing food screen, reframed)
- Change title: "What do you love to eat?" → **"What flavors do you reach for?"**
- Change subtitle: "Pick all that apply — helps us pair wines" → **"Your food taste tells us a lot about wines you'll love"**
- Add 3 more options: "Chocolate/Desserts", "Fresh/Salads", "Comfort Food"
- Allow 0 selections (remove the min-1 requirement, make Continue button always enabled)

**Screen 4: "What do you usually drink?"** (NEW)
- Title: **"What do you usually drink?"**
- Subtitle: **"This tells us more about your palate than you'd think"**
- Multi-select grid (same layout as food), options:
  - Coffee (black), Iced Latte, Tea, Sparkling Water, Apple Juice, Lemonade, Cola, Kombucha
- Allow 0 selections (skip-friendly)
- These map to wine palate profiles in the context builder (see backend section)

**Screen 5: "What brings you here?"** (NEW)
- Title: **"What brings you here?"**
- Subtitle: **"Helps Pierre give you the right kind of advice"**
- Single-select with "Not sure yet" option:
  - "Learning for fun" — I just want to know more about wine
  - "Finding my go-to bottle" — I want a reliable everyday pick
  - "Impressing at dinners" — I want to sound smart at restaurants
  - "Date night picks" — I need wine for special occasions
  - "Not sure yet" — I'm just exploring

### Part 2: Pierre Welcome Message (the tutorial)

After quiz completion, instead of showing the generic `WelcomeState`:

1. **Inject a synthetic assistant message** into `useSommelierChat` state when opened via `?pierre=welcome`
2. This message is **not an API call** — it's a pre-built markdown string assembled client-side from the user's quiz answers
3. The message contains **hot links** (in-app markdown links that trigger SPA navigation)

**Example welcome message** (for a user who picked: casual knowledge, bold wines, Italian food, black coffee, "finding my go-to bottle"):

> Hey! I'm Pierre, your personal wine guide. You like bold flavors and Italian food? We're going to get along.
>
> Cata isn't a wine textbook — it's about discovering what **you** like. Here's how:
>
> - **[Taste a wine](/tasting/new)** — snap any bottle, then answer a few fun questions about what you're tasting. Our system learns what you love (and what you don't) to make better picks for you over time.
> - **[Learning Journeys](/journeys)** — guided tastings that build your palate step by step. Each journey is a few wines with questions designed by a sommelier.
> - **[Group tastings](/home/group)** — host a tasting night with friends. Pick a curated set of wines, everyone tastes together, and you compare notes live.
> - **[Your taste profile](/home/dashboard)** — watch your palate evolve as you taste more. The more you drink, the smarter your recommendations get.
>
> Since you want to find a go-to bottle, I'd start by **[tasting whatever you're drinking right now](/tasting/new)** — even if it's just Tuesday night wine. That's how we start learning what clicks for you.
>
> Or just ask me anything. What sounds good?

### Part 3: Hot Links in Pierre's Messages

`ChatMessage.tsx` renders assistant messages via `ReactMarkdown`. Standard `[text](url)` links render as `<a href>` which causes full page reloads. We need to intercept internal links and use wouter's `setLocation()` for SPA navigation.

## Technical Approach

### Files to Modify

| File | Change |
|---|---|
| `client/src/pages/OnboardingQuiz.tsx` | Add 2 new screens, "Not sure" options, reframe food screen |
| `shared/schema.ts` | Extend `OnboardingData` with `drinkPreferences`, `occasion`, and `not_sure` enum values |
| `server/routes/user.ts` | Update Zod schema to accept new fields and "not_sure" values |
| `server/services/sommelierContextBuilder.ts` | Add drink→palate mapping, occasion context |
| `client/src/components/sommelier/ChatMessage.tsx` | Override ReactMarkdown `a` component for SPA navigation |
| `client/src/components/sommelier/SommelierChatSheet.tsx` | Replace `WelcomeState` with welcome message when `pierre=welcome` |
| `client/src/hooks/useSommelierChat.ts` | Accept optional initial message, expose `setMessages` or inject mechanism |

### Implementation Details

#### A. Quiz Enhancements (`OnboardingQuiz.tsx`)

Extend the `QuizStep` type:
```typescript
type QuizStep = "knowledge" | "vibe" | "food" | "drinks" | "occasion";
```

Add `not_sure` to single-select option arrays. Add new `DRINK_OPTIONS` and `OCCASION_OPTIONS` arrays. The `StepHeader` reads `totalSteps` from the array length so the progress bar auto-updates.

Extend `QuizAnswers`:
```typescript
interface QuizAnswers {
  knowledgeLevel: string | null;
  wineVibe: string | null;
  foodPreferences: string[];
  drinkPreferences: string[];
  occasion: string | null;
}
```

#### B. Schema Changes (`shared/schema.ts`)

```typescript
export interface OnboardingData {
  knowledgeLevel: 'beginner' | 'casual' | 'enthusiast' | 'nerd' | 'not_sure';
  wineVibe: 'bold' | 'light' | 'sweet' | 'adventurous' | 'not_sure';
  foodPreferences: string[];
  drinkPreferences: string[];
  occasion: 'learning' | 'go_to_bottle' | 'impress' | 'date_night' | 'not_sure';
  completedAt: string;
}
```

#### C. Zod Validation (`server/routes/user.ts`)

Update `onboardingSchema` to accept new fields:
```typescript
const onboardingSchema = z.object({
  knowledgeLevel: z.enum(['beginner', 'casual', 'enthusiast', 'nerd', 'not_sure']),
  wineVibe: z.enum(['bold', 'light', 'sweet', 'adventurous', 'not_sure']),
  foodPreferences: z.array(z.string()).max(15),  // remove .min(1)
  drinkPreferences: z.array(z.string()).max(10),
  occasion: z.enum(['learning', 'go_to_bottle', 'impress', 'date_night', 'not_sure']),
});
```

#### D. Drink-to-Palate Mapping (`sommelierContextBuilder.ts`)

```typescript
const drinkPalateMap: Record<string, string> = {
  black_coffee: "tolerates bitterness — likely enjoys tannic reds",
  iced_latte: "likes creamy, smooth textures — try oaked Chardonnay",
  tea: "appreciates delicate flavors — lighter wines, Pinot Noir",
  sparkling_water: "enjoys acidity and fizz — sparkling wines, Sauvignon Blanc",
  apple_juice: "prefers sweetness — Moscato, off-dry Riesling",
  lemonade: "likes tart + sweet balance — crisp whites, Vinho Verde",
  cola: "sweet + bold — fruit-forward Zinfandel, Malbec",
  kombucha: "open to funky/sour — natural wines, orange wines",
};
```

Add to Pierre's context: `"Based on drink preferences (coffee, sparkling water): likely enjoys bitterness + acidity → try Barolo, Chablis"`

#### E. Hot Links in Chat (`ChatMessage.tsx`)

Add a custom `components` prop to `ReactMarkdown`:
```tsx
// In ChatMessage.tsx
import { useLocation } from "wouter";

const [, setLocation] = useLocation();

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    a: ({ href, children }) => {
      if (href?.startsWith("/")) {
        return (
          <button
            onClick={() => {
              onClose?.();  // close Pierre drawer
              setLocation(href);
            }}
            className="text-purple-400 underline hover:text-purple-300 cursor-pointer"
          >
            {children}
          </button>
        );
      }
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  }}
>
```

**Important**: When a user taps an in-app link, Pierre's drawer should close first, then navigate. This prevents the drawer from floating over the destination page.

Pass an `onClose` callback from `SommelierChatSheet` → `MessageList` → `ChatMessage`.

#### F. Welcome Message Injection (`SommelierChatSheet.tsx` + `useSommelierChat.ts`)

When Pierre opens via `?pierre=welcome`:

1. `SommelierChatSheet` detects the URL param
2. Instead of showing `WelcomeState`, it calls a `injectWelcomeMessage(onboardingData)` function
3. This builds a markdown string from the user's quiz answers and injects it as a synthetic `ChatMessage` with `role: "assistant"` and a special `id: -2` (to distinguish from streamed messages)
4. The message is **local-only** — not persisted to the database
5. Once the user sends their first real message, the welcome message stays in the UI but the API call creates a new chat normally

Build the welcome message client-side using a template function:
```typescript
function buildWelcomeMessage(data: OnboardingData): string {
  // Personalized opening based on quiz answers
  // Feature links with markdown [text](/route) format
  // Recommendation based on occasion
  // Closing prompt
}
```

#### G. WelcomeState Replacement Logic

In `SommelierChatSheet.tsx`, the current logic:
```typescript
const showWelcome = !isLoading && !isLoadingChat && messages.length === 0;
```

Change to: if `?pierre=welcome` is in the URL AND `messages.length === 0`, inject the welcome message instead of showing `WelcomeState`. The `WelcomeState` component still shows for returning users who open Pierre normally (no URL param, empty chat).

## Acceptance Criteria

### Quiz
- [ ] Every single-select question has a "Not sure yet" option
- [ ] Food screen reframed with new title/subtitle and 3 additional options
- [ ] Food and drinks screens allow 0 selections (skip-friendly)
- [ ] New "drinks" screen with 8 non-alcoholic options, multi-select grid
- [ ] New "occasion" screen with 5 options + "Not sure yet", single-select
- [ ] Progress bar shows 5 steps, back navigation works across all
- [ ] All "Not sure" selections save correctly and don't break context builder

### Pierre Welcome
- [ ] After completing quiz, Pierre opens with a personalized first message (not generic WelcomeState)
- [ ] Welcome message references at least one quiz answer specifically
- [ ] Welcome message contains 3-4 hot links to app features
- [ ] Hot links trigger SPA navigation (no full page reload)
- [ ] Clicking a hot link closes the Pierre drawer, then navigates
- [ ] Welcome message recommends a starting point based on occasion answer
- [ ] If user selected "Not sure" for everything, welcome message is still warm and helpful

### Hot Links (all Pierre messages, not just welcome)
- [ ] Internal links (`/journeys`, `/tasting/new`, etc.) use wouter navigation
- [ ] External links open in new tab
- [ ] Links are visually styled (purple, underlined) consistent with chat theme

### Backend
- [ ] `OnboardingData` schema extended with `drinkPreferences`, `occasion`
- [ ] Zod validation accepts new fields and "not_sure" values
- [ ] Context builder includes drink-to-palate mapping in Pierre's system prompt
- [ ] Context builder includes occasion for recommendation framing
- [ ] Skip flow still works (saves `onboardingCompleted: true` with no data)

## Edge Cases

- **User picks "Not sure" for everything**: Welcome message should still be warm and orient them to the app. "No worries — that's literally what Cata is for. The best way to figure out what you like is to **[taste whatever you're drinking right now](/tasting/new)** — just snap the bottle and answer a few questions. I'll start learning your palate from there. You can also **[browse Learning Journeys](/journeys)** if you want a guided starting point, or **[host a group tasting](/home/group)** with friends."
- **User skips onboarding entirely**: No welcome message. Regular `WelcomeState` shows.
- **User closes Pierre immediately after it auto-opens**: Welcome message stays in local state. If they reopen Pierre later (without `?pierre=welcome`), they see the regular `WelcomeState` for a new chat. The welcome message was ephemeral.
- **5 screens on mobile**: Keep each screen scrollable. The food/drinks grids (2-column) fit well on mobile. Single-select screens are already compact.
- **Hot link to `/journeys` when no journeys exist**: The JourneyBrowser page handles empty state already. No special handling needed.

## Dependencies

- Existing `feat/onboarding-flow` branch (PR #14) — this plan builds on that work
- No new dependencies needed

## References

- Current onboarding: `client/src/pages/OnboardingQuiz.tsx`
- Chat message rendering: `client/src/components/sommelier/ChatMessage.tsx:35-38`
- Chat hook (message state): `client/src/hooks/useSommelierChat.ts:26`
- Welcome state component: `client/src/components/sommelier/SommelierChatSheet.tsx:22-87`
- Pierre personality prompt: `prompts/sommelier_chat.txt`
- Context builder: `server/services/sommelierContextBuilder.ts`
- Onboarding API: `server/routes/user.ts`
- Schema: `shared/schema.ts:726-731`
- Existing learnings: `docs/solutions/best-practices/ai-chat-ux-patterns-SommelierChat-20260213.md`
- State preservation patterns: `docs/solutions/ui-bugs/state-loss-accidental-dismiss-pierre-chat-20260215.md`
