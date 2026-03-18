---
title: "feat: Preference-Focused Tasting Questions"
type: feat
date: 2026-02-20
---

# Preference-Focused Tasting Questions

## Overview

Redesign the solo tasting question system so questions explicitly help users discover what kinds of wines they like. Currently, questions feel generic and don't guide users toward understanding their preferences. The improved questions should include inline tasting guidance (how to taste for each characteristic) and frame everything around preference discovery — so users leave each tasting knowing more about what to order at restaurants and wine shops.

## Problem Statement

**Current state:**
- **True solo tastings** use 10 static hardcoded questions — the same generic questions for every wine, regardless of grape, region, or style. No wine-specific tailoring at all despite having the wine info available
- **Learning journey tastings** use AI-generated questions where the prompt says "focus on enjoyment" but doesn't enforce preference-discovery framing or educational guidance
- No inline tips explaining HOW to taste for each characteristic
- Rating scale inconsistency: static questions use 1-5, AI prompt instructs 1-10, causing nonsensical preference averages
- AI categories don't include tannins, leaving a gap in red wine preference profiles
- `max_completion_tokens: 2000` truncates responses for advanced users (12-15 questions)

**Desired state:**
- **Every tasting gets wine-specific AI-generated questions** — whether it's a solo tasting or a learning journey
- Questions are tailored to the grape, region, and wine style (Sangiovese gets cherry/acidity questions, Riesling gets sweetness/petrol questions)
- Questions include brief inline guidance on how to taste for each characteristic
- Consistent 1-10 scales and canonical field mapping across all flows
- Users walk away knowing: "I like wines with X but not Y"

## Proposed Solution

Three-phase approach: (1) fix data pipeline bugs that would undermine the new questions, (2) extend AI question generation to solo tastings so every tasting gets wine-specific questions, (3) rewrite the AI generation prompt for preference-focused, educational questions.

---

## Phase 1: Fix Data Pipeline Inconsistencies

These are prerequisite fixes — without them, the new preference-focused questions will produce bad data downstream.

### 1A. Standardize rating scale to 1-10

**Why:** Static questions use 1-5 for overall rating. AI prompt and fallback use 1-10. The star display in `SoloTastingDetail` renders only 5 stars. `AVG()` across flows produces meaningless numbers when mixing scales. **Standardize on 1-10 for all scale questions** — more granularity for preference data.

**Files:**
- `client/src/pages/SoloTastingSession.tsx` — Update all `TASTING_QUESTIONS` scale questions from `scaleMax: 5` to `scaleMax: 10`
- `client/src/pages/SoloTastingDetail.tsx` — Update star display to render 10 stars (or switch to a 1-10 scale bar which is simpler)
- `client/src/components/questions/ScaleQuestion.tsx` — Verify slider component supports 1-10 range correctly
- `server/services/questionGenerator.ts` — Update system prompt to instruct 1-10 for ALL scale questions (characteristics AND overall), not just overall
- `server/services/questionGenerator.ts` — Update all `FALLBACK_QUESTIONS` from `scaleMax: 5` to `scaleMax: 10`
- `server/openai-client.ts` — Verify recommendation prompt uses "X/10" consistently

### 1B. Add tannins to AI question categories

**Why:** `taste.tannins` is expected by `WineInsights`, preference aggregation SQL, and recommendation generation. AI questions never generate tannins data.

**Files:**
- `server/services/questionGenerator.ts` — Add tannins as a 6th core component in the system prompt (required for red/rosé wines, skip for whites/sparkling)
- `server/services/questionGenerator.ts` — Add tannins fallback questions (`tannins-1`, `tannins-2`)
- `shared/schema.ts` — Add `'tannins'` to `QuestionCategory` type

### 1C. Increase `max_completion_tokens`

**Why:** At 2000 tokens, advanced users (12-15 questions) get truncated JSON → fallback questions every time.

**Files:**
- `server/services/questionGenerator.ts` — Increase to `3500` (or make level-dependent: intro=2000, intermediate=2500, advanced=3500)

### 1D. Add "Would you buy again?" to AI and fallback questions

**Why:** Strong preference signal. Static questions have it (`overall_buy_again`), but AI and fallback don't. Recommendations benefit from this data.

