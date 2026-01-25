# Cata Brand Guidelines

**Status**: Work in Progress
**Last Updated**: January 21, 2026

---

## Brand Identity

### Name
**Cata** (pronounced: CAH-tah)

Spanish word for "tasting" (as in *cata de vinos* - wine tasting). Named as a nod to the founders' visit to a vineyard in Spain years before they had any interest in wine - the moment that planted the seed.

### Tagline
*TBD - Candidates:*
- "Your wine, understood"
- "Taste with confidence"
- "Wine made personal"

### What Cata Is
A wine tasting app that makes wine approachable through technology. Your personal sommelier in your pocket - it knows your taste, suggests wines you'll love, and makes learning about wine feel like play.

### What Cata Is Not
- Not intimidating or gatekeeping
- Not a wine encyclopedia or reference app
- Not just for experts or snobs
- Not a shopping/e-commerce app (though we help you find wines)

---

## Brand Personality

### Four Pillars

| Pillar | What It Means | How It Shows Up |
|--------|---------------|-----------------|
| **Welcoming** | You belong here, even if you're new to wine | Friendly copy, no jargon without explanation, encouraging empty states |
| **Curious** | Always learning, discovering, exploring | Journey-based learning, "discover" features, celebrating exploration |
| **Premium** | Quality experience, not cheap or gimmicky | Polished UI, thoughtful details, sophisticated (not flashy) design |
| **Smart** | AI-powered, intelligent, knows you | Personalized recommendations, learning your taste, insightful summaries |

### Voice & Tone
- Conversational but knowledgeable
- Encouraging, never condescending
- Concise - respect the user's time
- Uses "you/your" - it's personal
- Avoids wine snobbery and pretension

*Examples TBD*

---

## Visual Identity

### Logo

**Status**: Final Candidates Under Review

**Winning Direction: Top-Down Wine Glass**

