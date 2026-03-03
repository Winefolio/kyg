---
title: "feat: Learning Journey Enhancement — Questions, Wine Guidance, Nearby Shops"
type: feat
date: 2026-03-03
supersedes: docs/plans/2026-02-20-feat-preference-focused-tasting-questions-plan.md
---

# Learning Journey Enhancement

## Overview

Three connected improvements to the Learning Journeys experience:

1. **Three-Beat Question Loop** — Restructure AI-generated tasting questions into a notice→explain→rate pattern that builds preference profiles over time
2. **Dual Wine Recommendations** — Show a "Budget" (under $25) and "Splurge" option for each wine in a chapter, with rich shopping companion guidance
3. **Nearby Wine Shops** — Google Places API integration to help users find where to buy

This plan supersedes `2026-02-20-feat-preference-focused-tasting-questions-plan.md` and incorporates its Phase 1 data pipeline fixes as prerequisites.

## Problem Statement

**Questions are flat.** The AI prompt says "focus on enjoyment" but doesn't enforce a pedagogical structure. Users answer questions but don't learn what they're tasting or build a preference vocabulary. There's no moment of "oh, THAT's what tannin is, and I like it."

**Wine acquisition is intimidating.** Users are told "buy a Cotes du Rhone" but not what that looks like on a shelf, what to ask a shop employee, or where to even go. The gap between "chapter says buy this wine" and "user has the wine in hand" is underserved.

**One-size pricing doesn't fit.** A college student and a wine enthusiast shouldn't get the same $40 recommendation. But a global budget setting is too rigid — someone might go cheap on a Tuesday and splurge for a dinner party.

## Proposed Solution

### Three-Beat Question Loop

For each sensory characteristic the AI selects as important for this wine:

- **Beat 1 (Notice + Name):** Ask the user to observe something. After they answer, show an inline educational explanation naming what they just experienced. Example: User answers "dry" → app shows "That dryness is called tannin — it comes from grape skins and adds structure to the wine."
- **Beat 2 (Rate):** Ask if they liked it and how much they want in future wines. Example: "Did you enjoy that feeling? Would you want more or less tannin in your next wine?"

This is two screens per characteristic, not three — the educational content merges into Beat 1's answer as inline feedback before advancing.

**Question counts by level:**
- Beginner: 5 key traits (10 items) + overall questions
- Intermediate: 6 key traits (12 items) + overall questions
- Advanced: 8 key traits (16 items) + overall questions

The AI picks which traits matter most for the specific wine (e.g., tannin + dark fruit + body for a Cabernet, acidity + minerality + citrus for a Sancerre).

### Dual Wine Recommendations (Budget / Splurge)

Each chapter shows two wine cards:

- **Budget:** Accessible option, kept under ~$25. Shows name, region, what to look for, what to ask.
- **Splurge:** Premium version. Same info but no price shown — "you'll know the price when you see it."

User picks per-wine, per-chapter. No global setting. Same lesson either way.

### Wine Acquisition Shopping Companion

For each wine option, AI-generated guidance that answers:
- What to look for on the label (producer names, region text, grape mention)
- What to say to shop staff ("I'm looking for a Southern Rhone blend, something GSM")
- Acceptable substitutes if they can't find the exact wine

Generated at journey authoring time (not tasting time) so it's always ready.

### Nearby Wine Shops

Google Places API (New) integration:
- Server-side proxy at `/api/wine-shops/nearby` to protect API key
- Client-side browser geolocation
- Show list: name, address, rating, tap-to-open-in-maps
- Grid-based caching (30-min TTL) keeps API costs at zero for small user base

---

## Technical Approach

### Architecture

```
Journey Authoring (Admin)
  └── AI generates shopping companion text per wine option
  └── Sommelier reviews/edits, publishes

Journey Experience (User)
  ├── JourneyDetail: browse chapters, see budget/splurge wine options + shopping guide
  │   ├── WineOptionCard (budget): name, guidance, "under $25"
  │   ├── WineOptionCard (splurge): name, guidance, no price
  │   └── NearbyWineShops: geolocation → Google Places → shop list
  │
  └── SoloTastingSession: three-beat question loop
      ├── Beat 1: Notice + inline educational explanation after answer
      ├── Beat 2: Rate preference (scale 1-10)
      ├── ... repeat for AI-selected traits ...
      ├── Overall rating (1-10)
      ├── Would buy again? (boolean)
      └── Final notes (text)

Preference Aggregation
  └── Beat 2 "Rate" answers accumulate across tastings
  └── Future: "You tend to prefer low-tannin, high-acidity wines"
```

