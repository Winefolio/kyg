	# New Landing Page Design Plan

## Problem Statement

The current gateway at `/` shows 5 equal-weight options (Solo Tasting, Learning Journeys, Join Session, Host Session, Login) which creates decision paralysis. There's no clear value proposition, no trust signals, and it feels like a utility menu rather than a premium wine experience brand introduction.

**Current issues:**
- No hero section or brand storytelling
- 5 options with equal visual weight = cognitive overload
- "Premium Wine Tasting Experience" doesn't explain actual benefits
- Missing social proof (testimonials, user count, wine collection size)
- Unclear which features require authentication
- No visual hierarchy guiding users toward primary action

## Goal

Create a landing page that:
1. Immediately communicates what Cata is and why users should care
2. Guides users toward the primary action (start tasting wines)
3. Feels premium and matches the wine lifestyle brand
4. Reduces cognitive load with clear visual hierarchy
5. Works beautifully on mobile (primary target)

---

## Proposed Design

### Visual Structure (Mobile-First)

```
┌─────────────────────────────────────┐
│           [Cata Logo]               │
│                                     │
│     "Your Personal Sommelier"       │
│                                     │
│  Discover wines you'll love through │
│  guided tastings that learn your    │
│  unique palate.                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    [Start Tasting]          │   │  ← Primary CTA
│  │    (Gradient button)        │   │
│  └─────────────────────────────┘   │
│                                     │
│     Already have an account?        │
│     [Sign In]                       │  ← Secondary link
│                                     │
├─────────────────────────────────────┤
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐     │
│  │ 500+  │ │ 10k+  │ │  AI   │     │  ← Trust metrics
│  │ Wines │ │Tastings│ │Powered│     │
│  └───────┘ └───────┘ └───────┘     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  How It Works                       │
│                                     │
│  1. Taste & Rate                    │
│     Rate wines on aroma, taste,     │
│     finish and more                 │
│                                     │
│  2. Learn Your Palate               │
│     AI builds your unique           │
│     preference profile              │
│                                     │
│  3. Discover New Favorites          │
│     Get personalized wine           │
│     recommendations                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Start Your Wine Journey]          │  ← Bottom CTA
│                                     │
├─────────────────────────────────────┤
│                                     │
│  For Wine Professionals             │
│                                     │
│  [Sommelier Dashboard]              │  ← Build packages (/sommelier)
│  Create and manage wine tastings    │
│                                     │
│  ─────────────────────────────      │
│                                     │
│  [Host a Session] [Join Session]    │  ← Run/join sessions
│                                     │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Single Primary CTA**: "Start Tasting" is the clear action
   - Goes to `/solo` for personal tasting (creates account if needed)
   - Removes decision paralysis

2. **Value Proposition First**: Hero explains WHY before showing HOW
   - "Your Personal Sommelier" - positioning
   - "Discover wines you'll love..." - benefit statement

3. **Trust Signals**: Show credibility without cluttering
   - Wine count, tasting count, AI-powered badge
   - Can be real stats from database

4. **How It Works**: 3-step explanation
   - Reduces uncertainty for new users
   - Shows the value journey

5. **Secondary Actions Demoted**: B2B/professional features moved to bottom
   - These don't compete with consumer entry point
   - Still accessible for wine professionals

6. **Sign In Link**: Small text link, not a card
   - Returning users know to look for it
   - Doesn't compete with new user acquisition

7. **Three Distinct Professional Paths**:
   - **Sommelier Dashboard** (`/sommelier`) - BUILD packages (create wines, slides, questions)
   - **Host a Session** (`/host`) - RUN a session using an existing package code
   - **Join a Session** (`/join`) - For participants joining a live hosted session

---

## Technical Implementation

### Files to Create/Modify

**Create:**
- `client/src/pages/Landing.tsx` - New landing page component

**Modify:**
- `client/src/App.tsx` - Update `/` route to use Landing
- `client/src/components/gateway/SelectionView.tsx` - Can be deprecated or kept for host/join flows

### Component Structure

```tsx
// Landing.tsx structure
<div className="min-h-screen bg-gradient-primary">
  {/* Hero Section */}
  <section className="pt-16 pb-12 px-4 text-center">
    <Logo />
    <Tagline />
    <ValueProposition />
    <PrimaryCTA /> {/* "Start Tasting" */}
    <SignInLink />
  </section>

  {/* Trust Metrics */}
  <section className="py-8 px-4">
    <MetricsRow /> {/* 3 stat cards */}
  </section>

  {/* How It Works */}
  <section className="py-12 px-4">
    <SectionTitle text="How It Works" />
    <StepCards /> {/* 3 vertical steps */}
  </section>

  {/* Bottom CTA */}
  <section className="py-8 px-4 text-center">
    <SecondaryCTA /> {/* "Start Your Wine Journey" */}
  </section>

  {/* Host/Group Section */}
  <section className="py-8 px-4 border-t border-white/10">
    <SectionTitle text="For Hosts & Groups" />
    <HostJoinButtons />
  </section>
</div>
```

### Animation Strategy

Using Framer Motion (already in project):
- Hero elements: Stagger fade-in on load
- Metrics: Count-up animation when in view
- Steps: Slide-in from left on scroll
- CTAs: Subtle pulse/glow effect

```tsx
// Example animation variants
const heroVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.1 }
  }
};
```

### Dynamic Stats

Fetch real stats from backend:
```tsx
// New API endpoint needed
GET /api/stats/public
Response: {
  wineCount: 523,
  tastingCount: 10847,
  userCount: 1234
}
```

Or hardcode reasonable numbers initially and make dynamic later.

---

## Verification

After implementation:
- [ ] Landing page loads at `/`
- [ ] "Start Tasting" button goes to `/solo`
- [ ] "Sign In" link goes to `/login`
- [ ] "Sommelier Dashboard" goes to `/sommelier` (build packages)
- [ ] "Host a Session" opens host flow (run a session with package code)
- [ ] "Join Session" opens join flow (participant joining)
- [ ] Page looks good on mobile (375px viewport)
- [ ] Page looks good on desktop (responsive)
- [ ] Animations are smooth and not distracting
- [ ] Logo displays correctly
- [ ] Gradient background matches brand

---

## Future Enhancements (Not in this PR)

- Real-time stats from database
- Testimonial carousel
- Featured wine of the week
- App store badges (if PWA is installable)
- Video background or wine imagery
- A/B test different value propositions

---

## Reference: Current SelectionView Options

Mapping current options to new design:
| Current | New Location | Route |
|---------|--------------|-------|
| Solo Tasting | Primary CTA "Start Tasting" | `/solo` |
| Learning Journeys | Accessible from `/solo` home | `/solo` → Journeys tab |
| Join Session | Bottom "Join Session" | `/join` modal or route |
| Host Session | Bottom "Host a Session" | `/host` flow (run with package code) |
| Login | "Sign In" link below CTA | `/login` |
| *(New)* Sommelier Dashboard | Bottom "Sommelier Dashboard" | `/sommelier` (build packages) |

---

## Similar Code Reference

- `client/src/pages/SoloLogin.tsx` - Simple centered card layout
- `client/src/components/gateway/SelectionView.tsx` - Current animation patterns
- `client/src/pages/HomeV2.tsx` - Glassmorphism card styling
- `client/src/pages/SommelierDashboard.tsx` - Package management (BUILD tastings)
- `client/src/pages/HostDashboard.tsx` - Session monitoring (RUN tastings)
- `client/src/pages/PackageEditor.tsx` - Slide/question builder for packages
