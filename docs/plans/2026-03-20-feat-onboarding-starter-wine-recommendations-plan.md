---
title: "feat: Onboarding-Based Starter Wine Recommendations"
type: feat
date: 2026-03-20
---

# Onboarding-Based Starter Wine Recommendations

## Context

New users complete a 5-step onboarding quiz but the data is never used beyond setting `tastingLevel`. The Solo tab shows a generic empty state ("Your journal awaits") with no actionable guidance. This feature uses onboarding answers + a new free-text "wines you've enjoyed" step to generate personalized starter wine picks via GPT-5.2, shown on the Solo tab until the user completes their first tasting.

## Overview

1. Add 6th onboarding step: free-text "Any wines you've enjoyed?" (skippable)
2. After onboarding, GPT-5.2 call generates 3-5 starter wine recommendations
3. Show "Your Starter Picks" cards on the Solo tab when `tastingsCompleted === 0`
4. Remove starter picks after 1 tasting; weight onboarding data in rec engine for tastings 1-3

## Proposed Solution

### Phase 1: Schema & Type Changes

**File: `shared/schema.ts`**

1. Add `favoriteWines` to `OnboardingData` interface (line 733):
```typescript
export interface OnboardingData {
  // ...existing fields...
  favoriteWines?: string;  // NEW: free-text, optional (skippable)
  completedAt: string;
}
```

2. Add `StarterRecommendation` interface (after `OnboardingData`):
```typescript
export interface StarterRecommendation {
  wineName: string;
  wineType: 'red' | 'white' | 'rosé' | 'sparkling' | 'orange' | 'dessert';
  grape: string;
  region: string;
  reason: string;  // 1 sentence connecting pick to user's answers
}
```

3. Add `starterRecommendations` column to `users` table (line ~662):
```typescript
starterRecommendations: jsonb("starter_recommendations"), // StarterRecommendation[] | null
```

4. Run `npm run db:push` to add the column (non-destructive, nullable JSONB).

### Phase 2: Onboarding Quiz — New Step 6

**File: `client/src/pages/OnboardingQuiz.tsx`**

1. Extend `QuizStep` type (line 14): add `"wines"` to the union
2. Extend `QuizAnswers` interface (line 16): add `favoriteWines: string` (init as `""`)
3. Add `"wines"` to `steps` array (line 423)
4. **Change occasion step (line 620-627)**: instead of `saveMutation.mutate(updated)`, advance to step 6:
```typescript
onSelect={(value) => {
  setAnswers(prev => ({ ...prev, occasion: value }));
  setTimeout(() => { setDirection(1); setStep("wines"); }, 300);
}}
```
5. Remove the `saveMutation.isPending` loader from occasion step (lines 631-635)
6. Add new step 6 block after occasion step:
   - Title: "Any wines you've enjoyed?"
   - Subtitle: "Even just names or colors — helps us pick your first wines."
   - `<textarea>` with placeholder, max 500 chars, character counter
   - "Get my picks" gradient submit button → calls `saveMutation.mutate(answers)`
   - "Skip" link below → also calls `saveMutation.mutate(answers)` (favoriteWines stays empty)
   - Show `saveMutation.isPending` loader on this step

### Phase 3: Server — Onboarding Endpoint Update

**File: `server/routes/user.ts`**

1. Update Zod schema (line 9-15): add `favoriteWines: z.string().max(500).optional()`
2. Include `favoriteWines` in the constructed `OnboardingData` object (line 56-63)
3. After saving to DB, fire async starter rec generation:
```typescript
import { generateAndStoreStarterRecs } from '../services/starterRecommendationService';

// After db.update() call (fire-and-forget)
if (!body.skip && onboardingData) {
  generateAndStoreStarterRecs(userId, onboardingData).catch(err => {
    console.error('[Onboarding] Starter recs generation failed:', err);
  });
}
```

### Phase 4: Starter Recommendation Service (New File)

**File: `server/services/starterRecommendationService.ts`** (new)

Pattern: follow `tasteProfileService.ts` structured output with Zod.

```typescript
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAIClient } from '../lib/openai';
import { sanitizeForPrompt } from '../lib/sanitize';
import { db } from '../db';
import { users } from '@shared/schema';
import type { OnboardingData, StarterRecommendation } from '@shared/schema';
import { eq } from 'drizzle-orm';

const starterRecSchema = z.object({
  recommendations: z.array(z.object({
    wineName: z.string(),
    wineType: z.enum(['red', 'white', 'rosé', 'sparkling', 'orange', 'dessert']),
    grape: z.string(),
    region: z.string(),
    reason: z.string(),
  })).min(3).max(5),
});

export async function generateAndStoreStarterRecs(
  userId: number,
  onboardingData: OnboardingData
): Promise<StarterRecommendation[] | null>
```

**GPT call:**
- Model: `gpt-5.2`
- `response_format: zodResponseFormat(starterRecSchema, 'starter_recs')`
- `max_completion_tokens: 800`
- System prompt: act as a sommelier recommending 3-5 real, commonly available wines for a new wine explorer. Each `reason` is 1 sentence connecting the pick to the user's specific answers.
- User message: JSON of all onboarding fields (favoriteWines sanitized via `sanitizeForPrompt`)
- On success: store result in `users.starterRecommendations`
- Handle `refusal` response (same pattern as tasteProfileService line 539-541)

**Fallback if GPT fails or is unavailable:** Return null. The API endpoint (Phase 5) falls through to static defaults.

### Phase 5: API Endpoint — Context-Aware Recommendations

**File: `server/routes/tastings.ts`** (lines 695-714)

Replace the current `/api/solo/recommendations` handler with context-aware logic:

```
GET /api/solo/recommendations
→ Response: { recommendations, basedOnTastings, source }
```

| tastingsCompleted | Behavior | source |
|---|---|---|
| 0, has starterRecommendations | Return stored starter recs | `'onboarding'` |
| 0, has onboardingData but no recs | Try generating on-demand (handles race condition), then return | `'onboarding'` |
| 0, no onboardingData (skipped) | Return static defaults | `'default'` |
| 1-3 | Existing `generateRecommendations` + onboarding vibe/food prefs injected via `blendOnboardingPreferences()` helper | `'blended'` |
| 4+ | Existing `generateRecommendations` (current behavior) | `'tastings'` |

**`blendOnboardingPreferences(prefs, onboardingData, tastingCount)`**: Adjusts the numeric preference values (sweetness/acidity/tannins/body) based on onboarding signals before passing to `generateRecommendations`. Weight decays: at 1 tasting → 66% onboarding, at 2 → 33%, at 3 → 0%. Mapping:
- `wineVibe: 'bold'` → bias body +1, tannins +0.5
- `wineVibe: 'light'` → bias acidity +0.5, body -0.5
- `wineVibe: 'sweet'` → bias sweetness +1
- Food preferences provide secondary signals (steak/BBQ → higher body, seafood/sushi → higher acidity)

### Phase 6: Frontend — Starter Picks on Solo Tab

**File: `client/src/pages/HomeV2.tsx`**

1. **Add recommendations query** inside `SoloTabContent` (after existing queries, ~line 422):
```typescript
const { data: recommendationsData } = useQuery<{
  recommendations: StarterRecommendation[];
  basedOnTastings: number;
  source: 'onboarding' | 'blended' | 'tastings' | 'default';
}>({
  queryKey: ["/api/solo/recommendations"],
  staleTime: 10 * 60 * 1000,
  enabled: stats.solo === 0,  // Only fetch when no solo tastings
});
```

2. **Replace empty state** (lines 636-665) with conditional:
```
if source === 'onboarding' && recommendations.length > 0:
  → Render StarterPicksSection
else:
  → Render existing empty state (generic "Your journal awaits")
```

3. **StarterPicksSection component** (inline in HomeV2 or extract to `components/home/StarterPicksSection.tsx`):
   - Header: Sparkles icon + "Your Starter Picks"
   - Subtitle: "Based on your taste profile — try one of these to kick off your journal"
   - 3-5 cards with colored left border by wineType (red→red-500, white→yellow-400, rosé→pink-400, sparkling→amber-300)
   - Each card: wineName, wineType badge, grape, region, reason
   - Cards are NOT interactive (just informational — keeps it simple)
   - "Start Your First Tasting" gradient button below the cards
   - Framer Motion stagger animation (same pattern as existing tasting list)

4. **Auto-removal**: Starter picks naturally disappear because the query is only enabled when `stats.solo === 0`. After completing 1 tasting, `tastingsData` refetches and the tasting list renders instead of the empty state branch.

## Acceptance Criteria

- [ ] Onboarding quiz has 6 steps; step 6 is a free-text textarea (skippable)
- [ ] `favoriteWines` is stored in `onboardingData` JSONB
- [ ] After onboarding, GPT-5.2 generates 3-5 starter recommendations stored on user record
- [ ] Solo tab shows "Your Starter Picks" cards when user has 0 tastings and recs exist
- [ ] Starter picks disappear after user completes 1 tasting
- [ ] For tastings 1-3, onboarding data blends into the recommendation engine
- [ ] After 3+ tastings, recommendations are purely data-driven
- [ ] Users who skipped onboarding see the generic empty state (no crash, no broken UI)
- [ ] Existing users (onboarded before this feature) see current behavior
- [ ] GPT failure gracefully falls back to static defaults

## Edge Cases Handled

| Scenario | Behavior |
|---|---|
| Skipped onboarding | Generic empty state, no GPT call |
| GPT call fails/times out | API falls through to static defaults |
| User loads Solo tab before GPT finishes | API tries on-demand generation; if that fails, static defaults |
| Existing user (pre-feature) | No `starterRecommendations`, no `favoriteWines` — current behavior |
| Only group tastings, no solo | Starter picks still show (keyed on `stats.solo === 0`) |
| Free-text prompt injection | `sanitizeForPrompt()` applied before GPT call |
| Quick rate only (no full tasting) | Starter picks remain (keyed on `tastingsCompleted`, which excludes quick rates) |

## Critical Files

| File | Change |
|---|---|
| `shared/schema.ts` | Add `favoriteWines` to OnboardingData, add StarterRecommendation interface, add column |
| `client/src/pages/OnboardingQuiz.tsx` | Add step 6, change occasion step to advance instead of submit |
| `server/routes/user.ts` | Update Zod schema, fire async rec generation |
| `server/services/starterRecommendationService.ts` | **NEW** — GPT-5.2 structured output service |
| `server/routes/tastings.ts` | Context-aware `/api/solo/recommendations` handler |
| `client/src/pages/HomeV2.tsx` | Add recs query, StarterPicksSection component, replace empty state |

## Verification

1. Create a new user, complete onboarding with all 6 steps (including favorite wines text)
2. Verify `onboardingData` in DB includes `favoriteWines`
3. Verify `starterRecommendations` populates within a few seconds
4. Navigate to Solo tab — see "Your Starter Picks" cards with personalized recs
5. Complete one solo tasting — return to Solo tab, verify starter picks are gone
6. Test skip flow: new user skips onboarding → generic empty state, no errors
7. Test GPT unavailability: unset OPENAI_API_KEY, complete onboarding → static default recs shown
