---
title: "feat: Integrate group tasting data into taste profile and home page"
type: feat
date: 2026-03-20
deepened: 2026-03-20
---

# Integrate Group Tasting Data Into Taste Profile & Home Page

## Enhancement Summary

**Deepened on:** 2026-03-20
**Sections enhanced:** All phases + new prerequisites
**Research agents used:** TypeScript Reviewer, Performance Oracle, Security Sentinel, Architecture Strategist, Data Integrity Guardian, Code Simplicity Reviewer, Pattern Recognition Specialist, Drizzle ORM Research, TanStack Query Research, Silent Data Loss Learning Analysis, Data Aggregation Best Practices

### Key Improvements From Research
1. **Reordered phases** — fix broken `getGroupTastingPreferences` FIRST (Phase 0) since it's a prerequisite for everything else
2. **Separation of concerns** — storage returns raw rows, normalization lives in service layer only
3. **Simplified category mapping** — lowercase + 4-entry map instead of 8-entry case-variant map
4. **Database indexes** — add `idx_participants_email` and `idx_slides_type` before querying at scale
5. **Hardened normalization** — division-by-zero guard, input clamping, boundary validation
6. **Parallel queries** — `Promise.all` for independent DB calls in fingerprint
7. **Unmapped category logging** — log warnings instead of silently skipping unknown categories
8. **Use Drizzle builder** — avoid raw SQL, use Drizzle's `.innerJoin()` pattern for type safety
9. **Equal weighting** — start with 1.0 weight for group signals (same as solo full), simplify later if needed
10. **Leaner return types** — drop `groupWines` and `groupTastingCount` from storage; derive in service layer

### New Considerations Discovered
- Email case sensitivity bug exists in `getAllParticipantsByEmail` — fix alongside this work
- `/api/dashboard/:email/*` routes lack auth guards (pre-existing, out of scope but flagged)
- Same wine tasted across multiple group sessions needs dedup strategy
- Bayesian averaging for sparse data could improve confidence scoring (future enhancement)

---

## Overview

Group tasting data is partially integrated (dashboard wine collection, preference bars on `/api/dashboard/:email/preferences`) but completely absent from the taste profile synthesis pipeline, the solo home tab, and the `/api/me/summary` endpoint. Users who have only done group tastings see empty states telling them to "complete a tasting" — despite having real tasting history.

This plan integrates group response data into all user-facing surfaces so both data sources contribute equally to a user's wine identity.

## Problem Statement

Three independent data pipelines power user-facing surfaces, and all three query only the `tastings` table (solo):

| Surface | Endpoint | Group Data? |
|---|---|---|
| Taste Profile bars (TasteIdentityCard) | `/api/me/taste-profile` → `getOrSynthesizeProfile(userId)` | **No** |
| Profile fingerprint (cache key) | `getProfileFingerprint(userId)` | **No** |
| Solo tab preferences | `/api/solo/preferences` → `getUserPreferences(userId)` | **No** |
| Solo tab recent activity | `/api/solo/tastings` | **No** |
| `/api/me/summary` stats | queries `tastings` table | **No** |
| Dashboard preference bars | `/api/dashboard/:email/preferences` | **Yes** (but broken — returns nulls) |

A group-only user like `violamgx@gmail.com` sees:
- TasteIdentityCard: "Your Profile is Forming"
- Solo tab: "Your journal awaits" with CTA "Start your first tasting"
- Stats: "0 tastings completed"

## Critical Discovery: Data Shape Mismatch

### Solo tastings (`tastings` table)
- One row per wine, rich nested blob in `responses` JSONB
- Traits at: `responses.taste.sweetness` or `responses.structure.sweetness` (1-5 scale)
- Also contains: flavors array, aromas array, notes, overall rating, wouldBuyAgain