### Implementation Phases

#### Phase 0: Data Pipeline Fixes (Prerequisite)

Fixes from the superseded plan that must ship first.

**0A. Standardize rating scale to 1-10**

All scale questions across static, fallback, and AI-generated flows must use 1-10. Currently mixed.

| File | Change |
|------|--------|
| `client/src/pages/SoloTastingSession.tsx` | Update `TASTING_QUESTIONS` scales from `scaleMax: 5` → `10` |
| `client/src/pages/SoloTastingDetail.tsx` | Update star display to 1-10 scale bar |
| `client/src/components/questions/ScaleQuestion.tsx` | Verify 1-10 range works |
| `server/services/questionGenerator.ts` | Update system prompt: 1-10 for ALL scales |
| `server/services/questionGenerator.ts` | Update `FALLBACK_QUESTIONS` from `scaleMax: 5` → `10` |

**0B. Add tannins category**

| File | Change |
|------|--------|
| `server/services/questionGenerator.ts` | Add tannins as 6th core component (reds/rosé only) |
| `server/services/questionGenerator.ts` | Add tannins fallback questions |
| `shared/schema.ts` | Add `'tannins'` to `QuestionCategory` type |

**0C. Increase `max_completion_tokens`**

| File | Change |
|------|--------|
| `server/services/questionGenerator.ts` ~line 271 | Level-dependent: beginner=3000, intermediate=3500, advanced=4500 |

**0D. Add "Would you buy again?"**

| File | Change |
|------|--------|
| `server/services/questionGenerator.ts` | Add instruction to always include boolean buy-again |
| `server/services/questionGenerator.ts` | Add `overall-buy-again` to `FALLBACK_QUESTIONS` |

---

#### Phase 1: Three-Beat Question Loop

**1A. Extend `GeneratedQuestion` schema**

Add fields to support the two-beat structure and inline education.

```typescript
// shared/schema.ts — extend GeneratedQuestion interface (line ~1074)

interface GeneratedQuestion {
  // ... existing fields ...
  beatType: 'notice' | 'rate';           // NEW: which beat this question is
  educationalNote?: string;               // NEW: shown after user answers a 'notice' beat
  preferenceDirection?: 'more' | 'less';  // NEW: for rate beats, what "high" means for preference
}
```

- `beatType: 'notice'` — The observation question ("Does this make your mouth feel dry?")
- `beatType: 'rate'` — The preference question ("Did you enjoy that? More or less next time?")
- `educationalNote` — Displayed inline after the user answers a `notice` beat, before advancing to the paired `rate` beat. Example: "That dryness is called tannin — it comes from grape skins."
- Questions without `beatType` (legacy, overall) render as before

**Files:**
| File | Change |
|------|--------|
| `shared/schema.ts` ~line 1074 | Add `beatType`, `educationalNote`, `preferenceDirection` to `GeneratedQuestion` |
| `shared/schema.ts` ~line 27 (questionGenerator.ts) | Update `GeneratedQuestionSchema` zod schema to include new fields |

**1B. Rewrite AI system/user prompts**

Restructure `getSystemPrompt()` and `getUserPrompt()` in `questionGenerator.ts` to produce the two-beat structure.

**New system prompt principles:**
1. You are helping someone discover what they like, not testing knowledge
2. For each characteristic, generate a paired notice+rate:
   - Notice question: guide the user to observe (everyday language for beginners)
   - `educationalNote`: 1-2 sentences explaining what they just noticed
   - Rate question: ask if they enjoyed it, would they want more or less
3. Pick the most interesting traits for THIS wine:
   - Beginner: 5 traits
   - Intermediate: 6 traits
   - Advanced: 8 traits
4. Always include overall rating (1-10) and buy-again (boolean) at the end
5. Every scale uses 1-10
6. Required canonical IDs for reliable mapping:
   - `sweetness-notice`, `sweetness-rate` → `taste.sweetness`
   - `acidity-notice`, `acidity-rate` → `taste.acidity`
   - `body-notice`, `body-rate` → `taste.body`
   - `tannins-notice`, `tannins-rate` → `taste.tannins` (reds only)
   - `overall-rating` → `overall.rating`
   - `buy-again` → `overall.wouldBuyAgain`

