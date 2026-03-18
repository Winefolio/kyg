---
title: "feat: AI-Generated Personal Wine Notes in Collection"
type: feat
date: 2026-03-17
---

# AI-Generated Personal Wine Notes in Collection

## Overview

Add a short, AI-generated personal note to each wine in the user's collection that summarizes what they said they liked (or didn't) about the wine during their tasting. Turns raw response data into a human-readable "here's what you thought" blurb.

## Problem Statement

The wine collection currently shows technical characteristics (Body: Full, Tannins: 5, Acidity: 6) but nothing personal. Users can't quickly remember *why* they rated a wine 8/10 or what specifically they enjoyed. Their actual tasting responses (preferences, notes, buy-again answers) are stored but never surfaced in a readable way.

## Proposed Solution

Generate a 1-2 sentence personal note at tasting save time and display it on the wine card in the collection.

**Example output:**
> "You loved the bold dark fruit and grippy tannins. The long finish sealed it — you'd definitely buy this again."

> "Pleasant citrus notes but you found the acidity a bit sharp for your taste. Maybe not a rebuy."

## Technical Approach

### 1. Generate note at tasting completion

**File:** `server/routes/tastings.ts` (or wherever solo tasting save happens)

After the tasting responses are saved, fire an async GPT call to generate the personal note. Use `gpt-5-mini` (this is simple summarization, not complex reasoning).

**Prompt shape:**
```
Given this user's tasting responses for {wineName}, write a 1-2 sentence personal note
summarizing what they noticed and whether they enjoyed it. Write in second person ("You...").
Be conversational, not technical. Reference specific things they liked or disliked.

Responses: {responses JSON}
Overall rating: {rating}/10
Would buy again: {wouldBuyAgain}
```

### 2. Store the note

**Option A (simplest):** Add to the existing `responses` JSONB under `overall.personalNote`. No schema migration needed.

**Option B:** Add a `personal_note` text column to the `tastings` table. Cleaner but requires migration.

**Recommend Option A** — no migration, and the note logically belongs with the responses.

Store path: `tastings.responses.overall.personalNote`

### 3. Surface in the API

**File:** `server/storage.ts` — `getUserWineScores()` (line ~5141)

For solo wines, the full `tastingResponses` object is already returned in the score. The personal note will be available at `wine.tastingResponses.overall.personalNote` with no API changes needed.

### 4. Display on wine card

**File:** `client/src/pages/UserDashboard.tsx` — wine collection rendering (~line 1042)

Add below the wine name/description, before the characteristics:

```tsx
{wine.tastingResponses?.overall?.personalNote && (
  <p className="text-sm text-white/70 italic mt-2">
    "{wine.tastingResponses.overall.personalNote}"
  </p>
)}
```

## Acceptance Criteria

- [ ] After completing a solo tasting, a personal note is generated and stored in `responses.overall.personalNote`
- [ ] The note appears on the wine card in the collection view (both grid and list)
- [ ] Note is 1-2 sentences, conversational, second person ("You loved...")
- [ ] Note references specific things from their responses (fruit preference, tannin enjoyment, buy-again intent)
- [ ] Generation failure doesn't break the tasting save (fire-and-forget with error logging)
- [ ] Existing tastings without notes just don't show the note (graceful absence)

## Key Files

- `server/routes/tastings.ts` — solo tasting save handler (add generation call)
- `server/storage.ts:5141` — `getUserWineScores()` (no changes needed, already returns responses)
- `server/openai-client.ts` — add `generatePersonalWineNote()` function
- `client/src/pages/UserDashboard.tsx:1042` — wine collection card rendering (add note display)

## Risks & Gotchas

- **Rate limit**: 10 req/min OpenAI limit (`aiRateLimit`). Single note per tasting save is fine. Don't backfill all at once.
- **Fire-and-forget**: Generate async after save succeeds. If GPT call fails, log it and move on — the tasting is already saved. User just won't see a note.
- **Tone**: Keep the prompt tight. "You loved" / "You found" — not "This wine exhibits". It's their personal diary, not a wine critic review.
