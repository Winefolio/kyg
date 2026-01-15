# Wine Data Collection & User Profile Strategy

## Current State Analysis

### 1. How We Collect Data From Users

**Current Questions (10 total):**

| Question | Type | What We Learn |
|----------|------|---------------|
| What aromas do you notice? | Multi-select | Aroma perception |
| How appealing is the aroma? | Scale 1-5 | Enjoyment signal |
| How sweet is this wine? | Scale 1-5 | Sweetness perception |
| How crisp/acidic is it? | Scale 1-5 | Acidity perception |
| How are the tannins? | Scale 1-5 | Tannin perception |
| How does it feel in your mouth? | Scale 1-5 | Body perception |
| What flavors stand out? | Multi-select | Flavor perception |
| How would you rate this wine? | Scale 1-5 | Overall enjoyment |
| Would you buy this wine again? | Yes/No | Purchase intent |
| Any final thoughts? | Free text | Qualitative notes |

**Problems Identified:**
1. Questions measure PERCEPTION not PREFERENCE (e.g., "How sweet IS it?" vs "Do you LIKE this sweetness level?")
2. Tannin question confuses users on white wines (user rated 4/5 tannins on Chardonnay)
3. No context for what values mean ("Is 3 acidity good for me?")
4. Missing key preference signals (price sensitivity, occasion, food pairing preferences)

### 2. How We Get Wine Information

**Current GPT-4 Wine Characteristics:**
```json
{
  "sweetness": 1,
  "acidity": 4,
  "tannins": 1,
  "body": 3,
  "style": "Crisp and mineral-driven",
  "regionCharacter": "Bourgogne wines are known for..."
}
```

**Problems Identified:**
1. Missing grape variety inference (fixed in latest update)
2. No price tier information
3. No food pairing suggestions
4. No similar wines for comparison
5. No aging potential or drinking window

### 3. How We Build User Profile

**Current Approach:**
- Average user ratings across all tastings
- Simple comparison: user perception vs wine typical

**What's Missing:**
- Preference vectors (do they LIKE high acidity, not just perceive it)
- Context awareness (what occasion, price point, food)
- Calibration factor (are they consistently rating sweeter than typical?)
- Taste evolution tracking over time

---

## Proposed Improvements

### A. Redesigned Question Flow (Sommelier Perspective)

**Phase 1: Before Tasting (Context)**
1. "What's the occasion?" - Casual/Special/Learning/Gift
2. "What did you pay?" - Under $20/$20-50/$50-100/$100+
3. "Are you pairing with food?" - Yes (what?) / No

**Phase 2: During Tasting (Perception + Preference Combined)**

Instead of: "How sweet is this wine?" (1-5)
Use: "How do you feel about this wine's sweetness?"
- Too dry for me
- Just right
- A bit too sweet for me
- Way too sweet

This captures BOTH perception and preference in one question.

**New Question Set:**

| Question | Options | Data Captured |
|----------|---------|---------------|
| Sweetness feel | Too dry / Just right / Too sweet | Preference + calibration |
| Acidity feel | Too flat / Just right / Too sharp | Preference + calibration |
| Body feel | Too light / Just right / Too heavy | Preference + calibration |
| Tannins feel (reds only) | Too smooth / Just right / Too grippy | Preference + calibration |
| Aromas you enjoyed | Multi-select | Positive aroma preferences |
| Aromas you didn't like | Multi-select (optional) | Negative preferences |
| Overall enjoyment | 1-5 stars | Core signal |
| Would buy again at this price? | Yes / No / Maybe at lower price | Price-adjusted intent |

**Phase 3: After Tasting (Reflection)**
1. "What would make this wine perfect for you?" - Free text
2. "Remind me of another wine you loved?" - Free text (builds comparison graph)

### B. Enhanced Wine Intelligence (Data Analyst Perspective)

**Expanded GPT-4 prompt should return:**
```json
{
  "sweetness": 1,
  "acidity": 4,
  "tannins": 1,
  "body": 3,
  "grapeVariety": "Chardonnay",
  "style": "Crisp and mineral-driven",
  "regionCharacter": "...",
  "typicalPriceTier": "$30-60",
  "foodPairings": ["oysters", "roast chicken", "grilled fish"],
  "similarWines": ["Chablis", "Pouilly-Fuissé", "Mâcon-Villages"],
  "agingPotential": "Drink now or age 3-5 years",
  "flavorProfile": ["citrus", "mineral", "light oak", "green apple"]
}
```

### C. User Profile Building (Combined Perspective)

**Profile Structure:**
```json
{
  "userId": 1,
  "tastingCount": 15,
  "calibration": {
    "sweetness": +0.5,  // They perceive wines as sweeter than typical
    "acidity": 0,       // Accurate
    "body": +0.8        // They perceive wines as fuller
  },
  "preferences": {
    "sweetness": "prefers_medium",    // Not bone dry
    "acidity": "prefers_high",        // Likes crisp wines
    "body": "prefers_full",           // Likes rich wines
    "tannins": "prefers_medium"       // Smooth but present
  },
  "lovedAromas": ["floral", "oak", "citrus"],
  "dislikedAromas": ["barnyard", "smoke"],
  "priceComfort": "$20-50",
  "topGrapes": ["Chardonnay", "Pinot Noir"],
  "topRegions": ["Burgundy", "Oregon"],
  "occasionPatterns": {
    "casual": "prefers_value",
    "special": "splurges_on_burgundy"
  }
}
```

**How Calibration Works:**
If user consistently rates wines 1 point sweeter than typical:
- calibration.sweetness = +1
- When they say "just right" on a dry wine, we know they actually prefer dry
- When recommending, adjust: "You might find this a touch dry"

### D. Actionable Outputs

**1. Personal Recommendations:**
"Based on your 15 tastings, you love crisp, medium-bodied whites with floral notes. Try: Grüner Veltliner from Austria ($25-35) - it has the acidity you love with a touch more body."

**2. Restaurant Sommelier Mode:**
Share your profile via QR code. Sommelier sees:
"Guest prefers: Medium-sweet, high-acid, full-bodied. Loves Burgundy. Budget: $50-100. Suggest: 2019 Meursault or richer Chablis."

**3. Wine Shopping Assistant:**
"You're at Total Wine looking at Chardonnays. Based on your profile, skip the oaky California style. Look for: Chablis, Mâcon, or unoaked versions."

---

## Implementation Priority

1. **Quick Win:** Change questions from perception to preference format
2. **Medium Effort:** Enhance GPT-4 prompts for richer wine data
3. **Larger Project:** Build calibration algorithm from historical data
4. **Future:** Recommendation engine based on profile

---

## Questions for Review

1. Is the "just right" scale intuitive for consumers?
2. Should we ask fewer questions but make them higher signal?
3. How do we handle users who've only done 1-2 tastings?
4. Should wine characteristics be pre-computed or fetched on-demand?