**Files:**
| File | Change |
|------|--------|
| `server/services/questionGenerator.ts` lines 324-363 | Rewrite `getSystemPrompt()` |
| `server/services/questionGenerator.ts` lines 365-437 | Rewrite `getUserPrompt()` with trait count per level |

**1C. Update `SoloTastingSession` rendering for two-beat flow**

After the user answers a `notice` beat question, show the `educationalNote` as an inline card/toast before advancing to the paired `rate` question.

```
[User sees notice question] → [User answers] → [Educational note animates in] → [User taps "Got it" or auto-advance after 3s] → [Rate question appears]
```

**Files:**
| File | Change |
|------|--------|
| `client/src/pages/SoloTastingSession.tsx` | Add educational note display after notice-beat answers |
| `client/src/pages/SoloTastingSession.tsx` | Update `convertAIQuestions()` to handle `beatType` |
| `client/src/pages/SoloTastingSession.tsx` lines 435-471 | Update `normalizeCanonicalFields()` with explicit canonical IDs |

**1D. Add preference storage**

Beat 2 "rate" answers are preference signals distinct from observation answers. Store them so they can be aggregated over time.

```typescript
// shared/schema.ts — extend TastingResponses (line ~744)

interface TastingResponses {
  // ... existing observation sections ...
  preferences?: {
    [characteristic: string]: {
      enjoyment: number;        // 1-10: how much they liked it
      wantMore: boolean;        // would they want more of this in future wines
    }
  }
}
```

**Files:**
| File | Change |
|------|--------|
| `shared/schema.ts` ~line 744 | Add `preferences` section to `TastingResponses` |
| `client/src/pages/SoloTastingSession.tsx` | Map `rate` beat answers to `preferences` section in save |

**1E. Update fallback questions to two-beat structure**

Replace `FALLBACK_QUESTIONS` with a static two-beat set covering 5 core traits (body, acidity, tannins, fruit, aroma) plus overall. Used when AI is unavailable.

**Files:**
| File | Change |
|------|--------|
| `server/services/questionGenerator.ts` lines 61-190 | Rewrite `FALLBACK_QUESTIONS` with notice+rate pairs |
| `client/src/pages/SoloTastingSession.tsx` lines 88-222 | Rewrite `TASTING_QUESTIONS` to match |

---

#### Phase 2: Dual Wine Recommendations + Shopping Companion

**2A. Simplify `WineOption.level` to budget/splurge**

The existing `entry | mid | premium` enum maps naturally to budget/splurge. Change the enum and update existing data.

```typescript
// shared/schema.ts — update WineOption interface (line ~995)

interface WineOption {
  description: string;
  askFor: string;
  labelTips?: string;          // NEW: what to look for on the label
  substitutes?: string[];      // NEW: acceptable alternatives (moved from chapter-level)
  priceRange?: PriceRange;     // optional — omit for splurge
  exampleProducers?: string[];
  level: 'budget' | 'splurge'; // CHANGED from 'entry' | 'mid' | 'premium'
  whyThisWine?: string;
}
```

**Files:**
| File | Change |
|------|--------|
| `shared/schema.ts` ~line 995 | Change `level` enum, add `labelTips`, `substitutes` |
| `client/src/components/WineOptionCard.tsx` | Update to render budget vs splurge (hide price for splurge) |
| `client/src/pages/JourneyDetail.tsx` | Update `WineOptionsList` rendering for two-card layout |

**2B. Wire up wine option selection through navigation**

Currently `onSelectOption` in `JourneyDetail` is not connected. Pass the selection to `SoloTastingNew`.

**Files:**
| File | Change |
|------|--------|
| `client/src/pages/JourneyDetail.tsx` ~line 151 | Pass `selectedLevel` as URL param in `handleStartChapter` |
| `client/src/pages/JourneyDetail.tsx` ~line 483 | Wire up `onSelectOption` callback |
| `client/src/pages/SoloTastingNew.tsx` | Read `selectedLevel` from URL, show relevant shopping guide |

**2C. AI shopping companion generation (admin)**

Add an endpoint and admin UI button for generating shopping companion text per wine option.

