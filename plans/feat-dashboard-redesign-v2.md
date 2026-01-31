# Dashboard Redesign V2: Premium Wine Intelligence Hub

**Created**: 2026-01-15
**Status**: Planning
**Goal**: Transform the dashboard from a static stats display into an engaging, actionable wine intelligence experience that users want to visit daily.

---

## The Problem

### Current State Issues

1. **Not Actionable**
   - Stats are displayed but don't lead anywhere
   - "You've tasted 10 wines" - so what?
   - No clear "what should I do next?"

2. **Generic UI/UX**
   - Looks like every other dashboard
   - Purple gradient fatigue
   - Cards without hierarchy or visual interest
   - Mobile experience is an afterthought

3. **No Engagement Hooks**
   - No reason to come back daily
   - No progress toward goals
   - No personalization that evolves

4. **Data Without Context**
   - "Sweetness: 3.75/5" means nothing to a user
   - No comparison to wine styles or regions
   - Numbers without narrative

5. **Missing the "Aha" Moment**
   - Users don't feel like they're learning
   - No discovery or surprise
   - No connection to real-world wine buying

---

## The Vision

**"Your personal sommelier in your pocket"**

The dashboard should feel like having a conversation with a knowledgeable friend who:
- Knows your taste perfectly
- Suggests wines you'll love
- Helps you sound smart at restaurants
- Celebrates your wine journey
- Makes learning feel like play

---

## Proposed Architecture

### Information Hierarchy (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  1. HERO: Your Wine Identity (the hook)                     │
│     - One-sentence palate summary                           │
│     - Visual taste signature                                │
│     - Shareable "wine personality" card                     │
├─────────────────────────────────────────────────────────────┤
│  2. ACTION: What to Do Next (the engagement)                │
│     - Continue your journey                                 │
│     - Record a tasting                                      │
│     - Try this wine recommendation                          │
├─────────────────────────────────────────────────────────────┤
│  3. DISCOVERY: Wines for You (the value)                    │
│     - 3-5 personalized recommendations with WHY             │
│     - "Because you loved X, try Y"                          │
│     - Price ranges, where to buy                            │
├─────────────────────────────────────────────────────────────┤
│  4. PROGRESS: Your Journey (the motivation)                 │
│     - Streak counter                                        │
│     - Next milestone                                        │
│     - Skills unlocked                                       │
├─────────────────────────────────────────────────────────────┤
│  5. DEEP DIVE: Explore Your Data (the depth)                │
│     - Expandable taste profile details                      │
│     - Wine collection with smart filters                    │
│     - Tasting history timeline                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Feature Specs

### 1. Hero: Your Wine Identity

**The Problem It Solves**: Users can't articulate their wine preferences

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  "You're a Bold Explorer"                                   │
│                                                             │
│  You gravitate toward full-bodied reds with                 │
│  firm tannins and rich dark fruit. Your palate              │
│  loves Italian structure and Napa power.                    │
│                                                             │
│  [Taste Signature Visual]     [Share My Profile]            │
│      ████████░░ Body                                        │
│      ██████░░░░ Tannins                                     │
│      ████░░░░░░ Acidity                                     │
│      ██░░░░░░░░ Sweetness                                   │
│                                                             │
│  🎯 Next Goal: Try a Burgundy Pinot Noir to explore         │
│     lighter styles                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Elements**:
- **Wine Personality Type**: AI-generated archetype (e.g., "Bold Explorer", "Elegant Traditionalist", "Curious Adventurer")
- **One-Sentence Summary**: Natural language description of preferences
- **Visual Taste Signature**: Horizontal bars but with meaning (not just numbers)
- **Share Card**: Beautiful, Instagram-worthy summary to share
- **Next Goal**: Personalized suggestion to expand palate

**Technical Implementation**:
- GPT-5 generates personality type and summary from preference data
- Taste signature uses semantic labels ("Light → Full" not "1 → 5")
- Share card generates an image with user's wine profile
- Goals are algorithmically determined based on gaps in tasting history

