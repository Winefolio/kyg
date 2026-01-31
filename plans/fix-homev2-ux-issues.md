# Fix HomeV2 UX Issues: Navigation, Equal Prominence, and Group History

## Enhancement Summary

**Deepened on:** 2026-01-21
**Research agents used:** 8 (TypeScript reviewer, Code simplicity reviewer, Architecture strategist, Frontend races reviewer, Performance oracle, Pattern recognition specialist, Framework docs researcher, Best practices researcher)

### Key Improvements
1. **Simplified navigation fix**: Use Option B (direct route) - just remove redirect, 2 lines changed
2. **Type safety enhancements**: Export TabKey from single source, avoid `any[]` types
3. **Performance optimizations**: Add staleTime/gcTime to queries, prefetch on tab hover
4. **Race condition mitigations**: Include tab in query key, handle rapid switching

### New Considerations Discovered
- HomeV2.tsx at 1,253 lines is a code smell - consider extracting tab contents to separate files
- Duplicate TabKey type definitions between HomeV2.tsx and BottomNav.tsx need consolidation
- The wildcard route pattern with manual path inspection is fragile - consider parameterized routes

---

## Overview

Three issues were identified in the newly deployed Three Pillars HomeV2 interface:

1. **Learning Journeys Navigation Bug** - Clicking "Learning Journeys" button doesn't navigate to the journeys browser; it stays on Solo tab
2. **Unequal Prominence** - Solo Tasting and Learning Journeys should be equally weighted entry points, not one "sandwiched" below the other
3. **Missing Group Tasting History** - Group tab shows "Your group tasting history will appear here" even for users with group tasting data

## Problem Analysis

### Issue 1: Learning Journeys Navigation Bug

**Root Cause:** The Learning Journeys button navigates to `/journeys` (line 408 in HomeV2.tsx):
```tsx
onClick={() => setLocation("/journeys")}
```

App.tsx redirects `/journeys` to `/home/journeys`:
```tsx
<Route path="/journeys">
  <Redirect to="/home/journeys" />
</Route>
```

But `/home/journeys` is matched by `<Route path="/home/:rest*" component={HomeV2} />`, which renders HomeV2. Inside HomeV2, `getActiveTab()` only checks for `/group` or `/dashboard` - anything else returns `"solo"`:
```tsx
const getActiveTab = (): TabKey => {
  if (location.includes("/group")) return "group";
  if (location.includes("/dashboard")) return "dashboard";
  return "solo"; // ← /home/journeys falls through to solo!
};
```

**Result:** User clicks Learning Journeys → redirects to `/home/journeys` → HomeV2 renders → but still shows Solo tab.

### Research Insights: Navigation

**Simplicity reviewer verdict: Option B is significantly simpler.**

| Aspect | Option A (Embedded Tab) | Option B (Direct Route) |
|--------|-------------------------|------------------------|
| Type changes | Add "journeys" to TabKey | None |
| New component | JourneysTabContent (duplicate) | None |
| Lines of code | +150-250 | -4 lines |
| Complexity | High | Low |

**Architecture strategist verdict: Keep journeys separate.**
- Journeys represent a different navigation depth (Journey → Chapters → Tasting)
- Tabs should represent peer-level views, not entry points into deep flows
- Mobile UX research suggests 3-5 tabs maximum

**Wouter routing best practice:**
- The wildcard + manual path inspection pattern is fragile
- Consider using parameterized routes: `<Route path="/home/:tab?" component={HomeV2} />`

### Issue 2: Unequal Prominence - Solo vs Journeys

**Current Layout (Solo Tab):**
```
[Header]
[Solo Tastings title]
[Start New Tasting] ← BIG gradient button, most prominent
[Continue Journey card] ← only if in progress
[Learning Journeys] ← smaller, secondary-looking button
[Taste Profile]
[Recent Tastings]
```

**Problem:** Learning Journeys looks like a secondary option tucked under Solo Tasting. But these are **two equally important paths** users should choose from.

### Research Insights: Equal Prominence UI