```
POST /api/admin/chapters/:chapterId/generate-shopping-guide
Body: { wineRequirements: {...} }
Response: { wineOptions: WineOption[] }
```

The AI prompt takes wine requirements (grape, region, style) and generates:
- Budget option: name, description, askFor, labelTips, substitutes, priceRange (max: 25)
- Splurge option: name, description, askFor, labelTips, substitutes (no priceRange)

Sommelier can review and edit the result before saving.

**Files:**
| File | Change |
|------|--------|
| `server/routes/journeys.ts` | Add `POST /api/admin/chapters/:chapterId/generate-shopping-guide` |
| `server/services/shoppingGuideGenerator.ts` | NEW: AI prompt for generating shopping companion text |
| `client/src/pages/PackageEditor.tsx` or admin chapter editor | Add "Generate Shopping Guide" button |

**2D. Update `WineOptionCard` UI**

Two cards side-by-side (desktop) or stacked (mobile):

```
┌─────────────────────┐  ┌─────────────────────┐
│  BUDGET              │  │  SPLURGE             │
│  Under $25           │  │                      │
│                      │  │                      │
│  Cotes du Ventoux    │  │  Chateauneuf-du-Pape │
│  Southern Rhone      │  │  Southern Rhone      │
│                      │  │                      │
│  Look for: "Ventoux" │  │  Look for: "CDP" or  │
│  on the label        │  │  "Chateauneuf" on    │
│                      │  │  the label           │
│  Ask for: "A Cotes   │  │                      │
│  du Ventoux — it's   │  │  Ask for: "Your best │
│  like a baby Chatea- │  │  Chateauneuf-du-Pape"│
│  uneuf"              │  │                      │
│                      │  │  Also works:         │
│  Also works:         │  │  Gigondas, Vacqueyras│
│  Any Southern Rhone  │  │                      │
│       [Select]       │  │       [Select]       │
└─────────────────────┘  └─────────────────────┘
```

**Files:**
| File | Change |
|------|--------|
| `client/src/components/WineOptionCard.tsx` | Redesign for budget/splurge with labelTips, substitutes |

---

#### Phase 3: Nearby Wine Shops (Google Places API)

**3A. Server-side proxy endpoint**

```
GET /api/wine-shops/nearby?latitude=X&longitude=Y&radius=5000
Response: { shops: [{ id, name, address, rating, ratingCount, lat, lng }] }
```

- Uses Google Places API (New) `POST /v1/places:searchNearby`
- `includedTypes: ["liquor_store"]` (no `wine_store` type exists in Google)
- Field mask: `places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus`
- Enterprise tier: 1,000 free requests/month (plenty with caching)
- Input validation on coordinates
- Rate limited: 20 requests/min per IP
- Grid-based cache: round coordinates to 2 decimal places (~1.1km), 30-min TTL
- Env var: `GOOGLE_PLACES_API_KEY`

**Files:**
| File | Change |
|------|--------|
| `server/routes/places.ts` | NEW: `/api/wine-shops/nearby` proxy endpoint with caching |
| `server/routes.ts` or app setup | Register new route file |

**3B. Client geolocation hook**

```typescript
// client/src/hooks/useGeolocation.ts — NEW
// Returns { position, error, loading, requestLocation }
// Uses navigator.geolocation with enableHighAccuracy: false, 10s timeout, 5-min cache
```

**Files:**
| File | Change |
|------|--------|
| `client/src/hooks/useGeolocation.ts` | NEW: `useGeolocation()` hook |

**3C. Nearby shops UI component**

Placed on the `JourneyDetail` chapter view, below the wine options. Shows:
- "Find wine shops near you" button (triggers geolocation permission)
- List of shops: name, address, star rating, tap to open in native maps
- Loading state while fetching
- Permission-denied state: message explaining how to enable location in device settings
- Empty state (no shops nearby): "No wine shops found nearby. Try a larger area or check online retailers."
- Shops open in Apple Maps (iOS) or Google Maps (Android/desktop) via `https://maps.google.com/?q=lat,lng` or `maps://` scheme

**Files:**
| File | Change |
|------|--------|
| `client/src/components/NearbyWineShops.tsx` | NEW: nearby shops component |
| `client/src/pages/JourneyDetail.tsx` | Add `NearbyWineShops` below wine options per chapter |

**3D. Privacy considerations**

