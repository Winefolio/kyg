---
title: "fix: Wine-type-aware questions + tasting completion redirect"
type: fix
date: 2026-03-18
---

# fix: Wine-type-aware questions + tasting completion redirect

Two issues: (1) tasting questions don't differentiate between red and white wine — showing tannin questions for whites, stone fruit for reds, etc. (2) After finishing a tasting, user sees a blank page then gets redirected to a new tasting form instead of back to `/home`.

## Issue 1: Wine-Type-Aware Questions

### Problem

The fruit flavors question shows all 5 options (Red berries, Dark berries, Citrus, Stone fruit, Tropical) regardless of wine type. Tannins questions appear for white/sparkling wines. The root cause is two-fold:

1. **Ad-hoc solo tastings never call GPT** — they always use static `TASTING_QUESTIONS` from `SoloTastingSession.tsx:95-286`, which are completely wine-type-agnostic
2. **`wineType` is never passed to the question generator** — the `WineRecognitionResult` interface (`shared/schema.ts:1074`) doesn't include `wineType`, so the generator falls back to a grape-name substring heuristic that only recognizes 20 red grapes

### Fix

**A. Pass `wineType` to question generator** (`shared/schema.ts`)

- [x] Add `wineType?: string` to `WineRecognitionResult` interface

**B. Send `wineType` from client** (`client/src/pages/SoloTastingNew.tsx:254`)

- [x] Include `wineType` when building the `wineRecognition` object sent to the API

**C. Use `wineType` as primary signal** (`server/services/questionGenerator.ts:451-464`)

- [x] In `getUserPrompt()`, use `wineInfo.wineType` first, fall back to grape heuristic
- [x] Map types to question behavior:
  - `red`: include tannins, fruit options = Red berries, Dark berries, Plum/fig
  - `white`: skip tannins, fruit options = Citrus, Stone fruit, Tropical, Green apple
  - `rose`: light tannins question (modified scale), fruit options = Red berries, Citrus, Stone fruit
  - `sparkling`: skip tannins, add "effervescence" note in prompt, fruit = Citrus, Stone fruit, Green apple
  - `dessert`/`fortified`/`orange`: fallback to generic with appropriate tannin handling (orange=include, dessert/fortified=skip)

**D. Make static fallback questions type-aware** (`client/src/pages/SoloTastingSession.tsx:95-286`)

- [x] Convert `TASTING_QUESTIONS` from a flat array to a function: `getTastingQuestions(wineType?: string)`
- [x] Filter fruit options by type (remove red-wine options for whites, remove white-wine options for reds)
- [x] Conditionally include/exclude tannins questions based on type
- [x] Pass `wine.wineType` from `SoloTastingNew` → `SoloTastingSession` (already receives `wine` prop)

**E. Strengthen GPT prompt** (`server/services/questionGenerator.ts:370-437`)

- [x] Replace binary `Wine Type: Red` / `Wine Type: White/Other` with the actual type string
- [x] Add explicit fruit option guidance per type in the user prompt
- [x] Add: "NEVER ask about tannins for white or sparkling wine." (via `SKIP tannins` directive)

## Issue 2: Tasting Completion Redirect Bug

### Problem

After the user finishes a solo tasting:
1. `SoloTastingSession` saves the tasting, then shows its OWN completion screen (lines 787-810) with "Back to Dashboard" button
2. User clicks it → calls `onComplete(savedTastingId)`
3. `SoloTastingNew.handleTastingComplete` sets `view='complete'`
4. A SECOND completion screen renders (lines 342-403) with "Back to Home" button
5. During the transition between screens, user sees a brief blank page

### Fix

- [x] **Remove `SoloTastingSession`'s internal completion screen**. After `saveTastingMutation.onSuccess`, call `onComplete(savedTastingId)` directly instead of setting `isComplete = true`. The parent (`SoloTastingNew`) already has the right completion UI with contextual navigation (journey vs. non-journey).

- [x] **Verify `SoloTastingNew` completion screen navigates correctly**:
  - Non-journey: "Back to Home" → `/home` (currently correct at line 394)
  - Journey: "Continue Journey" → `/journeys/${journeyId}` (currently correct at line 387)

- [x] **Clean up**: Removed `isComplete` and `savedTastingId` state variables and related rendering logic from `SoloTastingSession`.

## Files Summary

| File | Action | What |
|------|--------|------|
| `shared/schema.ts` | Modify | Add `wineType` to `WineRecognitionResult` |
| `client/src/pages/SoloTastingNew.tsx` | Modify | Pass `wineType` in API call |
| `client/src/pages/SoloTastingSession.tsx` | Modify | Type-aware fallback questions, remove internal completion screen |
| `server/services/questionGenerator.ts` | Modify | Use `wineType` as primary signal, strengthen prompt |

## Implementation Order

1. Fix completion redirect (Issue 2) — small, self-contained
2. Add `wineType` to schema + pass through from client (Issue 1A-B)
3. Update question generator to use `wineType` (Issue 1C+E)
4. Make static fallback questions type-aware (Issue 1D)

## Verification

1. Start a solo tasting with a white wine → should NOT see tannins questions, fruit options should be citrus/stone fruit/tropical (no berries)
2. Start a solo tasting with a red wine → SHOULD see tannins, fruit options should be berries/dark berries (no citrus/stone fruit)
3. Complete a solo tasting → should see ONE completion screen, then navigate to `/home` solo tab
4. Complete a journey tasting → should see ONE completion screen, then navigate to `/journeys/:id`
