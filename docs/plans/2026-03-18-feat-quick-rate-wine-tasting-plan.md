---
title: "feat: Quick Rate Wine Tasting"
type: feat
date: 2026-03-18
---

# Quick Rate Wine Tasting

## Overview

Add a lightweight "Quick Rate" flow so users can snap a wine label, rate it 1-10 with an optional note, and save in under 30 seconds. This serves the party/dinner use case where a full 5-minute tasting isn't practical. Quick rates are weighted less than full tastings in preference calculations and don't count toward level-up milestones. Users are nudged toward full tastings as the premium experience.

## Problem Statement

The only way to log a wine is through the full solo tasting flow (12+ questions, 5-10 minutes). This blocks casual wine logging -- e.g., at a party someone drinks a wine they love but won't stop to answer questions about acidity and tannins. We lose that data entirely. Any data (even just a 1-10 rating) is better than no data.

## Decisions Made

- **Deepen flow**: Create a new full tasting (not update existing record). Simpler to build, no merge logic.
- **Camera**: Auto-opens on entry. Falls back to manual name input if dismissed.
- **Home layout**: Full-width banner above the existing 2-column grid.
- **Rating UI**: Horizontal slider (1-10). Matches existing scale questions in the app.

---

## Technical Approach

### Phase 1: Schema Migration

**File: `shared/schema.ts` (line 677)**

Add `tastingMode` column to the `tastings` table:

```typescript
tastingMode: varchar("tasting_mode", { length: 20 }).default('full').notNull(),
```

Update `insertTastingSchema` (line 712) to accept the new field:

```typescript
tastingMode: z.enum(['quick', 'full']).optional().default('full'),
```

**New file: `drizzle/0005_add_tasting_mode.sql`**

```sql
ALTER TABLE tastings ADD COLUMN IF NOT EXISTS tasting_mode VARCHAR(20) DEFAULT 'full' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tastings_tasting_mode ON tastings(tasting_mode);
```

All existing tastings auto-default to `'full'` -- backward compatible.

### Phase 2: API Changes

**File: `server/routes/tastings.ts` (line 292)**

Modify `POST /api/solo/tastings` (not a new endpoint -- same payload shape, just with `tastingMode`):

1. **Read `tastingMode`** from request body (line ~309):
   ```typescript
   const tastingMode = tastingData.tastingMode || 'full';
   ```

2. **Include in insert** (line 314-323):
   ```typescript
   tastingMode,
   ```

3. **Conditional level-up** (line 325-346): Only increment `tastingsCompleted` and check level-up thresholds when `tastingMode === 'full'`. For quick rates, just read the current user state without incrementing.

4. **Conditional background jobs** (line 351-402):
   - Wine characteristics: ALWAYS run (enriches wine card, reusable)
   - Recommendations: SKIP for quick rates (insufficient trait data)
   - Personal wine note: Use template function for quick rates (no GPT call)

5. **Conditional analytics** (line 411-413): Track with `mode: 'quick'` property so it can be segmented.

**File: `server/openai-client.ts`**

Add `generateQuickRateNote()` -- pure string template, no GPT:

```typescript
export function generateQuickRateNote(wineName: string, rating: number, userNote?: string): string {
  const descriptions: Record<number, string> = {
    1: "not for you at all", 2: "not your style", 3: "below average",
    4: "just okay", 5: "decent but forgettable", 6: "pretty good",
    7: "solid — you'd drink it again", 8: "really enjoyed this one",
    9: "loved it — a standout", 10: "absolutely loved it"
  };
  const desc = descriptions[Math.round(Math.min(10, Math.max(1, rating)))] || "you rated this";
  let note = `You gave ${wineName} a ${rating}/10 — ${desc}.`;
  if (userNote) note += ` You noted: "${userNote}"`;
  return note;
}
```

### Phase 3: Preference Calculation Filters

