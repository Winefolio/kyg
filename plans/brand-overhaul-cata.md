# Brand Overhaul: KnowYourGrape → Cata

## Enhancement Summary

**Deepened on:** 2026-01-21
**Research agents used:** 10 (Dark mode researcher, Glassmorphism researcher, SVG/React researcher, Splash screen researcher, TypeScript reviewer, Code simplicity reviewer, Architecture strategist, Performance oracle, Frontend-design skill, Web search)

### Key Improvements
1. **Complete file audit** - Found 10+ additional files with brand references not in original plan
2. **IndexedDB migration required** - Database name change needs data migration strategy
3. **Performance validation** - Backdrop-blur reduction confirmed as significant mobile performance win
4. **Text contrast guidance** - Use off-white (#E8E6ED) instead of pure white for readability
5. **Accessibility requirements** - Added proper ARIA labels for logo images

### New Considerations Discovered
- Inline Tailwind gradients bypass CSS variable changes - need to replace them
- PWA manifest and service worker need cache-busting strategy
- Consider CSS animation for splash screen instead of Framer Motion (25KB savings)
- Future light mode support: adopt `.dark` class pattern now

### Design Philosophy Note
The frontend-design skill flagged that near-black + purple is becoming generic "AI startup" aesthetic. The logo (top-down wine glass) is distinctive. Consider whether to push further on color identity in future iterations.

---

## Overview

Rebrand the app from "KnowYourGrape" to "Cata" with a refreshed visual identity. This plan covers the full transition: name updates, logo integration, color refinement, and UI polish.

**Constraints:**
- Logo: Option 10 (top-down wine glass with deep purple fill, white rim, subtle pink highlight)
- Web app only for now (no App Store assets needed yet)
- Dark mode only for MVP; light mode is future work
- Keep what works: purple palette, generous spacing, rounded corners, system fonts

---

## Phase 1: Name Update (Immediate)

Update all "KnowYourGrape" references to "Cata" throughout the app.

### Files to Update (Complete Audit)

**Client-side (UI-visible):**
- `client/src/pages/HomeV2.tsx` - Lines 136, 332 (login screen, header)
- `client/src/pages/SoloDashboard.tsx` - Lines 167, 241
- `client/src/pages/UserDashboard.tsx` - Line 587
- `client/src/pages/HomeTastings.tsx` - Line 94
- `client/src/pages/SoloLogin.tsx` - Line 81
- `client/src/components/layout/HomeLayout.tsx` - Line 88
- `client/src/components/gateway/SelectionView.tsx` - Line 89
- `client/index.html` - Page title, meta tags

**Client-side (Technical):**
- `client/src/hooks/useSessionPersistence.ts` - Line 26 (IndexedDB: 'KnowYourGrapeDB')
- `client/public/manifest.json` - Lines 2-3 (PWA name)

**Server-side:**
- `server/routes.ts` - Any hardcoded app name in responses
- `package.json` - Update `name` field if applicable

**Marketing/Docs:**
- `CLAUDE.md` - Update "Know Your Grape" description
- `PRODUCT_ROADMAP.md` - Update vision statement
- `PIVOT_RELEASE_NOTES.md` - Update app name

### Research Insights: Name Update

**Brand Constants Module (Recommended):**
Create a single source of truth to prevent scattered string literals:

```typescript
// Proposed: client/src/lib/brand.ts
export const BRAND = {
  name: 'Cata',
  tagline: 'Your personal sommelier',
  dbName: 'CataDB',
  meta: {
    title: 'Cata - Wine Tasting',
    description: 'Your personal sommelier for wine tasting experiences.',
  },
} as const;
```

**IndexedDB Migration (Critical):**
The database name change in `useSessionPersistence.ts` requires migration:

```typescript
// Migration approach - check for old DB, migrate data, then delete
const DB_NAME_OLD = 'KnowYourGrapeDB';
const DB_NAME_NEW = 'CataDB';

async function migrateDatabase() {
  const oldDB = await openDB(DB_NAME_OLD);
  if (oldDB) {
    const data = await oldDB.getAll('sessions');
    const newDB = await openDB(DB_NAME_NEW);
    await newDB.putAll('sessions', data);
    await deleteDB(DB_NAME_OLD);
  }
}
```

### Implementation

```tsx
// Before (HomeV2.tsx login screen):
<h1 className="text-2xl font-bold text-white mb-2">
  Know Your Grape
</h1>
<p className="text-white/60">Your personal wine journey</p>

// After:
<h1 className="text-2xl font-bold text-white mb-2">
  Cata
</h1>
<p className="text-white/60">Your personal sommelier</p>
```

---

## Phase 2: Background Simplification

**Decision: Simplify the gradient background to let the logo breathe.**

The current `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900` creates visual noise. When the logo is added, a busy gradient will compete with it.

### Research Insights: Dark Mode Best Practices

**Background Color Validation:**
- Near-black (#0f0a1a) is excellent for premium apps
- Google Material Design recommends dark gray (#121212) over pure black
- Adding subtle purple tint to dark grays is recommended for digital screens
- Netflix, Spotify, and premium finance apps use similar approaches

**Vertical vs Diagonal Gradient:**
- Vertical (180deg) is better for content-focused apps - less visual "busy-ness"
- Diagonal creates more movement but can compete with content
- Wine tasting apps are content-focused - vertical is appropriate

**Contrast Ratios (WCAG):**
| Text Type | Minimum | Target |
|-----------|---------|--------|
| Body text | 4.5:1 | 7:1 |
| Large text | 3:1 | 4.5:1 |

**Text Colors for Dark Mode:**
- Avoid pure white (#FFFFFF) - causes eye strain and "halation" effect
- Use off-white: #E8E6ED or #F0F0F0 for primary text
- Use #A0A0A0 to #B0B0B0 for secondary text

**References:**
- [LogRocket - Dark Mode Best Practices](https://blog.logrocket.com/ux-design/dark-mode-ui-design-best-practices-and-examples/)
- [Toptal - Principles of Dark UI Design](https://www.toptal.com/designers/ui/dark-ui-design)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

### Recommendation

```css
/* Current (index.css) */
--gradient-primary: linear-gradient(135deg, #581c87 0%, #1e1b4b 50%, #000000 100%);

/* New: Simpler, darker, lets logo pop */
--gradient-primary: linear-gradient(180deg, #0f0a1a 0%, #1a0f24 100%);

/* Updated text colors for better readability */
--text-primary: #E8E6ED;      /* Off-white, not pure white */
--text-secondary: #A0A0A0;
```

### Implementation

**File: `client/src/index.css`**
```css
:root {
  /* Updated primary gradient - darker, simpler */
  --gradient-primary: linear-gradient(180deg, #0f0a1a 0%, #1a0f24 100%);

  /* Keep card gradient subtle */
  --gradient-card: linear-gradient(135deg, rgba(88, 28, 135, 0.15) 0%, rgba(30, 27, 75, 0.1) 100%);

  /* Future light mode support - adopt .dark class pattern */
}

.dark {
  --gradient-primary: linear-gradient(180deg, #0f0a1a 0%, #1a0f24 100%);
}
```

**Critical: Replace Inline Tailwind Gradients**

The CSS variable change won't affect inline classes. Must replace:

```tsx
// Find and replace ALL instances of:
className="... bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ..."

// With:
className="... bg-gradient-primary ..."
```

Files with inline gradients to update:
- `HomeV2.tsx` (lines 115, 124, 181)
- `Gateway.tsx`
- `SoloDashboard.tsx`
- And others - grep for `from-slate-900`

---

## Phase 3: Color Refinement

### Keep These Colors (They Work)

| Purpose | Current | Decision |
|---------|---------|----------|
| Primary brand | `#7c3aed` (purple-500) | Keep - distinctive, wine-appropriate |
| Dark variant | `#581c87` (purple-900) | Keep - good for depth |
| Success | `#10b981` | Keep |
| Warning | `#f59e0b` | Keep |
| Error | `#ef4444` | Keep |

### Accent Colors by Action Type

The current accent system works well. Keep it:

| Action Type | Gradient | Example |
|-------------|----------|---------|
| Solo tasting | `from-rose-500 to-pink-600` | "Record wine" button |
| Learning | `from-indigo-500 to-purple-600` | "Journeys" button |
| Group/social | `from-blue-500 to-purple-600` | "Join session" |
| Host/create | `from-amber-500 to-orange-600` | "Host session" |

### Cards: Simplify Glassmorphism

### Research Insights: Glassmorphism 2025

**Current State:**
- Glassmorphism is still modern but requires thoughtful implementation
- Apple's "Liquid Glass" has legitimized the trend
- Risk: overuse can look dated quickly

**Performance Impact (Critical):**
| Blur Radius | Performance |
|-------------|-------------|
| 3-5px | Minimal impact, recommended for mobile |
| 10-12px | Good balance, stays smooth |
| 20px+ | Can impact frame rates on mobile |
| 24px (current) | Falls into problematic category |

**Recommendation: 12px (`backdrop-blur-md`) is the sweet spot.**

**Alternatives Considered:**
- Elevated surfaces (Apple approach) - slightly lighter shades for depth
- Solid fill with subtle borders - simpler, better performance
- Hybrid - blur for primary cards, solid for secondary

**Performance Optimization:**
```css
/* Add for GPU acceleration */
.glass-card {
  will-change: backdrop-filter;
  transform: translateZ(0);
}

/* Reduce blur on mobile */
@media (max-width: 768px) {
  .glass-card {
    backdrop-filter: blur(8px);
  }
}

/* Accessibility: respect user preferences */
@media (prefers-reduced-transparency: reduce) {
  .glass-card {
    backdrop-filter: none;
    background: rgba(255, 255, 255, 0.1);
  }
}
```

**References:**
- [Josh W. Comeau - Backdrop Filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [Apple HIG - Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

### Implementation

```tsx
// Current:
className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20"

// New: Less blur, more subtle
className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10"
```

**Why:**
- `backdrop-blur-md` (12px) instead of `xl` (24px) is ~49% faster
- Single `bg-white/5` instead of gradient is cleaner
- `border-white/10` instead of `/20` is less prominent

---

## Phase 4: Logo Integration

Using Option 10: top-down wine glass view with deep purple wine surface, white/silver rim, and subtle pink highlight.

### Research Insights: SVG Best Practices

**Inline SVG vs `<img>` Tag:**
| Use Case | Approach | Reason |
|----------|----------|--------|
| Splash/Login logo | Inline SVG component | Animation control, accessibility |
| Header lockup | Inline SVG component | Responsive styling with Tailwind |
| Decorative | `<img>` tag | Better caching |

**Vite Configuration:**

```typescript
// vite.config.ts - add vite-plugin-svgr
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        titleProp: true,  // Accessibility
        ref: true,        // Animation support
      },
    }),
  ],
});
```

**Usage:**
```tsx
// Import as React component
import LogoCata from '@/assets/logo-cata.svg?react';

// Import as URL
import logoUrl from '@/assets/logo-cata.svg';
```

**Accessibility Requirements (WCAG 1.1.1):**
```tsx
// Informative logo
<LogoCata
  role="img"
  aria-label="Cata Logo"
  className="w-20 h-20"
/>

// Logo inside link
<a href="/" aria-label="Cata - Go to homepage">
  <LogoCata aria-hidden="true" className="h-8" />
</a>
```

**Responsive Sizing:**
```tsx
// Remove hardcoded width/height from SVG, use Tailwind
<LogoCata className="w-20 h-20 md:w-24 md:h-24" />
<LogoCataHorizontal className="h-8 w-auto" />
```

**References:**
- [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr)
- [TPGi ARIA SVG Accessibility](https://www.tpgi.com/using-aria-enhance-svg-accessibility/)

### Login Screen Logo

```tsx
// Current (HomeV2.tsx):
<div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
  <Wine className="w-10 h-10 text-white" />
</div>

// After:
<img
  src="/logo-cata.svg"
  alt="Cata"
  width={80}
  height={80}
  className="w-20 h-20 mx-auto mb-4"
/>
```

### Header Logo

```tsx
// Current:
<div className="flex items-center gap-3">
  <Wine className="w-6 h-6 text-purple-400" />
  <span className="text-white font-semibold">Know Your Grape</span>
</div>

// After:
<img
  src="/logo-cata-horizontal.svg"
  alt="Cata"
  className="h-8 w-auto"
/>
```

### Logo Assets Needed

| Asset | Use Case | Notes |
|-------|----------|-------|
| `logo-cata.svg` | Splash, login | Square, full detail |
| `logo-cata-horizontal.svg` | Header | Icon + "cata" wordmark |
| `favicon.svg` | Browser tab | Simplified for 32x32 |

**Favicon Setup (index.html):**
```html
<head>
  <!-- SVG favicon with dark mode support -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <!-- PNG fallback -->
  <link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">
</head>
```

**First step:** Vectorize Option 10 in Figma or Illustrator to create clean SVG.

### Splash Screen

### Research Insights: Splash Screens

**When to Use:**
- App requires critical initialization (auth checks, config loading)
- Need to establish brand identity on first launch
- Use skeleton screens instead for page-level data loading

**Animation Timing:**
| Context | Duration |
|---------|----------|
| Entrance animation | 200-300ms |
| Exit animation | 150-200ms (faster than entrance) |
| Total display | Do not exceed 1000ms |

**Recommended: Fade out (not slide) for exit.**

**Performance Option: CSS Animation**
Consider CSS instead of Framer Motion for 25KB bundle savings:

```css
@keyframes splash-fade-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.splash-logo {
  animation: splash-fade-in 0.3s ease-out forwards;
}
```

**Preventing Flash of Content:**
```tsx
function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function initialize() {
      await checkAuthState();
      setIsReady(true);
      // Small delay for smooth transition
      await new Promise(r => setTimeout(r, 300));
      setShowSplash(false);
    }
    initialize();
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>
      {isReady && <MainApp />}
    </>
  );
}
```

**References:**
- [NN/g Animation Duration](https://www.nngroup.com/articles/animation-duration/)
- [Android Splash Screen Guidelines](https://developer.android.com/develop/ui/views/launch/splash-screen)

### Implementation

```tsx
// client/src/components/SplashScreen.tsx
import { motion } from 'framer-motion';

const logoAnimation = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
} as const;

export function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-gradient-primary flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <motion.img
        src="/logo-cata.svg"
        alt="Cata"
        className="w-24 h-24"
        {...logoAnimation}
      />
    </motion.div>
  );
}
```

---

## Implementation Order

1. [ ] Name update - replace all "KnowYourGrape" with "Cata" (12+ files)
2. [ ] IndexedDB migration - handle database rename
3. [ ] Background simplification - new gradient + replace inline Tailwind
4. [ ] Card simplification - reduce glassmorphism
5. [ ] Integrate logo (Option 10 - top-down wine glass)
6. [ ] Update login screen with logo
7. [ ] Update headers throughout app
8. [ ] Create splash screen
9. [ ] PWA manifest update + cache busting
10. [ ] Documentation updates

---

## Files to Modify (Complete)

| File | Phase | Changes |
|------|-------|---------|
| `client/src/index.css` | 2-3 | Gradient, card styles, text colors |
| `client/src/pages/HomeV2.tsx` | 1-4 | Name, backgrounds, cards, logo |
| `client/src/pages/SoloDashboard.tsx` | 1 | Name update (2 locations) |
| `client/src/pages/UserDashboard.tsx` | 1 | Name update |
| `client/src/pages/HomeTastings.tsx` | 1 | Name update |
| `client/src/pages/SoloLogin.tsx` | 1 | Name update |
| `client/src/components/layout/HomeLayout.tsx` | 1 | Name update |
| `client/src/components/gateway/SelectionView.tsx` | 1 | Name update |
| `client/src/hooks/useSessionPersistence.ts` | 1 | IndexedDB migration |
| `client/public/manifest.json` | 1 | PWA name, icons |
| `client/index.html` | 1, 4 | Title, meta, favicon |
| `vite.config.ts` | 4 | Add vite-plugin-svgr |
| `CLAUDE.md` | 1 | App description |
| `PRODUCT_ROADMAP.md` | 1 | Vision statement |

---

## Acceptance Criteria

### Phase 1 (Name)
- [ ] No "KnowYourGrape" text visible anywhere in app
- [ ] Page title shows "Cata"
- [ ] Login screen says "Cata"
- [ ] Headers say "Cata"
- [ ] IndexedDB migrated without data loss

### Phase 2 (Background)
- [ ] Background is darker and simpler
- [ ] All inline Tailwind gradients replaced with CSS variable
- [ ] Text contrast meets WCAG 4.5:1 minimum
- [ ] Overall feel is more premium/sophisticated

### Phase 3 (Colors)
- [ ] Purple still feels like primary brand color
- [ ] Action buttons are still distinct by type
- [ ] Cards are less "glassy", more subtle
- [ ] Blur reduced to 12px on desktop, 8px on mobile

### Phase 4 (Logo)
- [ ] Logo appears on login screen with proper alt text
- [ ] Logo appears in headers
- [ ] Logo scales appropriately on different screens
- [ ] Splash screen shows logo with fade animation
- [ ] Favicon updated

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Logo needs tweaks after seeing it in-app | Low | Logo is SVG, easy to swap out |
| Background too dark | Medium | Test on multiple devices, adjust opacity if needed |
| Glassmorphism reduction loses personality | Low | Keep subtle blur, don't go fully flat |
| Inline gradients bypass CSS variable changes | High | Audit and replace all inline gradients |
| IndexedDB data loss on rename | High | Implement migration before renaming |
| PWA cache serves old brand | Medium | Bump service worker cache version |

---

## Performance Summary

| Change | Impact |
|--------|--------|
| Backdrop-blur 24px → 12px | ~49% faster blur calculation |
| Gradient 3-color → 2-color | Marginal (~0.1-0.5ms per paint) |
| SVG logo vs React component | 1-2KB bundle reduction |
| CSS animation vs Framer Motion | 25KB savings (if applicable) |

---

## References

### Internal
- `BRAND.md` - Full brand guidelines with logo exploration learnings
- `plans/feat-dashboard-redesign-v2.md` - UI design vision (some overlap)
- `client/src/index.css` - Current CSS variables
- `client/src/pages/HomeV2.tsx` - Main UI to update

### External
- [LogRocket - Dark Mode Best Practices](https://blog.logrocket.com/ux-design/dark-mode-ui-design-best-practices-and-examples/)
- [Toptal - Principles of Dark UI Design](https://www.toptal.com/designers/ui/dark-ui-design)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Josh W. Comeau - Backdrop Filter](https://www.joshwcomeau.com/css/backdrop-filter/)
- [Apple HIG - Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [vite-plugin-svgr](https://github.com/pd4d10/vite-plugin-svgr)
- [TPGi ARIA SVG Accessibility](https://www.tpgi.com/using-aria-enhance-svg-accessibility/)
- [NN/g Animation Duration](https://www.nngroup.com/articles/animation-duration/)
