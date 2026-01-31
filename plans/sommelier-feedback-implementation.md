# Sommelier Feedback Implementation Plan

**Created:** 2026-01-27
**Updated:** 2026-01-27
**Status:** Ready for Implementation
**Source:** Chief Sommelier Audio Feedback (4 recordings)

---

## Overview

Our chief sommelier provided feedback across four areas. This plan focuses on the **core product enhancements** that leverage AI for dynamic, personalized experiences. Premium features (Somm Matching, Cellar Building) have been moved to the product roadmap.

### What We're Building Now

| Area | Approach | Key Insight |
|------|----------|-------------|
| **Adaptive Questions** | AI-generated on the fly | Focus on 5 core components; user-prompted level upgrades |
| **Journey Enhancements** | Multiple wine options per step | Flexible price points; shopping guidance |
| **Single Player** | AI-generated recommendations | Varietal-specific questions + next-bottle suggestions |

### What's Moving to Roadmap (Premium/Future)

- Sommelier Matching (lock-in system, direct messaging)
- Cellar Building Service
- Custom sommelier-created journeys

---

## Core Principle: AI-First

We have the power of generative AI. These are cheap GPT-5 calls. Rather than pre-building databases of questions and recommendations, we:

1. **Generate questions on the fly** based on the wine and user level
2. **Generate recommendations dynamically** based on tasting responses
3. **Save generated content to DB over time** for optimization (not as a prerequisite)

---

## Phase 1: AI-Generated Adaptive Questions

### The 5 Core Components

Every tasting question set should help users understand their preferences across:

| Component | What We Ask | Why It Matters |
|-----------|-------------|----------------|
| **Fruit Flavors** | "How much do you enjoy the fruit flavors you're tasting?" | Primary taste driver |
| **Secondary Flavors** | "Do you notice herbal, floral, or earthy notes? How do you feel about them?" | Complexity indicators |
| **Tertiary Flavors** | "Any oak, vanilla, or aged characteristics? Do you enjoy them?" | Winemaking influence |
| **Body** | "How does the weight feel in your mouth - light, medium, or full?" | Texture preference |
| **Acidity** | "How bright or crisp does this wine taste?" | Structure preference |

### AI Question Generation

**Current State** (`server/services/questionGenerator.ts`): Already uses GPT for questions, but prompts are generic.

**Enhancement**: Update the prompt to be more conversational and focused on understanding what the user *likes*.

```typescript
// server/services/questionGenerator.ts

const QUESTION_GENERATION_PROMPT = `
You are a friendly sommelier helping someone discover what they like about wine.
Your goal is to ask questions that help THEM understand their own preferences.

User Level: {{userLevel}} (intro | intermediate | advanced)
Wine: {{wineName}}
Varietal: {{varietal}}
Region: {{region}}

Focus on these 5 core components:
1. Fruit flavors - "How much do you enjoy the fruit flavors you're tasting?"
2. Secondary flavors - herbal, floral, earthy notes
3. Tertiary flavors - oak, vanilla, aged characteristics
4. Body - weight and texture in the mouth
5. Acidity - brightness and crispness

For {{userLevel}} users:
- intro: Keep questions simple and approachable. Use everyday language. 6-8 questions max.
- intermediate: Can use some wine terminology. Ask about specific flavor notes. 10-12 questions.
- advanced: Dive deeper into terroir, winemaking, vintage characteristics. 12-15 questions.

Make it interactive and conversational. The goal is to help them understand what they like about this wine, not test their knowledge.