**Files:**
- `server/services/questionGenerator.ts` — Add instruction to always include a boolean "would you buy again?" question in the overall category
- `server/services/questionGenerator.ts` — Add `overall-buy-again` to `FALLBACK_QUESTIONS`

---

## Phase 2: Extend AI Question Generation to Solo Tastings

Currently, only learning journey tastings get AI-generated wine-specific questions. True solo tastings use 10 static hardcoded questions regardless of whether you're tasting a Barolo or a Sauvignon Blanc. **This is the biggest missed opportunity** — the user already enters wine info (name, grape, region, type) before starting, so we have everything we need to generate wine-specific questions.

### What Changes

1. **Solo tastings call `generateQuestionsForWine()` before starting** — same AI generation that learning journeys use
2. **The improved static questions become the universal fallback** — used when AI generation fails or OpenAI is unavailable
3. **~2-3 second loading state** while questions generate, with graceful fallback

### Implementation

#### 2A. Add solo question generation endpoint

Create a new endpoint (or extend the existing one) that solo tastings can call:

```
POST /api/solo/tastings/generate-questions
Body: { wineInfo: WineRecognitionResult }
Response: { questions: GeneratedQuestion[] }
```

This calls the same `generateQuestionsForWine()` from `questionGenerator.ts`, without the chapter context or wine validation that learning journeys need.

**Files:**
- `server/routes/tastings.ts` — Add `POST /api/solo/tastings/generate-questions` endpoint
- `server/services/questionGenerator.ts` — No changes needed (already supports optional chapter)

#### 2B. Update SoloTastingNew to call AI generation

When the user clicks "Start Tasting" in a true solo flow (no `journeyId`), call the new endpoint before navigating to `SoloTastingSession`:

```typescript
// Current: skip straight to tasting
setView('tasting');

// New: generate questions first, then start tasting
const response = await fetch('/api/solo/tastings/generate-questions', {
  method: 'POST',
  body: JSON.stringify({ wineInfo })
});
const { questions } = await response.json();
setAiQuestions(questions); // same state that learning journeys use
setView('tasting');
```

Add a loading state ("Preparing your tasting...") during the API call. On failure, proceed with fallback questions — the user should never be blocked.

**Files:**
- `client/src/pages/SoloTastingNew.tsx` lines 231-285 — Update `handleStartTasting()` to call generation endpoint for solo flow

#### 2C. Redesign fallback questions as the safety net

The `TASTING_QUESTIONS` static constant and the `FALLBACK_QUESTIONS` should be merged into a single, well-designed fallback set that serves both flows when AI fails. This set should follow the new preference-focused philosophy:

- Inline `description` tips on every question
- Preference-oriented scale labels
- 1-10 scales consistently
- Tannins question included
- "Would you buy again?" included
- ~12 questions total

**Proposed fallback question set:**

```
AROMA (3 questions):
  aroma_notes      - multiple_choice: "What aromas jump out at you?"
                     tip: "Swirl the glass gently and take a short sniff. Don't overthink it — what's the first thing that comes to mind?"
                     options: Fruity, Floral, Herbal/Green, Spicy, Earthy, Oaky/Vanilla
                     (multi-select)

  aroma_intensity  - scale 1-10: "How strong are the aromas?"
                     tip: "Hold the glass at chin level. Can you smell it from there, or do you need to put your nose right in the glass?"
                     labels: Subtle, barely there / Bold and aromatic

  aroma_appeal     - scale 1-10: "How much do you enjoy the way this wine smells?"
                     labels: Not my style / Love it

TASTE (6 questions):
  taste_sweetness  - scale 1-10: "How sweet does this wine taste to you?"
                     tip: "Take a sip and focus on the tip of your tongue. Does it taste dry (not sweet at all) or do you notice some sweetness?"
                     labels: Bone dry / Noticeably sweet

  taste_acidity    - scale 1-10: "How much zing or crispness do you notice?"
                     tip: "Pay attention to whether your mouth waters after you swallow. More watering = more acidity. Think of it like lemon juice — some wines have a lot of that bright, crisp feeling."
                     labels: Soft and smooth / Bright and zingy

  taste_tannins    - scale 1-10: "How much does this wine dry out your mouth?"
                     tip: "Tannins are that drying, slightly rough feeling on your gums and tongue — like over-steeped tea. Mostly found in red wines."
                     labels: Silky smooth / Grippy and drying

  taste_body       - scale 1-10: "How heavy does the wine feel in your mouth?"
                     tip: "Think of it like milk: skim milk is light-bodied, whole milk is medium, cream is full-bodied. Swish it around — does it feel light and watery, or thick and rich?"
                     labels: Light and delicate / Full and rich

  taste_flavors    - multiple_choice: "What flavors stand out when you taste it?"
                     tip: "Take another sip and think beyond just 'grape.' Wine can taste like fruits, spices, earth, even butter or toast."
                     options: Red fruit, Dark fruit, Citrus, Tropical, Herbal, Spicy, Earthy, Oaky/Vanilla
                     (multi-select)

  taste_enjoyment  - scale 1-10: "Overall, how much do you enjoy the way this wine TASTES?"
                     tip: "Forget what it 'should' taste like. Do YOU like it?"
                     labels: Not for me / Absolutely love it

OVERALL (3 questions):
  overall_rating   - scale 1-10: "How would you rate this wine overall?"
                     tip: "Think about the full experience — the smell, the taste, the aftertaste. Would you be happy if someone poured you another glass?"
                     labels: Pass / Outstanding

  overall_buy_again - boolean: "Would you buy this wine again?"

  overall_notes    - text: "Any thoughts you want to remember about this wine?"
                     placeholder: "What stood out? What would you tell a friend about it?"
                     (optional)
```