---

### 2. Action: What to Do Next

**The Problem It Solves**: Users open the app and don't know what to do

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  Your Next Move                                             │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ 🔥 7-day     │ │ 📚 Continue  │ │ 🍷 Quick     │        │
│  │    streak!   │ │    Italian   │ │    Taste     │        │
│  │              │ │    Reds      │ │              │        │
│  │ Record today │ │ Chapter 3/5  │ │ 2 min quiz   │        │
│  │ to keep it   │ │ Sangiovese   │ │ Refine your  │        │
│  │              │ │              │ │ profile      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Action Cards**:
1. **Streak Keeper**: If active streak, make it prominent
2. **Journey Progress**: Continue learning journey
3. **Quick Taste**: 2-minute preference refinement quiz
4. **Restaurant Mode**: "Having dinner? Scan the menu"
5. **Try Something New**: Specific wine to seek out

**Smart Prioritization**:
- Morning: Journey content, learning
- Evening: Record a tasting, restaurant mode
- Weekend: Discovery, new recommendations
- If streak at risk: Streak card is prominent

---

### 3. Discovery: Wines for You

**The Problem It Solves**: Users don't know what wine to buy next

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  🍷 Wines You'll Love                           See All →   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Image]  Barolo "Cannubi" 2019                     │   │
│  │           Fontanafredda                             │   │
│  │                                                     │   │
│  │  ★★★★★ 95% match                                   │   │
│  │                                                     │   │
│  │  "Based on your love of full-bodied Italian reds   │   │
│  │   with firm tannins. This Barolo has the           │   │
│  │   structure you crave with elegant complexity."    │   │
│  │                                                     │   │
│  │  💰 $45-65  📍 Total Wine, Wine.com                │   │
│  │                                                     │   │
│  │  [Save for Later]  [Find Near Me]  [Learn More]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ← Swipe for more recommendations →                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Recommendation Types**:
1. **Perfect Match**: Wines that match your profile exactly
2. **Stretch Your Palate**: Slightly outside comfort zone
3. **Budget-Friendly**: Great value wines matching preferences
4. **Special Occasion**: Premium picks for celebrations
5. **Food Pairing**: "Having steak tonight? Try this..."

**Each Recommendation Includes**:
- Match percentage with explanation
- Price range
- Where to buy (links or "find near me")
- Tasting notes relevant to user's vocabulary
- Quick save to wishlist

**Technical Implementation**:
- Recommendation engine compares user preferences to wine database
- GPT-5 generates personalized explanations
- Price data from wine-searcher API or similar
- Location-aware retailer suggestions

---

### 4. Progress: Your Journey

**The Problem It Solves**: Users don't feel progress or achievement

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  Your Wine Journey                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔥 7 Day Streak                    🏆 Level 12     │   │
│  │  ████████████████████░░░░  73% to 8-day             │   │
│  │                                                     │   │
│  │  Badges:  🇮🇹 🇫🇷 🍇 🌟 🎯 +3 more                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Next Milestones                                            │
│  ├── 🍷 3 more tastings → "Dedicated Sipper" badge         │
│  ├── 🇪🇸 Try a Spanish wine → Unlock Spain region           │
│  └── 📚 Finish Italian Reds → "Italy Expert" title          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Gamification Elements**:

1. **Streaks**
   - Daily tasting streak counter
   - Streak freeze (1 free per week)
   - Streak milestones (7, 30, 100 days)

2. **Badges**
   - Region Explorer (taste from X regions)
   - Grape Master (try X varieties)
   - Journey Completer
   - Social Sipper (share profile)
   - Consistent Taster (30-day streak)

3. **Levels**
   - XP for tastings, completing journeys, streaks
   - Level titles: Novice → Enthusiast → Connoisseur → Sommelier
   - Unlock features at higher levels

4. **Milestones**
   - Clear "next steps" to progress
   - Mix of easy (encouragement) and challenging (aspiration)