- Coordinates are sent to our server only to proxy to Google — NOT stored in database, NOT logged
- Add brief explanation before requesting permission: "We'll use your location to find wine shops nearby. Your location is not stored."
- No GDPR consent form needed — location is used transiently and not persisted

---

## Acceptance Criteria

### Three-Beat Questions
- [x] AI-generated questions follow notice→(educational note)→rate pattern per characteristic
- [x] Beginner gets 5 traits, intermediate 6, advanced 8 (AI picks which traits)
- [x] Educational note displays inline after answering a notice question
- [x] Rate answers stored in `preferences` section of `TastingResponses`
- [x] All scales use 1-10 consistently
- [x] Tannins included for reds/rosé, omitted for whites
- [x] "Would you buy again?" boolean always included
- [x] Fallback questions also follow the two-beat structure
- [x] `normalizeCanonicalFields()` uses explicit canonical IDs, not just keyword matching
- [x] Historical tastings display correctly (backward compatible)

### Dual Wine Recommendations
- [x] Each chapter shows budget and splurge wine options side-by-side
- [x] Budget option shows "Under $25" — splurge shows no price
- [x] Each option includes: description, what to ask, label tips, substitutes
- [x] User selection persists through navigation to `SoloTastingNew`
- [x] Admin can trigger AI generation of shopping guide per chapter
- [ ] Admin can edit AI-generated shopping guide before publishing
- [x] Chapters without wine options gracefully show old-style shopping tips

### Nearby Wine Shops
- [x] "Find wine shops near you" button on chapter view
- [x] Shows list of shops with name, address, rating
- [x] Tapping a shop opens native maps app
- [x] Graceful handling of: permission denied, no results, API error
- [x] API key never exposed to client
- [x] Results cached (30-min TTL, grid-based)
- [x] Location not stored or logged

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AI prompt changes break question format | High | Explicit canonical IDs + zod validation + fallback questions |
| `max_completion_tokens` still insufficient for 8-trait advanced | Medium | Level-dependent limits (3000/3500/4500); monitor fallback rate |
| Three-beat loop makes sessions too long | Medium | AI picks only relevant traits; user can skip; test with real users |
| Google Places API costs escalate | Low | Grid-based caching, rate limiting, 1k free/month is plenty for early stage |
| Wine price recommendations inaccurate | Medium | No specific prices for splurge; "under $25" is a guideline, not a guarantee |
| `WineOption.level` enum change breaks existing data | Medium | DB migration to map `entry`→`budget`, `premium`→`splurge`, drop `mid`; or keep both with aliasing |
| localStorage drafts from old schema | Low | Add `schemaVersion` to draft JSON; clear stale drafts on mismatch |

## Implementation Order

1. **Phase 0** — Data pipeline fixes. Deploy and verify.
2. **Phase 1** — Three-beat question loop. Core learning improvement.
3. **Phase 2** — Dual wine options + shopping companion. Complete the acquisition experience.
4. **Phase 3** — Nearby wine shops. Cherry on top.

Each phase is independently deployable and valuable.

## References

### Internal
- `server/services/questionGenerator.ts` — Current AI prompts, fallback questions
- `shared/schema.ts` — `GeneratedQuestion`, `TastingResponses`, `WineOption`, `chapters` table
- `client/src/pages/SoloTastingSession.tsx` — Question rendering, normalization, save
- `client/src/pages/JourneyDetail.tsx` — Journey/chapter UI, wine options display
- `client/src/components/WineOptionCard.tsx` — Wine option card component
- `client/src/pages/SoloTastingNew.tsx` — Tasting entry point, chapter context
- `server/routes/journeys.ts` — Journey API routes including admin CRUD

### Superseded Plans
- `docs/plans/2026-02-20-feat-preference-focused-tasting-questions-plan.md` — Phase 1 fixes incorporated; prompt rewrite approach evolved into three-beat loop

### Institutional Learnings
- `docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md` — AI category→schema mapping gotcha
- `INSTITUTIONAL_LEARNINGS_QUESTION_GENERATION.md` — Never silently drop unmapped answers

### External
- [Google Places API (New) — Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Google Places API Pricing](https://developers.google.com/maps/billing-and-pricing/pricing) — Enterprise tier: 1,000 free/month with rating field
- [Place Types](https://developers.google.com/maps/documentation/places/web-service/place-types) — Use `liquor_store` (no `wine_store` type)