{{#if varietal}}
Include 2-3 questions specific to {{varietal}} characteristics.
{{/if}}

{{#if region}}
Include 1-2 questions about what makes {{region}} wines distinctive.
{{/if}}

Return questions as JSON array with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "type": "scale" | "multiple_choice" | "text",
      "category": "fruit" | "secondary" | "tertiary" | "body" | "acidity" | "overall",
      "options": [...] // for multiple_choice
      "scaleLabels": { "min": "...", "max": "..." } // for scale
    }
  ]
}
`;
```

### User-Prompted Level Upgrades

**Key Insight from Sommelier:**
> "Four tastings or six tastings isn't going to be enough for someone to really know that much about wine. We should ask people 'Hey, we think you've done enough tastings to upgrade yourself. Are you ready to do that?'"

**Implementation:**

```typescript
// Add to users table (shared/schema.ts)
tastingLevel: text('tasting_level').default('intro'), // 'intro', 'intermediate', 'advanced'
tastingsCompleted: integer('tastings_completed').default(0),
levelUpPromptEligible: boolean('level_up_prompt_eligible').default(false),
```

**Level-Up Logic:**

| Current Level | Eligible After | Prompt Message |
|---------------|----------------|----------------|
| Intro | 10 tastings | "You've completed 10 tastings! Ready to level up to Intermediate?" |
| Intermediate | 25 tastings | "You've completed 25 tastings! Ready for Advanced questions?" |

**UI Flow:**
```
User completes tasting #10 (intro level)
        ↓
Show Modal: "Nice! You've done 10 tastings. We can start asking more detailed questions. Ready to level up?"
        ↓
    [Yes, level up!] → tastingLevel = 'intermediate'
    [Not yet] → levelUpPromptEligible stays true, ask again at #15
```

### Files to Modify

| File | Changes |
|------|---------|
| `server/services/questionGenerator.ts` | Update prompt to focus on 5 components, user understanding |
| `shared/schema.ts` | Add `tastingLevel`, `tastingsCompleted`, `levelUpPromptEligible` to users |
| `server/routes/tastings.ts` | Increment tastings count, check level-up eligibility |
| NEW: `client/src/components/LevelUpModal.tsx` | Prompt user to upgrade |
| `client/src/pages/SoloTastingSession.tsx` | Pass user level to question generator |

### Acceptance Criteria

- [ ] Question generator prompt updated to focus on 5 core components
- [ ] Questions feel conversational, not like a test
- [ ] User level tracked in database
- [ ] Level-up prompt shown at 10 tastings (intro→intermediate) and 25 tastings (intermediate→advanced)
- [ ] Users can decline level-up and be asked again later

---

## Phase 2: Flexible Journey System

### Problem with Current Approach

The 4-step framework (Region → Appellation → Sub-Appellation → Single Vineyard) is great conceptually, but:
- Not every wine shop has specific producers
- We shouldn't require $100+ wines
- Need multiple options at multiple price points

### Enhanced Journey Structure

**Key Change**: Each chapter provides **multiple wine options** at **different price points**, not one specific bottle.

**Modify `chapters` table:**

```typescript
// Enhanced chapter schema
export const chapters = pgTable('chapters', {
  // ... existing fields

  // Wine options (multiple!)
  wineOptions: jsonb('wine_options'), // Array of options
  /*
  [
    {
      description: "Any Oregon Pinot Noir",
      askFor: "Ask for an Oregon Pinot Noir under $25",
      priceRange: { min: 15, max: 25 },
      exampleProducers: ["Willamette Valley Vineyards", "A to Z"],
      level: "entry"
    },
    {
      description: "Willamette Valley Pinot Noir",
      askFor: "Ask specifically for Willamette Valley Pinot Noir, $25-40",
      priceRange: { min: 25, max: 40 },
      exampleProducers: ["Domaine Serene", "Sokol Blosser"],
      level: "mid"
    },
    {
      description: "Single Vineyard option (if you want to splurge)",
      askFor: "Ask for a single vineyard Dundee Hills Pinot",
      priceRange: { min: 50, max: 80 },
      exampleProducers: ["Domaine Drouhin", "Archery Summit"],
      level: "premium"
    }
  ]
  */

  // Keep existing fields for backwards compatibility
  wineRequirements: jsonb('wine_requirements'), // Minimum requirements to validate
});
```

### Journey Flow

```
User starts "Oregon Pinot Journey"
        ↓
Chapter 1: "Exploring Oregon Pinot"
        ↓
Shows 3 wine options:
  - Entry ($15-25): "Any Oregon Pinot Noir"
  - Mid ($25-40): "Willamette Valley Pinot Noir"
  - Premium ($50-80): "Single Vineyard Dundee Hills"
        ↓
User picks their price point, buys wine, returns to app
        ↓
Upload photo → Validate it's a Pinot from Oregon → Begin tasting questions
        ↓
Complete chapter → Move to Chapter 2
```

### AI-Generated Shopping Guidance

For journeys without pre-populated wine options, use GPT:

```typescript
async function generateWineOptions(chapter: Chapter) {
  const prompt = `
  Generate 3 wine options for this journey chapter:

  Journey: ${chapter.journey.title}
  Chapter: ${chapter.title}
  Learning Objective: ${chapter.learningObjectives}

  Provide options at 3 price points:
  1. Entry level ($15-30)
  2. Mid-range ($30-50)
  3. Premium ($50-80) - optional splurge

  For each option include:
  - What to ask for at the wine shop
  - Price range
  - 2-3 example producers (widely available)
  - Why this fits the learning objective

  Return as JSON array.
  `;

  // Call GPT-5 with structured output
}
```

### Starter Journeys to Create

| Journey | Focus | 4 Chapters |
|---------|-------|-----------|
| **New World Grapes** | Grape varieties | Cabernet → Pinot Noir → Chardonnay → Sauvignon Blanc |
| **French Classics** | French regions | Bordeaux → Burgundy → Rhône → Loire |
| **Italian Adventure** | Italian regions | Chianti → Barolo → Amarone → Prosecco |
| **Oregon Pinot Deep Dive** | Single varietal | Entry Oregon → Willamette → Sub-AVA → Premium |

### Files to Modify

| File | Changes |
|------|---------|
| `shared/schema.ts` | Add `wineOptions` jsonb to chapters |
| `server/routes/journeys.ts` | Return wine options, add AI generation fallback |
| `client/src/pages/JourneyDetail.tsx` | Show multiple wine options per chapter |
| `client/src/components/WineOptionCard.tsx` | NEW: Display wine option with price, askFor |

### Acceptance Criteria

- [ ] Each chapter shows 2-3 wine options at different price points
- [ ] "What to ask for" clearly displayed for each option
- [ ] User can choose any price tier and proceed
- [ ] Wine validation accepts any wine matching minimum requirements
- [ ] 4 starter journeys seeded with wine options

---

## Phase 3: Smart Single Player Experience

### Current Flow

1. User uploads bottle photo
2. GPT Vision recognizes wine
3. Static 10 questions asked
4. Tasting saved

### Enhanced Flow

1. User uploads bottle photo
2. GPT Vision recognizes wine (varietal, region, style)
3. **AI generates varietal/region-specific questions** based on 5 core components
4. User completes tasting
5. **AI generates "next bottle" recommendations** based on responses
6. Recommendations saved to tasting record

### AI-Generated Questions for Uploaded Bottles

```typescript
// server/routes/tastings.ts

async function generateQuestionsForWine(
  recognizedWine: RecognizedWine,
  userLevel: string
) {
  const prompt = `
  You're a sommelier helping someone taste a ${recognizedWine.wineName}.

  Wine details:
  - Varietal: ${recognizedWine.grapeVariety || 'Unknown'}
  - Region: ${recognizedWine.wineRegion || 'Unknown'}
  - Type: ${recognizedWine.wineType}

  User level: ${userLevel}

  Generate tasting questions that:
  1. Cover the 5 core components (fruit, secondary, tertiary, body, acidity)
  2. Include 2-3 questions specific to this varietal/region
  3. Help them understand what they like about this specific wine

  ${recognizedWine.grapeVariety === 'Sangiovese' ?
    'For Sangiovese, ask about cherry notes, tomato-like acidity, and earthy characteristics.' : ''}
  ${recognizedWine.grapeVariety === 'Pinot Noir' ?
    'For Pinot Noir, ask about red fruit vs. earth balance, mushroom/forest notes if Old World.' : ''}
  ${recognizedWine.grapeVariety === 'Cabernet Sauvignon' ?
    'For Cabernet, ask about dark fruit intensity, green/herbal notes, oak influence.' : ''}

  Return ${userLevel === 'intro' ? '8' : userLevel === 'intermediate' ? '12' : '15'} questions.
  `;

  return await generateWithGPT(prompt);
}
```

### AI-Generated Next Bottle Recommendations

After tasting completion:

```typescript
async function generateNextBottleRecommendations(
  tastedWine: RecognizedWine,
  userResponses: TastingResponses,
  userLevel: string
) {
  const prompt = `
  A user just tasted ${tastedWine.wineName} (${tastedWine.grapeVariety} from ${tastedWine.wineRegion}).

  Their responses:
  - Fruit enjoyment: ${userResponses.fruitRating}/5
  - Body preference: ${userResponses.bodyRating}/5
  - Acidity preference: ${userResponses.acidityRating}/5
  - Overall rating: ${userResponses.overallRating}/5
  - Notes: "${userResponses.notes}"

  Based on what they enjoyed (and didn't), suggest 3 wines to try next:

  1. **Similar style** - Another wine they'll likely enjoy for the same reasons
  2. **Step up** - A more interesting/complex version of what they liked
  3. **Exploration** - Something different that might expand their palate

  For each recommendation include:
  - Wine name/type (e.g., "Willamette Valley Pinot Noir")
  - Why you're recommending it based on their responses
  - Price range to expect
  - What to ask for at a wine shop

  Return as JSON.
  `;

  return await generateWithGPT(prompt);
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `server/routes/tastings.ts` | Add `generateQuestionsForWine`, `generateNextBottleRecommendations` |
| `client/src/pages/SoloTastingSession.tsx` | Fetch AI-generated questions based on recognized wine |
| NEW: `client/src/pages/SoloTastingComplete.tsx` | Show next bottle recommendations |
| `shared/schema.ts` | Add `recommendations` jsonb to tastings table |

### Acceptance Criteria

- [ ] Uploaded Chianti gets Sangiovese-specific questions
- [ ] Uploaded Pinot gets Pinot-specific questions
- [ ] After completing tasting, user sees 3 "next bottle" recommendations
- [ ] Recommendations include reasoning based on their responses
- [ ] Recommendations saved to tasting record

---

## Implementation Order

| Phase | Effort | Do First Because... |
|-------|--------|---------------------|
| **Phase 1: Adaptive Questions** | Medium | Core to every tasting experience |
| **Phase 2: Flexible Journeys** | Medium | Unblocks journey adoption |
| **Phase 3: Single Player** | Medium | Drives daily engagement |

### Sprint Plan

**Week 1: Question Generation**
- Update GPT prompt in `questionGenerator.ts`
- Add user level fields to schema
- Build level-up modal

**Week 2: Journey Enhancements**
- Add wine options to chapter schema
- Update JourneyDetail UI to show options
- Seed 4 starter journeys

**Week 3: Single Player**
- AI questions for uploaded bottles
- Next bottle recommendations
- Completion screen with recommendations

---

## Technical Notes

### GPT Model Usage

| Task | Model | Why |
|------|-------|-----|
| Question generation | `gpt-5-mini` | Fast, cheap, good for structured JSON |
| Wine recognition | `gpt-5.2` (Vision) | Needs image understanding |
| Recommendations | `gpt-5-mini` | Structured output, fast |

### Cost Estimates

At current pricing (~$0.003/1K tokens for gpt-5-mini):
- Question generation: ~$0.01 per tasting
- Recommendations: ~$0.005 per tasting
- Wine recognition: ~$0.02 per photo

**100 daily tastings = ~$3.50/day in API costs**

### Caching Strategy

1. Save generated questions to `question_cache` table with wine signature
2. Check cache before generating new questions
3. Cache hit rate should improve over time
4. Clear cache entries older than 30 days

---

## What's NOT in This Plan

These have been moved to `PRODUCT_ROADMAP.md` under "Premium Features":

1. **Sommelier Matching** - Users lock in with a personal somm, get direct messaging
2. **Cellar Building** - Premium cellar consultation service
3. **Custom Somm Journeys** - Sommeliers create personalized learning paths

These require the core product to be mature first. Build the foundation, then add premium features.

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Questions feel conversational | N/A (new) | >80% positive feedback |
| Journey completion rate | ~20% | 40%+ |
| Solo tastings per user/week | 1.2 | 3+ |
| "Next bottle" recommendation clicks | N/A (new) | 30%+ |
| User level-up acceptance rate | N/A (new) | 60%+ |