---

### 5. Deep Dive: Your Data

**The Problem It Solves**: Power users want detailed insights

**Design - Expandable Sections**:

#### 5A. Taste Profile Details
```
┌─────────────────────────────────────────────────────────────┐
│  Your Palate in Detail                          [Expand ↓]  │
│                                                             │
│  Red Wine Preference                                        │
│  ├── Style: Full-bodied, structured                         │
│  ├── Regions: Piedmont (4), Napa (2), Tuscany (2)          │
│  ├── Grapes: Nebbiolo (3), Cab Sauv (2), Sangiovese (2)    │
│  └── Flavor Notes: Dark fruit, oak, leather                 │
│                                                             │
│  White Wine Preference                                      │
│  ├── Style: Crisp, mineral                                  │
│  ├── Regions: Sancerre (2), Santorini (1)                  │
│  ├── Grapes: Sauvignon Blanc (2), Assyrtiko (1)            │
│  └── Flavor Notes: Citrus, mineral, herbs                   │
│                                                             │
│  Your Palate Evolution                                      │
│  📈 [Chart showing preference changes over time]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 5B. Wine Collection (Redesigned)
```
┌─────────────────────────────────────────────────────────────┐
│  Your Wine Collection (10)                    [Grid/List]   │
│                                                             │
│  Filters: [Red ▼] [Region ▼] [Rating ▼] [Source ▼]        │
│                                                             │
│  Sort: [Highest Rated ▼]                                    │
│                                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ Barolo │ │ Chianti│ │ Napa   │ │ Sancerre│              │
│  │ ★ 4.2  │ │ ★ 4.0  │ │ ★ 3.8  │ │ ★ 3.5  │              │
│  │ Solo   │ │ Group  │ │ Group  │ │ Solo   │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                             │
│  Smart Collections:                                         │
│  [Top Rated] [Recent] [Want to Try Again] [By Region]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 5C. Tasting Timeline
```
┌─────────────────────────────────────────────────────────────┐
│  Tasting Timeline                                           │
│                                                             │
│  January 2026                                               │
│  ├── Jan 15 │ 🍷 Barolo Cannubi 2019 │ Solo │ ★★★★☆       │
│  ├── Jan 12 │ 🍷 Chianti Classico    │ Group │ ★★★★☆      │
│  └── Jan 8  │ 🍷 Napa Cabernet       │ Group │ ★★★★☆      │
│                                                             │
│  December 2025                                              │
│  └── ...                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Design System

### Color Palette (Moving Beyond Purple)

```
Primary:     #1A1A2E (Deep Navy) - Sophisticated base
Secondary:   #16213E (Midnight) - Cards, depth
Accent 1:    #E94560 (Wine Red) - CTAs, highlights
Accent 2:    #F7D716 (Gold) - Achievements, premium
Accent 3:    #00ADB5 (Teal) - Fresh, data points
Text:        #FFFFFF (White) - Primary text
Text Muted:  #94A3B8 (Slate) - Secondary text
```

### Typography

```
Headlines:   "Playfair Display" - Elegant, wine-appropriate
Body:        "Inter" - Clean, readable
Accents:     "JetBrains Mono" - Stats, numbers
```

### Component Patterns

1. **Glass Cards**: Subtle blur, soft borders, depth
2. **Micro-interactions**: Every tap has feedback
3. **Skeleton Loading**: Beautiful loading states
4. **Empty States**: Encouraging, not depressing
5. **Celebrations**: Confetti for achievements, smooth transitions for progress

### Mobile-First Principles

- Touch targets: 48px minimum
- Thumb-zone navigation
- Pull-to-refresh
- Swipe gestures for cards
- Bottom sheet for details (not new pages)
- Haptic feedback for achievements

---

## New Features to Build

### Priority 1: Core Experience

| Feature | Description | Effort |
|---------|-------------|--------|
| Wine Personality Generator | GPT-powered archetype + summary | Medium |
| Recommendation Engine | Match wines to user preferences | High |
| Action Cards System | Dynamic "what to do next" | Medium |
| Streak System | Daily tracking with freeze | Low |
| Badge System | Achievement tracking | Medium |

### Priority 2: Engagement

| Feature | Description | Effort |
|---------|-------------|--------|
| Share Profile Card | Generate beautiful shareable image | Medium |
| Quick Taste Quiz | 2-min preference refinement | Medium |
| Push Notifications | Streak reminders, recommendations | Low |
| Palate Evolution Chart | Track changes over time | Medium |

### Priority 3: Value-Add

| Feature | Description | Effort |
|---------|-------------|--------|
| Restaurant Menu Scanner | Photo → recommendations | High |
| Wine Wishlist | Save wines to try | Low |
| Buy Links Integration | Where to purchase | Medium |
| Price Alerts | "Wine you wanted is on sale" | Medium |

---

## Data Requirements

### New Data to Collect

1. **User Engagement**
   - Last active timestamp
   - Streak data (current, longest, freeze available)
   - Features used (for smart prioritization)

2. **Wine Wishlist**
   - Saved wines from recommendations
   - "Want to try again" from tastings

3. **Achievement Data**
   - Badges earned
   - XP / Level
   - Milestones reached

### New API Endpoints

```
GET  /api/dashboard/:email/personality    # Wine personality + summary
GET  /api/dashboard/:email/recommendations # Personalized wine picks
GET  /api/dashboard/:email/actions        # What to do next
GET  /api/dashboard/:email/progress       # Streak, badges, level
POST /api/dashboard/:email/wishlist       # Add wine to wishlist
GET  /api/wines/search?match=:email       # Wine search with preference matching
POST /api/menu/scan                       # Restaurant menu OCR + recs
```

---

## Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Daily Active Users | ? | +50% | Analytics |
| Avg. Session Duration | ? | +100% | Analytics |
| Tastings per User/Week | ~1 | 3+ | Database |
| Recommendation Click-through | N/A | 20%+ | Event tracking |
| Social Shares | N/A | 10% of users | Event tracking |
| 7-Day Retention | ? | 40%+ | Cohort analysis |

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- New visual design system
- Hero section with wine personality
- Redesigned preference visualization
- Mobile-optimized layout

### Phase 2: Engagement (Week 3-4)
- Streak system
- Badge system
- Action cards
- Push notification infrastructure

### Phase 3: Discovery (Week 5-6)
- Recommendation engine
- Wine wishlist
- Shareable profile cards

### Phase 4: Value (Week 7-8)
- Restaurant menu scanner
- Buy links integration
- Palate evolution chart

---

## Competitive Analysis

### What Vivino Does Well
- Social proof (community ratings)
- Wine scanning UX
- Price comparison
- Clean, photo-forward design

### What Vivino Lacks (Our Opportunity)
- Personalized learning journey
- Understanding WHY you like wines
- Actionable taste development
- Sommelier-level insights without sommelier knowledge

### Our Differentiation
"Vivino tells you what others think. KnowYourGrape helps you understand what YOU think and why."

---

## Open Questions

1. **Wine Database**: Do we build our own or integrate with existing (Wine-Searcher, Vivino API)?
2. **Purchase Integration**: Affiliate links, direct partnerships, or just info?
3. **Social Features**: How much social (follow users, compare palates)?
4. **Monetization**: Free tier limits? Premium features?

---

## References

- Spotify Wrapped (yearly summary, shareable)
- Duolingo (streaks, gamification, daily engagement)
- Strava (achievement system, social proof)
- Headspace (calming UX, progress visualization)
- Untappd (beer app - badge system, social)

---

## Next Steps

1. Review this plan with stakeholders
2. Prioritize features for MVP redesign
3. Create Figma mockups for key screens
4. Define API contracts for new endpoints
5. Break into implementation sprints