**Key design decisions:**
- Canonical IDs preserved for backward compatibility (`taste_sweetness`, `taste_acidity`, etc.)
- Every scale question has a `description` with an inline tasting tip
- Scale labels are preference-oriented, not technical measurement
- 12 questions (up from 10 in old static, 12 in old fallback)
- Added `aroma_intensity` and `taste_enjoyment` as new high-signal preference questions

**Files:**
- `client/src/pages/SoloTastingSession.tsx` lines 88-222 — Replace `TASTING_QUESTIONS` with new fallback set (used when AI questions not available)
- `server/services/questionGenerator.ts` lines 61-190 — Replace `FALLBACK_QUESTIONS` with same set (used when AI generation fails server-side)
- `client/src/pages/SoloTastingDetail.tsx` lines 33-44 — Add `SCALE_LABELS` for new fields (`aroma_intensity`, `taste_enjoyment`)

---

## Phase 3: Rewrite AI Generation Prompt

Rewrite the system and user prompts in `questionGenerator.ts` to produce preference-focused questions with inline educational guidance.

### New System Prompt Principles

1. **You are helping someone discover their wine preferences**, not testing their knowledge
2. **Every question must include a `description` field** with a 1-2 sentence tip on how to taste for that characteristic — use everyday language and sensory comparisons
3. **Frame questions around enjoyment and preference**: "How much do you enjoy..." not "Identify the..."
4. **Required canonical questions**: The AI MUST generate questions with these specific IDs so downstream mapping works reliably:
   - `sweetness-assessment` (maps to `taste.sweetness`)
   - `acidity-assessment` (maps to `taste.acidity`)
   - `body-assessment` (maps to `taste.body`)
   - `tannins-assessment` (maps to `taste.tannins`, required for red/rosé only)
   - `overall-rating` (maps to `overall.rating`, scale 1-10)
   - `buy-again` (maps to `overall.wouldBuyAgain`, boolean)
5. **Use 1-10 scale** for all scale questions consistently
6. **Scale labels should reflect preference**, not technical measurement
7. **Wine-specific bonus questions** beyond the required set should explore what makes this particular wine interesting — grape-specific flavors, regional characteristics, unique elements
8. **Level-appropriate language**:
   - Intro: Everyday comparisons, no jargon, encouraging tone
   - Intermediate: Some wine terms with brief explanations
   - Advanced: Wine terminology expected, explore nuance and terroir

### Update `normalizeCanonicalFields()` for New IDs

Add the new explicit IDs to the keyword matching:
- `sweetness-assessment` → `taste.sweetness`
- `acidity-assessment` → `taste.acidity`
- `body-assessment` → `taste.body`
- `tannins-assessment` → `taste.tannins`
- `overall-rating` → `overall.rating`
- `buy-again` → `overall.wouldBuyAgain`

This makes the mapping deterministic rather than relying purely on keyword heuristics.

### Update Fallback Questions