After extensive exploration, the winning concept is a **wine glass viewed from directly above** - showing the circular rim and the wine surface inside. This approach:
- Is immediately recognizable as wine-related
- Feels fresh and unexpected (most wine logos use side-view silhouettes)
- Works as an app icon at all sizes
- Balances literal (it's clearly a wine glass) with stylized (geometric, premium)

**Final Candidate (Option 10)**:
- Top-down view of wine glass
- Deep purple wine surface filling the glass
- White/silver rim creating the outer circle
- Subtle pink highlight at bottom adding dimension
- Clean black background

**Key Learnings from Logo Exploration**:

| Approach | Result |
|----------|--------|
| Abstract geometric (swirls, circles, drops) | Looked childish, generic, or like "AI art" - didn't read as wine |
| Pure circles (target/bullseye style) | Too abstract, lost wine identity entirely |
| Side-view wine glass | Too literal, every wine app does this |
| **Top-down wine glass with wine inside** | ✅ Winner - fresh perspective, clearly wine, premium feel |

**What We Learned About AI Logo Prompts**:
1. "Wine glass" triggers side-view in AI models - had to describe geometry explicitly
2. Longer, more detailed prompts worked better than short ones
3. `--stylize 0` in Midjourney reduced unwanted artistic flourishes
4. Referencing "tech startup" and "Spotify/Slack" helped push toward logo (not art) aesthetics
5. Literal-but-stylized beats purely abstract every time

**Prompts That Worked**:
```
professional app icon logo for tech startup, wine glass viewed from above,
simple circular rim with filled purple center, clean corporate design like
Spotify or Slack app icons, flat solid colors, no artistic effects no shine
no bubbles, deep purple (#7c3aed) on black background, modern minimal
Silicon Valley aesthetic --ar 1:1 --v 6 --stylize 0
```

```
imagine wine glass from above as minimal logo, top-down view showing circular
rim and deep purple wine surface inside, completely flat vector illustration,
no shine no reflections no 3D effects, solid black background only, monochrome
purple (#7c3aed) and white color scheme, clean geometric shapes, modern app
icon style --ar 1:1 --v 6
```

### Color Palette

#### Primary
| Name | Hex | Usage |
|------|-----|-------|
| Deep Purple | `#581c87` | Primary brand color, dark variant |
| Vibrant Purple | `#7c3aed` | Primary brand color, bright variant |

#### Accent Colors
| Name | Hex | Usage |
|------|-----|-------|
| Rose | `rose-500` to `pink-600` | Solo tasting actions |
| Indigo | `indigo-500` to `purple-600` | Learning/journey actions |
| Blue | `blue-500` to `purple-600` | Group/social actions |
| Amber | `amber-500` to `orange-600` | Host/create actions |

#### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#10b981` | Positive feedback, completed states |
| Warning | `#f59e0b` | Caution, attention needed |
| Error | `#ef4444` | Errors, destructive actions |
| Info | `#3b82f6` | Informational messages |

#### Neutrals
| Name | Value | Usage |
|------|-------|-------|
| Text Primary | `white 100%` | Headlines, important text |
| Text Secondary | `white 80%` | Body text |
| Text Tertiary | `white 60%` | Supporting text, labels |
| Text Disabled | `white 40%` | Disabled states, placeholders |

### Typography

**Status**: Using system defaults, custom font TBD

**Direction**:
- Clean, modern sans-serif
- Rounded terminals for approachability
- Good legibility at small sizes (mobile-first)

*Font selection TBD*

### UI Style

#### Current Implementation
- **Theme**: Dark mode only (light mode planned for future)
- **Background**: Gradient (`slate-900` → `purple-900` → `slate-900`)
- **Cards**: Glassmorphism (`backdrop-blur-xl`, `from-white/10 to-white/5`, `border-white/20`)
- **Corners**: Generously rounded (`rounded-2xl`, `rounded-3xl`)
- **Depth**: Subtle shadows, layered transparency

#### Design Principles
1. **Mobile-first** - Most wine moments happen on phones
2. **Thumb-friendly** - Important actions in easy reach
3. **Breathing room** - Generous spacing, not cramped
4. **Progressive disclosure** - Don't overwhelm, reveal as needed

---

## Photography & Imagery

*TBD*

**Direction to explore**:
- Warm, inviting lighting
- Real moments (not staged stock photos)
- Diverse people enjoying wine
- Close-ups that feel intimate, not clinical
- Avoid clichés (sunset vineyards, swirling glasses)

---

## Iconography

*TBD*

**Current approach**: Lucide icons (outline style)

---

## Motion & Animation

**Current Implementation**:
- Framer Motion for transitions
- Subtle, purposeful animations
- Haptic feedback on mobile

**Principles**:
- Animation should feel natural, not flashy
- Use motion to guide attention
- Celebrate achievements (completions, milestones)
- Keep it fast - respect user's time

---

## App Icon

**Direction**: The top-down wine glass icon IS the app icon.

**Concept**: Looking down into a glass of wine - circular rim with purple wine surface inside.

**Requirements**:
- Recognizable at small sizes (29px - 1024px) ✅ Circular form scales well
- Works on dark and light iOS/Android backgrounds - need to test light bg version
- Distinct from other wine apps ✅ Most use side-view glasses
- Conveys brand personality at a glance ✅ Premium, curious perspective

**Variations Needed**:
- Standard (dark background) - for iOS/Android app icon
- Light background version - for contexts where dark bg doesn't work
- Simplified version - for very small sizes (favicon, 16px)
- Monochrome - for contexts requiring single color

---

## Future Sections

**Immediate (Brand Overhaul)**:
- [ ] Logo usage guidelines and clear space
- [ ] Final color palette (refined from exploration)
- [ ] Typography selection and scale
- [ ] Updated component styles

**Later**:
- [ ] Color accessibility guidelines
- [ ] Illustration style guide
- [ ] Social media templates
- [ ] Email design guidelines
- [ ] Marketing materials guidelines
- [ ] Co-branding guidelines
- [ ] Light mode color palette

---

## Brand Overhaul Plan

With the rebrand from **KnowYourGrape → Cata**, we have an opportunity to refresh the entire visual identity while preserving what works.

### Phase 1: Logo Finalization
- [ ] Collect colleague feedback on 11 logo options
- [ ] Select final logo (current frontrunner: Option 10)
- [ ] Create vector version in Illustrator/Figma
- [ ] Design logo lockup (icon + "cata" wordmark)
- [ ] Create logo variations (dark bg, light bg, monochrome)
- [ ] Define clear space and minimum size rules

### Phase 2: Typography Selection
- [ ] Research typefaces that match brand pillars (Welcoming, Curious, Premium, Smart)
- [ ] Test candidates: rounded sans-serifs (approachable) vs geometric sans-serifs (tech)
- [ ] Consider: Inter, Plus Jakarta Sans, DM Sans, Outfit, or custom
- [ ] Define type scale for app (headings, body, captions)
- [ ] Pair with wordmark font for logo lockup

### Phase 3: Color Refinement
- [ ] Keep purple as primary (it works, reads "wine" without being literal)
- [ ] Refine exact shades - current `#7c3aed` may shift slightly
- [ ] Consider how logo colors (deep purple, white rim, pink highlight) influence palette
- [ ] Audit current accent colors (rose, indigo, blue, amber) - are they all needed?
- [ ] Define light mode palette (for future implementation)

### Phase 4: App UI Updates
- [ ] Update splash screen with new logo
- [ ] Replace "KnowYourGrape" branding throughout app
- [ ] Refresh HomeV2 cards to align with new visual direction
- [ ] Consider if glassmorphism still fits or needs refinement
- [ ] Update any illustrations or graphics with new style

### Phase 5: Marketing & External
- [ ] App Store / Play Store assets (icon, screenshots, preview video)
- [ ] Social media profile images and banners
- [ ] Website updates (if applicable)
- [ ] Email templates
- [ ] Pitch deck refresh

---

## Design Language Evolution

### What to Keep
- **Dark mode as primary** - feels premium, wine-appropriate
- **Purple palette** - distinctive, reads "wine" subtly
- **Generous spacing** - breathing room is welcoming
- **Rounded corners** - approachable, modern
- **Subtle animations** - polish without showiness

### What to Evolve
- **Glassmorphism** - may be getting dated; consider simplifying
- **Gradient backgrounds** - evaluate if they compete with new logo
- **Card styles** - could be cleaner, less "glass" effect
- **Icon style** - current Lucide outline may not match new logo weight

### Questions to Explore
1. Should the top-down glass motif extend beyond the logo? (e.g., UI elements, illustrations)
2. How prominent should the pink accent (from logo) be in the app?
3. Does the current purple gradient background complement or compete with the logo?
4. What's the right balance of playful vs premium?

---

## Logo Lockup Options

Once final icon is selected, create these lockup variations:

### Horizontal Lockup
```
[Icon] cata
```
- Icon to left, wordmark to right
- Use for headers, navigation, wide spaces

### Stacked Lockup
```
  [Icon]
   cata
```
- Icon above, wordmark below
- Use for square spaces, app splash, social profiles

### Icon Only
- Use when space is limited or brand is established
- App icon, favicon, small UI elements

### Wordmark Only
- Use when logo is already visible nearby
- Text-heavy contexts, legal, footer

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-21 | Initial brand brief created |
| 2026-01-21 | Added logo concepts and AI prompts |
| 2026-01-21 | Revised to icon-first approach (standalone symbols like Spotify/Apple) |
| 2026-01-21 | Logo exploration complete - "top-down wine glass" wins over abstract approaches |
| 2026-01-21 | Added brand overhaul plan, documented AI prompting learnings |