### Group responses (`responses` table)
- One row per participant per slide
- Score stored as: `answer_json.selectedScore` (numeric)
- Trait identity NOT in answer — lives in `slides.payloadJson.category` (e.g., `"Body"`, `"Tannins"`)
- **Mixed scales**: Body slides use 1-5, most others use 1-10
- Wine metadata lives in `packageWines` table, joined via `slides.packageWineId`

### Existing `getGroupTastingPreferences` IS broken
It queries `answer_json->>'sweetness'` directly (storage.ts:4884), but actual group answers are `{ selectedScore: 7 }` with the trait name in the slide's `payloadJson.category`, not in the answer. This means the preferences endpoint returns null trait values for group data, falling back to session count only.

## Proposed Solution

### Architecture: Adapter Pattern with Clean Layer Separation

**Research insight**: Storage layer returns raw rows. All normalization (category mapping, scale conversion, weighting) lives in the service layer. This keeps the storage layer a pure data accessor and makes the mapping logic testable in isolation.

```
Storage Layer (raw data):
  Solo:  tastings table → getTastingSignalsForProfile(userId) → raw solo rows
  Group: responses + slides + packageWines → getGroupResponsesForProfile(email) → raw group rows

Service Layer (normalization + synthesis):
  normalizeGroupResponses(rawRows) → groupTraitSignals[]
  buildSignalSummary(soloSignals, groupSignals) → mergedSignalSummary
  synthesizeProfile(summary) → TasteProfile
```

### Category-to-Trait Mapping (Simplified)

**Research insight**: Normalize to lowercase at the call site, use a minimal 4-entry map instead of 8 case variants. Log unmapped categories as warnings (per silent-data-loss learning).

```typescript
// server/services/tasteProfileService.ts
const GROUP_CATEGORY_TO_TRAIT: ReadonlyMap<string, TraitName> = new Map([
  ['body', 'body'],
  ['tannins', 'tannins'],
  ['acidity', 'acidity'],
  ['sweetness', 'sweetness'],
]);

// Categories that are intentionally excluded (not trait bars):
// 'intensity' (aroma), 'finish' (length), 'overall' (rating), 'fruit', 'secondary', 'tertiary'

function mapCategoryToTrait(category: string): TraitName | null {
  const trait = GROUP_CATEGORY_TO_TRAIT.get(category.toLowerCase()) ?? null;
  if (!trait && category) {
    console.warn(`[tasteProfile] Unmapped group category: "${category}"`);
  }
  return trait;
}
```

### Scale Normalization (Hardened)

**Research insight**: Guard against division by zero, clamp inputs to valid range, handle edge cases.

```typescript
function normalizeToFivePointScale(value: number, scaleMax: number): number {
  if (scaleMax <= 1) return 3; // Degenerate scale — return midpoint
  const clamped = Math.max(1, Math.min(value, scaleMax));
  if (scaleMax === 5) return clamped;
  // Linear map: [1, scaleMax] → [1, 5]
  return 1 + ((clamped - 1) / (scaleMax - 1)) * 4;
}
```

### Signal Weighting

**Research insight**: Start simple — weight group signals at 1.0 (same as full solo tastings). Both provide explicit per-trait ratings. Differentiate weights later only if data quality issues emerge.

```typescript
// Named constants, centralized
const SIGNAL_WEIGHT = {
  FULL_SOLO: 1.0,    // Full tasting with all trait sliders
  GROUP: 1.0,         // Group per-trait scale responses (same fidelity)
  QUICK_RATE: 0.5,    // Quick rate — overall only, no per-trait data
} as const;
```

---

## Implementation Phases

### Phase 0: Prerequisites (Do First)

**Goal**: Fix the broken foundation and add indexes before building on top.

#### 0a. Add database indexes

**File**: `shared/schema.ts` (add indexes), then `npm run db:push`

The group signal queries will JOIN `participants` by email and filter `slides` by type. Without indexes, these are full table scans.

```typescript
// Add to schema.ts index definitions
export const participantsEmailIdx = index('idx_participants_email')
  .on(participants.email);

export const slidesTypeIdx = index('idx_slides_type')
  .on(slides.type);
```