Align the 12 `FALLBACK_QUESTIONS` with the new philosophy:
- Add inline `description` tips to every question
- Add tannins pair (for red wines)
- Add `buy-again` boolean
- Standardize all scales to 1-10
- Reframe labels around preference

### Files to Modify

| File | Change |
|------|--------|
| `server/services/questionGenerator.ts` lines 324-363 | Rewrite `getSystemPrompt()` |
| `server/services/questionGenerator.ts` lines 365-437 | Rewrite `getUserPrompt()` |
| `server/services/questionGenerator.ts` lines 61-190 | Rewrite `FALLBACK_QUESTIONS` |
| `server/services/questionGenerator.ts` ~line 287 | Increase `max_completion_tokens` |
| `client/src/pages/SoloTastingSession.tsx` lines 435-471 | Update `normalizeCanonicalFields()` with explicit ID matching |

---

## Acceptance Criteria

### Functional
- [ ] True solo tastings call AI to generate wine-specific questions (not hardcoded generic questions)
- [ ] Learning journey tastings generate AI questions focused on preference discovery with inline guidance
- [ ] Both flows fall back gracefully to the improved static question set when AI fails
- [ ] ~2-3s loading state while questions generate, user is never blocked
- [ ] All flows use 1-10 scale consistently (no mixed scales)
- [ ] AI-generated tastings include tannins questions for red/rosé wines
- [ ] AI-generated tastings include "would you buy again?" boolean
- [ ] `normalizeCanonicalFields()` reliably maps both old keyword-matched IDs and new explicit IDs
- [ ] Fallback questions match the new preference-focused philosophy
- [ ] `max_completion_tokens` is sufficient for advanced-level question generation (no truncation)

### Data Integrity
- [ ] Historical tastings continue to display correctly (no breaking changes to JSONB paths)
- [ ] `WineInsights` comparison still works for both old and new tastings
- [ ] Preference aggregation SQL produces correct averages (no mixed-scale data)
- [ ] Fallback question IDs preserve backward compatibility with `formatResponsesForSave()`
- [ ] `SoloTastingDetail` SCALE_LABELS updated for any new field names

### UX
- [ ] Every scale question displays a description/tip explaining how to taste for that characteristic
- [ ] Scale labels are preference-oriented (not technical measurement)
- [ ] AI questions are tailored to the specific wine (grape-specific flavors, regional characteristics)
- [ ] Tannins question included for red/rosé wines, omitted for whites
- [ ] Question flow feels natural and educational, not like a quiz

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| AI prompt changes produce unexpected question formats | Fallback questions serve as safety net; explicit canonical IDs reduce fragility |
| Changing question IDs breaks in-progress localStorage drafts | Add `schemaVersion` field to draft JSON; clear stale drafts on version mismatch |
| Historical data has different field shapes than new data | Keep same canonical JSONB paths; display code already handles multiple formats |
| AI token limit still too low for advanced users | Make `max_completion_tokens` level-dependent; monitor fallback rate |
| Tannins question confuses white wine drinkers | AI prompt instructs to omit for whites; fallback includes it but AI won't |
| AI generation adds ~2-3s latency to solo tasting start | Show loading state; fall back to static questions on timeout (5s); user is never blocked |

## Implementation Order

1. **Phase 1** (data fixes) — Do first, deploy, verify. Prerequisite for everything.
2. **Phase 3** (AI prompt rewrite) — Do second. The improved prompt is needed before Phase 2 hooks into it.
3. **Phase 2** (extend AI to solo + fallback redesign) — Do last. Connects solo flow to the improved AI generation, plus the fallback safety net.
4. Test both flows end-to-end after each phase.

## References

### Internal Files
- `client/src/pages/SoloTastingSession.tsx` — Static questions, AI conversion, normalization, save formatting
- `server/services/questionGenerator.ts` — AI prompt, fallback questions, GPT call
- `client/src/pages/SoloTastingDetail.tsx` — Results display, scale labels
- `client/src/components/WineInsights.tsx` — Preference comparison
- `server/routes/tastings.ts` — Save endpoint, preference SQL
- `server/openai-client.ts` — Recommendation generation
- `shared/schema.ts` — `TastingResponses` interface, `QuestionCategory` type

### Institutional Learnings
- `docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md` — AI category mapping pitfall
- `INSTITUTIONAL_LEARNINGS_QUESTION_GENERATION.md` — Comprehensive question generation gotchas