**Key insight**: Quick-rate responses have no `taste` or `structure` objects, so PostgreSQL's `AVG()` already skips NULLs for trait values. But we must filter the COUNT to avoid inflating the tasting weight.

**File: `server/storage.ts` (line ~4827)** — `getSoloTastingPreferences()`:
Add `AND tasting_mode = 'full'` to WHERE clause.

**File: `server/routes/tastings.ts` (line ~96)** — `getUserPreferences()`:
Add `AND tasting_mode = 'full'` to WHERE clause.

No changes needed to `dashboard.ts` — it already uses the filtered counts.

**Important**: Never store zeroed-out trait values for quick rates (e.g., `{ taste: { sweetness: 0 } }`). Only store `{ overall: { rating, notes } }`. This ensures NULLs propagate correctly through AVG().

### Phase 4: QuickRate Page

**New file: `client/src/pages/QuickRate.tsx`**

State machine: `'capture'` → `'rating'` → `'saving'` → `'done'`

**Step 1 — Capture (auto-open camera)**:
- On mount, trigger the hidden file input (reuse pattern from `SoloTastingNew.tsx` line 160)
- Call `POST /api/solo/wines/recognize` with the image
- On success: auto-fill wine info, transition to `'rating'`
- On fail/dismiss: show manual wine name input with keyboard focused
- Store photo for `photoUrl` (user captured it, keep it for the wine card)

**Step 2 — Rating**:
- Wine name at top (editable, tap to change)
- Wine photo thumbnail if available
- Large horizontal slider (1-10) using existing `Slider` component from shadcn/ui
  - Default state: empty (no pre-selected value). Save button disabled until rating is selected
  - Large number display showing current value
- Optional text area: "Quick note? (optional)" — max 500 characters
- "Save" button (primary, full-width)

**Step 3 — Save**:
- Payload:
  ```json
  {
    "wineName": "...", "wineRegion": "...", "grapeVariety": "...",
    "wineType": "...", "wineVintage": 2020, "photoUrl": "...",
    "tastingMode": "quick",
    "responses": { "overall": { "rating": 8, "notes": "Great at dinner" } }
  }
  ```
- Invalidate query keys: `/api/solo/tastings`, `/api/solo/preferences`, `/api/dashboard`
- Disable save button during mutation to prevent double-tap

**Step 4 — Done + Nudge**:
- Checkmark animation (Framer Motion)
- "Saved! You rated [Wine Name] [X]/10"
- **Primary CTA**: "Try a Full Tasting" → navigates to `/tasting/new` with wine info as query params
- **Secondary**: "Done" → navigates to `/home`
- Haptic feedback: `triggerHaptic("success")`

**Design**: Match existing dark theme, glass morphism, Framer Motion entry animations. Entire flow completable in under 30 seconds.

### Phase 5: Routing

**File: `client/src/App.tsx`**

```typescript
const QuickRate = lazy(() => import("@/pages/QuickRate"));
// In Router:
<Route path="/quick-rate" component={QuickRate} />
```

### Phase 6: Home Screen Entry Point

**File: `client/src/pages/HomeV2.tsx` (line ~462, SoloTabContent)**

Add a full-width Quick Rate banner ABOVE the existing 2-column grid:

```tsx
<motion.button
  onClick={() => setLocation("/quick-rate")}
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 text-left flex items-center gap-4 shadow-lg shadow-amber-500/25"
>
  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
    <Camera className="w-6 h-6 text-white" />
  </div>
  <div>
    <h3 className="text-lg font-semibold text-white">Quick Rate</h3>
    <p className="text-white/70 text-sm">Snap, rate, done — 30 seconds</p>
  </div>
</motion.button>
```

### Phase 7: Dashboard Display

**File: `client/src/pages/UserDashboard.tsx`**

- Add a small amber "Quick Rate" badge on wine cards where `tastingMode === 'quick'`
- Quick-rated wines show just the rating number — no trait breakdown (there is none)
- "Wines tried" count includes quick rates. Preference stats exclude them.