**Research insight (Performance Oracle)**: These indexes are critical. The `participants` table grows with every group session. Without `idx_participants_email`, every fingerprint check and group signal query scans the full table.

#### 0b. Fix `getGroupTastingPreferences` (storage.ts:4865-4910)

**File**: `server/storage.ts`

This is the prerequisite for everything. The current implementation queries `answer_json->>'sweetness'` which doesn't match actual data. Fix to JOIN through slides:

**Storage layer** — return raw rows only:

```typescript
async getGroupScaleResponses(participantIds: number[]): Promise<Array<{
  category: string;
  scaleMax: number;
  score: number;
}>> {
  if (participantIds.length === 0) return [];

  return db.select({
    category: sql<string>`${slides.payloadJson}->>'category'`,
    scaleMax: sql<number>`(${slides.payloadJson}->>'scale_max')::int`,
    score: sql<number>`(${responses.answerJson}->>'selectedScore')::numeric`,
  })
  .from(responses)
  .innerJoin(slides, eq(responses.slideId, slides.id))
  .where(
    and(
      inArray(responses.participantId, participantIds),
      eq(sql`${slides.payloadJson}->>'question_type'`, 'scale'),
      isNotNull(sql`${responses.answerJson}->>'selectedScore'`),
    )
  );
}
```

**Service layer** — map categories, normalize scales, compute averages:

```typescript
function computeGroupPreferences(
  rawRows: Array<{ category: string; scaleMax: number; score: number }>
): Record<TraitName, number | null> {
  const traitAccum = new Map<TraitName, number[]>();

  for (const row of rawRows) {
    const trait = mapCategoryToTrait(row.category);
    if (!trait) continue;

    const normalized = normalizeToFivePointScale(row.score, row.scaleMax);
    const existing = traitAccum.get(trait) ?? [];
    existing.push(normalized);
    traitAccum.set(trait, existing);
  }

  const result: Record<string, number | null> = {};
  for (const trait of ['sweetness', 'acidity', 'tannins', 'body'] as TraitName[]) {
    const values = traitAccum.get(trait);
    result[trait] = values ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
  return result as Record<TraitName, number | null>;
}
```

**Why first**: This fixes the existing broken dashboard preference bars AND validates the category→trait mapping before using it in the synthesis pipeline.

#### 0c. Fix email case sensitivity

**File**: `server/storage.ts` — `getAllParticipantsByEmail`

**Research insight (Data Integrity Guardian)**: The current function does case-sensitive email matching. Normalize email to lowercase at the call site (cheaper than `LOWER()` in SQL which prevents index usage):

```typescript
async getAllParticipantsByEmail(email: string): Promise<Participant[]> {
  const normalizedEmail = email.toLowerCase();
  // ... existing query using normalizedEmail
}
```

Apply the same normalization in all new methods that look up participants by email.

---

### Phase 1: Backend — Group Signal Extraction (Core Fix)

**Goal**: Feed group data into the taste profile synthesis pipeline.

#### 1a. New storage method: `getGroupResponsesForProfile(email)`

**File**: `server/storage.ts`

**Research insight (Architecture + Pattern)**: Use Drizzle query builder (not raw SQL) for type safety. Return raw rows — normalization happens in the service layer.

