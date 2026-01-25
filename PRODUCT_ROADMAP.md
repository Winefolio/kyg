# KYG Product Roadmap

**Last Updated**: January 21, 2026

---

## Vision

Transform Cata into "your personal sommelier in your pocket" - an app that knows your taste, suggests wines you'll love, and makes learning about wine feel like play.

---

## Navigation Architecture: Three Pillars + Discover

The app uses a bottom tab navigation with **three current tabs** and one **planned future tab**:

| Tab | Purpose | User Intent | Status |
|-----|---------|-------------|--------|
| **Solo** | Personal wine journal & learning journeys | "Record my experience" | ✅ Live |
| **Group** | Live sessions - join or host | "Taste with others" | ✅ Live |
| **Dashboard** | All your data, insights, taste profile | "Understand my palate" | ✅ Live |
| **Discover** | Wine recommendations & where to buy | "Find wines I'll love" | 🔮 Future |

### Why These Tabs?

Each tab represents a **distinct user intent** that doesn't overlap:
- **Solo** = Capture (recording experiences)
- **Group** = Connect (real-time with others)
- **Dashboard** = Reflect (viewing your data)
- **Discover** = Explore (finding new wines)

### What Stays Within Existing Tabs

| Feature | Location | Rationale |
|---------|----------|-----------|
| Learning Journeys | Solo tab | Different navigation depth, not a peer-level experience |
| Gamification (streaks, badges) | Dashboard | Rewards for activity, part of your data |
| Wine Collection Manager | Dashboard | Tracking what you own is part of your data |
| Social features | TBD | Low priority; may not need dedicated tab |

### When to Add the Discover Tab

Add the **Discover tab** when Priority 2 (Wine Discovery & Recommendations) is implemented:
- Personalized recommendations engine is built
- Purchase integration is ready (Where to Buy, Price Alerts)
- Enough content to justify dedicated navigation

**Design constraint**: Maximum 4-5 bottom tabs for mobile usability.

---

## Priority 1: Dashboard & Engagement

### UI/UX Redesign
Transform the dashboard from basic stats into an engaging wine intelligence hub.

- [ ] **New Visual Design System** - Move beyond purple gradients to a sophisticated palette
- [ ] **Mobile-First Layout** - Thumb-zone navigation, swipe gestures, bottom sheets
- [ ] **Information Hierarchy** - Hero → Actions → Discovery → Progress → Deep Dive
- [ ] **Micro-interactions** - Haptic feedback, celebrations for achievements, smooth transitions
- [ ] **Empty States** - Encouraging, not depressing; guide users to first action

*See `plans/feat-dashboard-redesign-v2.md` for full design vision.*

### Wine Personality & Identity
Make users feel understood and give them something to share.

- [ ] **Wine Personality Generator** - AI-generated archetype ("Bold Explorer", "Elegant Traditionalist")
- [ ] **One-Sentence Palate Summary** - Natural language description of preferences
- [ ] **Shareable Profile Card** - Beautiful, Instagram-worthy wine identity card
- [ ] **Taste Profile Visualization** - Interactive view with meaningful labels (not just numbers)

### Gamification System
Give users reasons to come back daily.

- [ ] **Streak System** - Daily tasting streaks with freeze option
- [ ] **Badge System** - Achievements for regions explored, varieties tried, journeys completed
- [ ] **Levels & XP** - Progress from Novice → Enthusiast → Connoisseur → Sommelier
- [ ] **Milestones** - Clear next steps to encourage progress

### Smart Actions
Help users know what to do next.

- [ ] **Action Cards** - Dynamic "what to do next" based on time of day and user state
- [ ] **Journey Continuation Prompts** - Remind users to continue their learning path
- [ ] **Streak Reminders** - Push notifications to maintain streaks

---

## Priority 2: Wine Discovery & Recommendations

### Recommendation Engine
Help users find wines they'll love.

- [ ] **Personalized Recommendations** - AI-matched wines based on taste profile
- [ ] **"Because You Liked X"** - Explain why each wine is recommended
- [ ] **Match Percentage** - Show how well each wine fits their preferences
- [ ] **Wine Wishlist** - Save wines to try later

### Purchase Integration
Connect taste to action.

- [ ] **Where to Buy** - Links to retailers carrying recommended wines
- [ ] **Price Ranges** - Budget guidance for each recommendation
- [ ] **"Find Near Me"** - Location-aware availability
- [ ] **Price Alerts** - Notify when saved wines go on sale

---

## Priority 3: Journey Enhancements

### Onboarding & Discovery
Help users find their perfect journey.

- [ ] **Journey Recommendation Quiz** - 5-8 questions to suggest ideal learning path
- [ ] **Match Percentage** - Show why each journey fits the user
- [ ] **Personalized Journey Order** - AI-suggested sequence based on goals

### Journey Content
Expand educational offerings.

- [ ] **More Journeys** - Spanish wines, Champagne, Natural wines, Food pairings
- [ ] **Audio Content** - Sommelier commentary for chapters
- [ ] **Video Guides** - Visual demonstrations of tasting techniques

---

## Priority 4: Advanced Features

### Restaurant & Social
Real-world wine confidence.

- [ ] **Menu Scanner** - Photo restaurant wine list → get recommendations
- [ ] **Social Sharing** - Share tastings, journey progress, wine discoveries
- [ ] **Friend Comparisons** - See how your palate compares to friends
- [ ] **Follow Sommeliers** - Get recommendations from wine experts

### Data & Insights
Deep dives for enthusiasts.

- [ ] **Palate Evolution Chart** - How your preferences change over time
- [ ] **Region/Variety Breakdown** - Detailed analysis of what you drink
- [ ] **Wine Collection Manager** - Track wines you own vs. have tasted
- [ ] **Tasting Notes Export** - Download your wine journal

---

## Lower Priority (Host/Group Features)

These remain in backlog as the pivot focuses on solo/learning experiences:

- [ ] Quick Question Builder for package editors
- [ ] Drag & drop slide reordering
- [ ] Clickable section navigation in tastings
- [ ] Host wine selection integration
- [ ] Package version history
- [ ] Live preview in package editor

---

## Future Ideas (Not Yet Scoped)

- **Sommelier Matching** - Connect with real sommeliers for personalized advice
- **Wine Pairing AI** - Suggest pairings based on what you're cooking
- **Tasting Calendar** - Schedule and get reminders for upcoming tastings
- **Group Journey Mode** - Do journeys together with friends
- **Wine Club Integration** - Sync with subscription wine clubs

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users | +50% |
| Tastings per User/Week | 3+ |
| Journey Completion Rate | 40% |
| 7-Day Retention | 40%+ |
| Recommendation Click-through | 20%+ |

---

## Design Principles

1. **Mobile-first** - Most wine moments happen on phones (store, restaurant, home)
2. **Actionable** - Every screen should answer "what should I do next?"
3. **Personal** - Feel like the app knows you, not generic wine content
4. **Celebratory** - Make progress feel good with animations and acknowledgment
5. **Simple** - Wine is intimidating enough; the app should reduce complexity