**File: `client/src/pages/SoloTastingDetail.tsx`** (if it exists)

- Conditionally hide empty sections (visual, aroma, taste, structure) for quick-rated wines
- Show: wine header, large rating display, user note, AI characteristics card
- Add "Want deeper insights? Do a full tasting of this wine" CTA at bottom

---

## Edge Cases to Handle

| Edge Case | Handling |
|---|---|
| Camera dismissed without photo | Fall back to manual wine name input |
| Wine recognition fails | Show manual entry with toast: "Couldn't read the label" |
| Poor connectivity (party use case) | Standard error handling. Offline queue is a v2 concern |
| Double-tap save | Disable save button during mutation |
| Rating out of range | Slider constrains to 1-10; Zod validates on server |
| Note too long | Cap at 500 chars on frontend |
| Quick-rating a wine you've already tasted | Creates a new record (different occasion). Both appear in history |
| Quick rate within a Journey | Not supported — Quick Rate is standalone only |

## Gotchas from Past Solutions

From `docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md`:
- **Cache invalidation**: Use explicit `queryClient.invalidateQueries()` after save — don't rely on stale time
- **Error visibility**: Show real error toasts on save failure, not fake success screens
- **Session persistence**: Railway deploys can wipe in-memory sessions — this is already handled with PostgreSQL session store

From `docs/solutions/integration-issues/auth-chat-state-sync-race-condition-20260214.md`:
- **Auth consistency**: Use React Query `["/api/auth/me"]` pattern, not `useAuth()` localStorage

---

## Acceptance Criteria

- [ ] New `tasting_mode` column on tastings table (default `'full'`)
- [ ] Quick Rate page at `/quick-rate` with camera → rating → done flow
- [ ] Camera auto-opens on entry, falls back to manual input
- [ ] Slider rating 1-10, optional note (max 500 chars), save
- [ ] Quick rates stored with `tastingMode: 'quick'` in DB
- [ ] Quick rates do NOT increment `tastingsCompleted` or trigger level-up
- [ ] Quick rates excluded from trait preference calculations (sweetness/acidity/tannins/body)
- [ ] Quick rates generate wine characteristics but NOT recommendations
- [ ] Quick rate personal note uses template (no GPT call)
- [ ] Done screen nudges toward full tasting with pre-filled wine info
- [ ] Quick Rate banner on home screen above Solo/Journeys grid
- [ ] Quick-rated wines show badge in dashboard/collection
- [ ] Detail page handles sparse data gracefully (hides empty sections)
- [ ] Double-tap prevention on save
- [ ] Photo stored in `photoUrl` for wine card display

## Key Files

| File | Change |
|------|--------|
| `shared/schema.ts:677` | Add `tastingMode` column to tastings table |
| `drizzle/0005_add_tasting_mode.sql` | NEW — migration |
| `server/routes/tastings.ts:292` | Conditional level-up, AI jobs, analytics by mode |
| `server/routes/tastings.ts:96` | Filter `getUserPreferences()` to full-only |
| `server/openai-client.ts` | Add `generateQuickRateNote()` template |
| `server/storage.ts:4827` | Filter `getSoloTastingPreferences()` to full-only |
| `client/src/pages/QuickRate.tsx` | NEW — quick rate page |
| `client/src/App.tsx` | Add `/quick-rate` route |
| `client/src/pages/HomeV2.tsx:462` | Add Quick Rate banner |
| `client/src/pages/UserDashboard.tsx` | Quick rate badge + conditional sections |

## Implementation Order

1. Schema + migration → `npm run db:push`
2. Server: tastings.ts + openai-client.ts + storage.ts
3. Frontend: QuickRate.tsx + App.tsx route
4. HomeV2 banner
5. Dashboard tweaks
6. End-to-end test
7. Push to main → Railway auto-deploy