```typescript
async getGroupResponsesForProfile(email: string): Promise<Array<{
  responseId: number;
  selectedScore: number | null;
  answeredAt: Date | null;
  category: string | null;
  scaleMax: number | null;
  questionType: string | null;
  packageWineId: number | null;
}>> {
  const normalizedEmail = email.toLowerCase();

  const rows = await db.select({
    responseId: responses.id,
    selectedScore: sql<number | null>`(${responses.answerJson}->>'selectedScore')::numeric`,
    answeredAt: responses.answeredAt,
    category: sql<string | null>`${slides.payloadJson}->>'category'`,
    scaleMax: sql<number | null>`(${slides.payloadJson}->>'scale_max')::int`,
    questionType: sql<string | null>`${slides.payloadJson}->>'question_type'`,
    packageWineId: slides.packageWineId,
  })
  .from(responses)
  .innerJoin(slides, eq(responses.slideId, slides.id))
  .innerJoin(participants, eq(responses.participantId, participants.id))
  .where(
    and(
      eq(sql`LOWER(${participants.email})`, normalizedEmail),
      eq(slides.type, 'question'),
    )
  )
  .orderBy(desc(responses.answeredAt))
  .limit(500);  // Safety limit — 500 responses ≈ 50 sessions × 10 slides

  return rows;
}
```

**Research insight (Performance Oracle)**: The `LIMIT 500` prevents unbounded result sets. For most users this returns all data; power users with 50+ sessions would need pagination (future concern).

**Note on LOWER()**: We use `LOWER()` here despite the performance note because `idx_participants_email` is a btree index. For the small result sets we expect, the sequential scan cost is negligible. If this becomes a hot path, we can add a functional index `CREATE INDEX ON participants (LOWER(email))`.

#### 1b. Service layer: `normalizeGroupResponses()`

**File**: `server/services/tasteProfileService.ts`

```typescript
interface GroupTraitSignal {
  trait: TraitName;
  value: number;         // normalized to 1-5
  packageWineId: number;
  answeredAt: Date;
}

function normalizeGroupResponses(
  rawRows: Array<{ /* shape from 1a */ }>
): GroupTraitSignal[] {
  const signals: GroupTraitSignal[] = [];

  for (const row of rawRows) {
    if (row.questionType !== 'scale') continue;
    if (row.selectedScore == null || row.packageWineId == null) continue;

    const trait = mapCategoryToTrait(row.category ?? '');
    if (!trait) continue;

    signals.push({
      trait,
      value: normalizeToFivePointScale(row.selectedScore, row.scaleMax ?? 10),
      packageWineId: row.packageWineId,
      answeredAt: row.answeredAt ?? new Date(),
    });
  }

  return signals;
}
```

#### 1c. Extend `buildSignalSummary` with group signals

**File**: `server/services/tasteProfileService.ts`

Add a `groupTraits` bucket to `ProfileSignalSummary` alongside `explicitTraits` and `implicitTraits`:

```typescript
interface ProfileSignalSummary {
  explicitTraits: Map<TraitName, WeightedValue[]>;  // existing — full solo
  implicitTraits: Map<TraitName, WeightedValue[]>;  // existing — quick rate
  groupTraits: Map<TraitName, WeightedValue[]>;     // NEW — group responses
  // ... existing fields (topFlavors, topAromas, ratingsByWineType, etc.)
}
```

In `buildSignalSummary()`, merge group signals:

```typescript
for (const signal of groupSignals) {
  const existing = summary.groupTraits.get(signal.trait) ?? [];
  existing.push({ value: signal.value, weight: SIGNAL_WEIGHT.GROUP });
  summary.groupTraits.set(signal.trait, existing);
}
```

In `computeWeightedTraitAverage()` (the deterministic fallback), include `groupTraits`:

```typescript
function computeWeightedTraitAverage(trait: TraitName, summary: ProfileSignalSummary): number | null {
  const explicit = summary.explicitTraits.get(trait) ?? [];
  const implicit = summary.implicitTraits.get(trait) ?? [];
  const group = summary.groupTraits.get(trait) ?? [];

  const all = [...explicit, ...implicit, ...group];
  if (all.length === 0) return null;

  const weightedSum = all.reduce((sum, wv) => sum + wv.value * wv.weight, 0);
  const totalWeight = all.reduce((sum, wv) => sum + wv.weight, 0);
  return weightedSum / totalWeight;
}
```