**Best practices for dual equally-weighted CTAs:**
- Side-by-side 2-column grid creates visual symmetry that reinforces equal weight
- Both options visible simultaneously without scrolling
- Use CSS Grid: `grid-template-columns: repeat(2, minmax(0, 1fr))`

**Color strategy for equal weight:**
- Same structure, different colors of equal saturation
- Wine context recommendation: Burgundy (#722F37) + Deep Teal (#2E5851)
- Both colors suggest sophistication with equal visual weight

**Touch target requirements (WCAG):**
- Minimum 48x48dp (Android Material Design)
- Card height: 140-160px minimum
- Gap between cards: 16px

**Animation for equality:**
- Both cards should animate simultaneously (not staggered)
- Mirrored animations reinforce equality
- Hover/press: subtle scale (1.02/0.98), 150-200ms transition

### Issue 3: Missing Group Tasting History

**Root Cause:** The Group Tab Content (lines 826-837) shows a static placeholder:
```tsx
{/* Group History - placeholder */}
<div>
  <h2 className="text-lg font-semibold text-white mb-4">
    Recent Group Tastings
  </h2>
  <div className="text-center py-12 ...">
    <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
    <p className="text-white/60">
      Your group tasting history will appear here
    </p>
  </div>
</div>
```

**The data exists!** The API endpoint `/api/dashboard/:email/history` fetches combined solo + group history using `storage.getUserTastingHistory()`. The Dashboard tab even shows the correct counts (10 Total, 4 Solo, 6 Group from Image 4).

But the Group tab **never calls this API** - it just shows a hardcoded empty state.

### Research Insights: Data Fetching

**TypeScript reviewer requirements:**
```typescript
// BAD - No error handling, uses any[]
const { data: historyData } = useQuery<any[]>({...});

// GOOD - Proper types and error handling
interface GroupTasting {
  sessionId: string;
  packageName: string;
  winesTasted: number;
  startedAt: string;
  source: 'group' | 'solo';
}

const { data: historyData, isLoading, error } = useQuery<GroupTasting[]>({
  queryKey: ['dashboard', 'history', user.email],
  queryFn: async () => {
    const response = await apiRequest(...);
    if (!response.ok) {
      if (response.status === 404) return []; // Expected for new users
      throw new Error("Failed to fetch history");
    }
    return response.json();
  },
  enabled: !!user.email,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Performance oracle recommendations:**
- Add `staleTime: 5 * 60 * 1000` (5 minutes)
- Add `gcTime: 30 * 60 * 1000` (30 minutes)
- Add `enabled: activeTab === 'group'` to only fetch when tab is active
- Implement prefetch on tab hover for instant perceived loading

**Race condition mitigations:**
- Include `activeTab` in query key to prevent stale data on rapid tab switching
- Use `useMemo` for derived data (filtered group tastings)

---

## Proposed Solution

### Fix 1: Learning Journeys Navigation (SIMPLIFIED)

**Use Option B: Direct Route (2 lines changed)**

1. **Remove the redirect** in App.tsx (lines 57-59):
```tsx
// DELETE these lines:
<Route path="/journeys">
  <Redirect to="/home/journeys" />
</Route>
```

2. **Keep the existing route** for JourneyBrowser:
```tsx
// This already exists and will now work
<Route path="/journeys" component={JourneyBrowser} />
```

3. **Update JourneyBrowser back button** to return to `/home`:
```tsx
// In JourneyBrowser.tsx, update back navigation
onClick={() => setLocation("/home")} // Instead of "/"
```

**Why this is better:**
- No code duplication
- No new components needed
- JourneyBrowser already has filtering, grid layout, etc.
- Journey detail pages (`/journeys/:id`) already work

### Fix 2: Equal Prominence for Solo Tasting vs Learning Journeys

**Design Pattern:** Use the same **two-column grid** pattern already used successfully in the Group tab.

**Proposed Solo Tab Layout:**

```
[Header]
["What would you like to do today?"]

+-------------------+-------------------+
|  [Wine Icon]      |  [Graduate Cap]   |
|  Solo Tasting     |  Learning         |
|  Record your      |  Journeys         |
|  experience       |  Guided education |
+-------------------+-------------------+

[Continue Journey card] ← only if in progress

[Your Taste Profile summary]

[Recent Solo Tastings list]
```

**Implementation with research insights:**

```tsx
{/* Two Primary Actions - Equal Weight */}
<div className="grid grid-cols-2 gap-4">
  {/* Solo Tasting Card */}
  <motion.button
    onClick={() => setLocation("/tasting/new")}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-left min-h-[160px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
  >
    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
      <Wine className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Solo Tasting</h3>
    <p className="text-white/70 text-sm">Record your wine experience</p>
  </motion.button>

  {/* Learning Journeys Card - EQUAL styling, different color */}
  <motion.button
    onClick={() => setLocation("/journeys")}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-left min-h-[160px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
  >
    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
      <GraduationCap className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">Learning Journeys</h3>
    <p className="text-white/70 text-sm">Structured wine education</p>
  </motion.button>
</div>
```

**Key design decisions:**
- Same height (`min-h-[160px]`) ensures equal visual weight
- Simultaneous animation (same `transition` props) reinforces equality
- Different but equally saturated gradients differentiate without hierarchy
- Focus-visible ring for accessibility

### Fix 3: Fetch and Display Group Tasting History

**Implementation with all research insights:**

```tsx
// Define proper types (NOT any[])
interface GroupTasting {
  sessionId: string;
  packageName: string;
  winesTasted: number;
  startedAt: string;
  completedAt: string | null;
  source: 'group' | 'solo';
  userScore: string;
  groupScore: string;
}

// In GroupTabContent:
const queryClient = useQueryClient();

// Optimized query with proper caching
const { data: historyData, isLoading: historyLoading } = useQuery<GroupTasting[]>({
  queryKey: ['dashboard', 'history', user.email, 'group'], // Include tab for cache isolation
  queryFn: async () => {
    const response = await apiRequest(
      "GET",
      `/api/dashboard/${encodeURIComponent(user.email)}/history?limit=10`,
      null
    );
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error("Failed to fetch history");
    }
    const data = await response.json();
    return data.filter((t: GroupTasting) => t.source === 'group');
  },
  enabled: !!user.email,
  staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
  gcTime: 30 * 60 * 1000,   // 30 minutes - keep in cache
  refetchOnWindowFocus: false,
});

// Prefetch on tab hover (add to BottomNav)
const prefetchGroupHistory = () => {
  queryClient.prefetchQuery({
    queryKey: ['dashboard', 'history', user.email, 'group'],
    queryFn: fetchGroupHistory,
    staleTime: 5 * 60 * 1000,
  });
};
```

**Render with proper loading/error states:**

```tsx
{/* Recent Group Tastings */}
<div>
  <h2 className="text-lg font-semibold text-white mb-4">
    Recent Group Tastings
  </h2>

  {historyLoading ? (
    <div className="flex justify-center py-8">
      <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
    </div>
  ) : historyData && historyData.length > 0 ? (
    <div className="space-y-3">
      {historyData.slice(0, 5).map((tasting) => (
        <motion.div
          key={tasting.sessionId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setLocation(`/dashboard/${encodeURIComponent(user.email)}/tasting/${tasting.sessionId}`)}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">
                {tasting.packageName}
              </h3>
              <div className="flex flex-wrap gap-2 text-sm text-white/60 mt-1">
                <span>{tasting.winesTasted} wines</span>
                <span>•</span>
                <span>{new Date(tasting.startedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </div>
        </motion.div>
      ))}
    </div>
  ) : (
    <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
      <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
      <p className="text-white/60">
        Your group tasting history will appear here
      </p>
    </div>
  )}
</div>
```

---

## Acceptance Criteria

### Navigation
- [ ] Clicking "Learning Journeys" button navigates to JourneyBrowser page
- [ ] JourneyBrowser "Back" button returns to `/home`
- [ ] No redirect loop or stuck navigation

### Equal Prominence
- [ ] Solo Tasting and Learning Journeys appear as two equal-sized cards side by side
- [ ] Both cards have similar gradient styling and visual weight
- [ ] Both cards animate simultaneously (not staggered)
- [ ] On mobile (single column), both cards have equal height and styling
- [ ] Neither option appears "primary" over the other
- [ ] Touch targets meet WCAG AA (minimum 48x48dp)

### Group History
- [ ] Users with group tasting history see their past sessions listed
- [ ] Each group tasting shows: package name, date, wines tasted count
- [ ] Tapping a group tasting navigates to `/dashboard/:email/tasting/:sessionId`
- [ ] Empty state only shows when user has zero group tastings
- [ ] Loading spinner shown while fetching
- [ ] Data is cached for 5 minutes (staleTime)

### General
- [ ] All three tabs (Solo, Group, Dashboard) continue to work
- [ ] Tab switching remains smooth with proper animations
- [ ] No race conditions on rapid tab switching
- [ ] No regression in existing features

---

## Implementation Plan

### Phase 1: Fix Navigation Bug (2 lines)

**File:** `client/src/App.tsx`

**Change:** Delete the redirect (lines 57-59):
```tsx
// DELETE:
<Route path="/journeys">
  <Redirect to="/home/journeys" />
</Route>
```

**File:** `client/src/pages/JourneyBrowser.tsx`

**Change:** Update back button to go to `/home` instead of `/`.

### Phase 2: Equal Prominence UI (~15 lines)

**File:** `client/src/pages/HomeV2.tsx`

**Replace** the current two separate buttons (lines 340-428) with the two-column grid layout shown above.

**Key changes:**
- Wrap in `<div className="grid grid-cols-2 gap-4">`
- Make both buttons equal height (`min-h-[160px]`)
- Use equally-saturated gradients
- Animate both simultaneously

### Phase 3: Group History Implementation (~40 lines)

**File:** `client/src/pages/HomeV2.tsx`

**Change 1:** Add type definition at top of file:
```tsx
interface GroupTasting {
  sessionId: string;
  packageName: string;
  winesTasted: number;
  startedAt: string;
  source: 'group' | 'solo';
}
```

**Change 2:** Add history query to `GroupTabContent` (after existing queries).

**Change 3:** Replace placeholder (lines 826-837) with actual tasting list.

---

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| `client/src/App.tsx` | Remove redirect | -3 |
| `client/src/pages/JourneyBrowser.tsx` | Update back button | ~1 |
| `client/src/pages/HomeV2.tsx` | Grid layout + history fetch | ~55 |

**Total: ~55 lines changed**

---

## Technical Debt to Address (Future)

From the architecture and TypeScript reviews:

1. **Extract tab contents to separate files** - HomeV2.tsx is 1,253 lines
2. **Consolidate TabKey type** - Currently duplicated in HomeV2.tsx and BottomNav.tsx
3. **Fix `any[]` usage** - Line 290 uses `any[]` for journeys data
4. **Consider parameterized routes** - Replace wildcard pattern with `/home/:tab?`

---

## References

### Internal
- `client/src/pages/HomeV2.tsx:407-428` - Current Learning Journeys button
- `client/src/pages/HomeV2.tsx:759-795` - Group tab two-column grid pattern to reuse
- `client/src/pages/HomeV2.tsx:826-837` - Current group history placeholder
- `server/routes/dashboard.ts:89-109` - History API endpoint
- `server/storage.ts:5178-5299` - getUserTastingHistory implementation

### External
- [TanStack Query - Conditional Fetching](https://tanstack.com/query/v5/docs/framework/react/guides/dependent-queries)
- [Framer Motion - AnimatePresence](https://www.framer.com/motion/animate-presence/)
- [WCAG 2.5.8 - Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Design Monks - Two Primary Buttons UI](https://www.designmonks.co/blog/show-two-primary-buttons-ui)

### User Feedback Images
- Image 1: Gateway.tsx showing equal-weight options
- Image 2: Current Solo tab with sandwiched Learning Journeys
- Image 3: Group tab with missing history
- Image 4: Dashboard showing correct stats (10 Total, 4 Solo, 6 Group)