Group data does NOT contribute to `topFlavors`, `topAromas`, or `recentNotes` (group slides don't capture these).

#### 1d. Update `synthesizeProfile()` to fetch group data

**File**: `server/services/tasteProfileService.ts`

```typescript
async function synthesizeProfile(userId: number, fingerprint: string, previousProfile: TasteProfile | null) {
  const soloSignals = await storage.getTastingSignalsForProfile(userId);

  // Get user email for group lookup
  const user = await storage.getUser(userId);
  let groupSignals: GroupTraitSignal[] = [];
  if (user?.email) {
    const rawGroupRows = await storage.getGroupResponsesForProfile(user.email);
    groupSignals = normalizeGroupResponses(rawGroupRows);
  }

  const summary = buildSignalSummary(soloSignals, groupSignals);

  // Count unique group wines for totalTastings
  const groupWineCount = new Set(groupSignals.map(s => s.packageWineId)).size;

  // Update dataSnapshot
  summary.totalTastings = summary.soloTastingCount + groupWineCount;

  // Update confidence level
  summary.confidenceLevel = computeConfidenceLevel(
    summary.fullSoloCount,
    summary.quickRateCount,
    groupWineCount,
  );

  // ... rest of synthesis (GPT call or deterministic fallback)
}
```

#### 1e. Update `computeConfidenceLevel` to include group count

```typescript
function computeConfidenceLevel(fullCount: number, quickCount: number, groupCount: number): string {
  const effective = fullCount + groupCount + quickCount * 0.5;
  if (effective >= 10) return 'established';
  if (effective >= 5) return 'developing';
  if (effective >= 2) return 'emerging';
  return 'new';
}
```

#### 1f. Update GPT synthesis prompt

When group data is present, add context to the GPT prompt so it knows some signals may be sparse:

```typescript
// Add to SYNTHESIS_PROMPT when groupTraits are non-empty
const groupContext = groupSignals.length > 0
  ? `\n\nNote: Some trait data comes from group tasting sessions, which provide per-trait ratings but not flavor/aroma details. ${groupWineCount} wines were tasted in group settings.`
  : '';
```

#### 1g. Extend `getProfileFingerprint` to include group data

**File**: `server/storage.ts` — `getProfileFingerprint(userId)`

**Research insight (Performance)**: Use `Promise.all` for the independent queries:

```typescript
async getProfileFingerprint(userId: number): Promise<string> {
  const [soloResult, user] = await Promise.all([
    db.select({ id: tastings.id, updatedAt: tastings.updatedAt })
      .from(tastings).where(eq(tastings.userId, userId)).orderBy(tastings.id),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
    }),
  ]);

  let groupContent = '';
  if (user?.email) {
    const normalizedEmail = user.email.toLowerCase();
    const groupResult = await db.select({ id: responses.id, answeredAt: responses.answeredAt })
      .from(responses)
      .innerJoin(participants, eq(responses.participantId, participants.id))
      .where(eq(sql`LOWER(${participants.email})`, normalizedEmail))
      .orderBy(responses.id);

    groupContent = groupResult.map(r => `g${r.id}:${r.answeredAt?.getTime() ?? 0}`).join(',');
  }

  const soloContent = soloResult.map(t => `${t.id}:${t.updatedAt?.getTime() ?? 0}`).join(',');
  const combined = `${soloContent}|${groupContent}`;

  if (!soloContent && !groupContent) return 'empty';
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
}
```

#### 1h. Add `groupTastings` to `TasteProfile.dataSnapshot`

**File**: `server/services/tasteProfileService.ts`

```typescript
interface DataSnapshot {
  totalTastings: number;        // existing — now solo + group
  soloTastings: number;         // NEW — solo only count
  groupTastings: number;        // NEW — unique group wines count
  lastTastingDate: string;
  confidenceLevel: string;
}
```

This lets the frontend know whether group data contributed, without needing separate API calls.

---

### Phase 2: Backend — Home Page Endpoints

**Goal**: `/api/me/summary` and `/api/solo/preferences` reflect combined data.

#### 2a. Update `/api/me/summary` (dashboard.ts:680-748)

Add group tasting stats alongside solo:
- `totalGroupTastings`: count of unique sessions
- `totalCombinedTastings`: solo + group
- `recentActivity`: interleaved list of recent solo tastings + group sessions, sorted by date

The group session data is available from existing `getAllParticipantsByEmail` → unique `sessionId` values.

#### 2b. Switch `/api/solo/preferences` callers to unified endpoint

Rather than changing the `/api/solo/preferences` semantics (it's correctly named "solo"), update `HomeTastings.tsx` and `HomeV2.tsx` to call `/api/dashboard/:email/preferences` (which already merges both sources, and will work correctly after Phase 0b fix).

**Research insight (TanStack Query)**: Use a query key factory pattern for consistent cache invalidation:

```typescript
// client/src/lib/queryKeys.ts
export const preferenceKeys = {
  all: ['preferences'] as const,
  solo: (userId: number) => [...preferenceKeys.all, 'solo', userId] as const,
  unified: (email: string) => [...preferenceKeys.all, 'unified', email] as const,
};
```

---

### Phase 3: Frontend — Home Page Empty States & Activity

**Goal**: Group-only users never see misleading empty states.

#### 3a. Fix TasteIdentityCard empty state

**File**: `client/src/components/dashboard/TasteIdentityCard.tsx`

No frontend changes needed if Phase 1 is done correctly — `getOrSynthesizeProfile` will return a real profile for group-only users. The "Your Profile is Forming" state will only show when there's genuinely no data.

#### 3b. Fix solo tab empty state copy

**File**: `client/src/pages/HomeV2.tsx` — lines 637-661

When `tastingsData.tastings.length === 0` but `stats.groupTastings > 0`:
- Change "Your journal awaits" to "Your solo journal awaits"
- Change "Taste your first wine..." to "You've tasted {stats.groupTastings} wines in group sessions. Try a solo tasting to deepen your personal profile."
- Keep the "Start New Tasting" CTA

When both solo and group are 0:
- Keep current empty state

#### 3c. Show group activity on solo tab

**File**: `client/src/pages/HomeV2.tsx`

Change "Recent Solo Tastings" to "Recent Tastings" and include group session summaries in the activity list. Each group entry shows:
- Session/package name
- Number of wines tasted
- Date
- "Group" badge (vs "Solo" badge on solo entries)

Data source: the existing `/api/dashboard/:email/history` endpoint already returns group tasting history.

#### 3d. Fix HomeTastings.tsx preferences source

**File**: `client/src/pages/HomeTastings.tsx`

Switch from `/api/solo/preferences` to `/api/dashboard/:email/preferences` for the taste profile summary section, and use `stats.totalCombinedTastings` (from unified stats) for the empty state check.

---

## Acceptance Criteria

- [x] Group-only user sees populated taste profile bars (not "Your Profile is Forming")
- [x] Group-only user sees activity on home tab (not "Your journal awaits")
- [x] Mixed user's taste profile reflects both solo + group data
- [x] Profile fingerprint invalidates when new group responses are submitted
- [x] Scale normalization: group 1-10 scores map correctly to 1-5 trait bars
- [x] `dataSnapshot.totalTastings` includes group wine count
- [x] `dataSnapshot.groupTastings` shows group-specific count
- [x] Dashboard preference bars work correctly (fix broken `getGroupTastingPreferences`)
- [x] No regressions for solo-only users
- [x] Unmapped group categories logged as warnings (not silently dropped)
- [x] Email matching is case-insensitive throughout

## Edge Cases

- **Participant with null email**: Gracefully excluded — `getGroupResponsesForProfile` returns empty array, no crash
- **Email casing mismatch** (e.g., `Viola@gmail.com` vs `viola@gmail.com`): Normalize to lowercase at call site before query
- **Group slides without trait categories** (e.g., text questions, multiple choice): Filtered by `questionType !== 'scale'` check in `normalizeGroupResponses`
- **Unmapped scale categories** (e.g., `intensity`, `finish`): `mapCategoryToTrait` returns null, logs warning, skips
- **User who deletes their account**: Group participant records remain orphaned (existing behavior, out of scope)
- **GPT synthesis threshold**: Count group wines toward the 3-tasting minimum for GPT synthesis, note in prompt that flavors/aromas may be sparse
- **Division by zero in normalization**: `scaleMax <= 1` returns midpoint (3) as safe fallback
- **Score out of range**: Clamped to `[1, scaleMax]` before normalization
- **Same wine across multiple group sessions**: Each session's ratings are independent trait signals — no dedup needed (more data points = better average)
- **Very large response count (50+ sessions)**: `LIMIT 500` on storage query prevents unbounded results
- **Null `selectedScore` in response**: Filtered out at both SQL level (`IS NOT NULL`) and TypeScript level (`== null` check)

## Files to Modify

| File | Changes |
|---|---|
| `shared/schema.ts` | Add `idx_participants_email` and `idx_slides_type` indexes |
| `server/storage.ts` | New `getGroupResponsesForProfile(email)`, new `getGroupScaleResponses(participantIds)`, fix `getGroupTastingPreferences`, extend `getProfileFingerprint`, fix `getAllParticipantsByEmail` email casing |
| `server/services/tasteProfileService.ts` | `mapCategoryToTrait()`, `normalizeToFivePointScale()`, `normalizeGroupResponses()`, `groupTraits` bucket in `ProfileSignalSummary`, update `buildSignalSummary`, `computeConfidenceLevel`, `synthesizeProfile`, GPT prompt context, `dataSnapshot` shape |
| `server/routes/dashboard.ts` | Update `/api/me/summary` to include group stats + combined activity |
| `client/src/pages/HomeV2.tsx` | Fix empty state copy, show group activity in solo tab, use unified preferences |
| `client/src/pages/HomeTastings.tsx` | Switch preferences source to unified endpoint |

## Implementation Order

```
Phase 0a: Add indexes (schema.ts + db:push)          ← foundation
Phase 0b: Fix getGroupTastingPreferences              ← validates mapping approach
Phase 0c: Fix email case sensitivity                  ← data integrity
Phase 1a: getGroupResponsesForProfile (storage)       ← raw data extraction
Phase 1b: normalizeGroupResponses (service)            ← normalization layer
Phase 1c: Extend buildSignalSummary                    ← merge into synthesis
Phase 1d: Update synthesizeProfile                     ← tie it together
Phase 1e-f: Confidence + GPT prompt                    ← quality tuning
Phase 1g: Extend fingerprint                           ← cache invalidation
Phase 1h: dataSnapshot shape                           ← API contract
Phase 2a: /api/me/summary                              ← home page stats
Phase 2b: Switch frontend preference calls             ← use unified data
Phase 3a-d: Frontend empty states + activity           ← user-facing polish
```

## What's NOT in Scope

- Retroactive email matching for anonymous participants (null email)
- Sommelier tips integration with group data
- Separate "group profile" vs "solo profile" views
- Changing the Group tab UI
- Auth guards on `/api/dashboard/:email/*` routes (pre-existing gap, separate ticket)
- Bayesian averaging for sparse data (future enhancement)
- Confidence tier display on frontend (future enhancement)

## References

- Existing unified merge pattern: `server/routes/dashboard.ts:184-247`
- Past learning on schema mapping: `docs/solutions/logic-errors/silent-data-loss-solo-tasting-saves-20260215.md` — always build explicit mapping layers, never assume field names align
- Group question templates: `server/services/questionGenerator.ts:88-213`
- Default slide templates: `server/storage.ts:420-540` (shows scale ranges per category)
- Drizzle ORM JOIN patterns: used throughout `server/storage.ts` (e.g., `getAllParticipantsByEmail`)
- TanStack Query key factories: https://tkdodo.eu/blog/effective-react-query-keys
