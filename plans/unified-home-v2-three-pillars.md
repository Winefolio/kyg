# Unified Home V2: Three Pillars Architecture

## Enhancement Summary

**Deepened on:** 2026-01-21
**Research agents used:** 7 (TypeScript reviewer, Architecture strategist, Simplicity reviewer, Best practices researcher, Race conditions reviewer, Framework docs researcher, Pattern specialist)

### Key Improvements
1. **Simplified architecture**: Reduced from 5 new files to 2 (HomeV2.tsx + BottomNav.tsx) with inline tab components
2. **Race condition mitigations**: Identified 6 potential race conditions with specific fixes
3. **Type-safe implementation**: Query key factories, discriminated unions for tab state
4. **Performance optimizations**: Prefetching on tab hover, shared query cache between tabs

### New Considerations Discovered
- Service Worker caching can cause stale UI - need cache invalidation strategy
- Tab switching during data fetch needs cleanup via AbortController
- Reuse existing Gateway components (JoinSessionView, HostSessionView) rather than rebuilding
- Existing codebase patterns should be followed: glassmorphism cards, AnimatePresence transitions

---

## Problem Statement

The current unified home implementation incorrectly consolidated everything into "solo" experiences, effectively hiding the **Group Tasting** feature which is the ORIGINAL core of the app. The user now sees:
- Tastings tab (solo only)
- Journeys tab (solo learning)
- Profile tab (solo data)

**What's missing**: Group sessions - Join Session, Host Session, group tasting history, group data.

## Product Vision (from CLAUDE.md & PIVOT_RELEASE_NOTES.md)

KnowYourGrape has **THREE** ways to use it:

| Experience | What It Is | Who It's For |
|------------|-----------|--------------|
| **Solo Tastings** | Personal wine journal with AI wine recognition | Anyone wanting to track their tastings |
| **Learning Journeys** | Structured wine education with chapters | Users who want guided learning |
| **Group Sessions** | Host-led live tastings (original feature) | Events, classes, wine clubs |

**The app should surface ALL THREE experiences, not just solo.**

---

## Proposed Architecture: Three-Tab Home

### Route Structure
```
/                          # Gateway (unauthenticated landing)
/home                      # Unified home (default: Solo tab)
/home/solo                 # Solo tab (tastings + journeys)
/home/group                # Group tab (join/host sessions, group history)
/home/dashboard            # Dashboard tab (all your data, insights, agent chat)

# Action routes (outside tabs)
/tasting/new               # Start new solo tasting
/journeys/:id              # Journey detail
/join                      # Join group session flow
/host/:sessionId/:id       # Host dashboard
/tasting/:sessionId/:id    # Group tasting session
```

### Research Insights: Routing

**Wouter nested routing pattern:**
```typescript
// In App.tsx - use nest prop for /home/* routes
<Route path="/home" nest>
  <Route path="/" component={HomeV2} />
  <Route path="/solo" component={HomeV2} />
  <Route path="/group" component={HomeV2} />
  <Route path="/dashboard" component={HomeV2} />
</Route>

// In HomeV2.tsx - useRoute to detect active tab
const [isSolo] = useRoute("/home/solo");
const [isGroup] = useRoute("/home/group");
const [isDashboard] = useRoute("/home/dashboard");
```

**Performance: Prefetch on hover:**
```typescript
const queryClient = useQueryClient();

const handleTabHover = (tab: TabType) => {
  if (tab === 'group') {
    queryClient.prefetchQuery({
      queryKey: ['group-sessions', user?.email],
      queryFn: fetchGroupSessions,
      staleTime: 30000,
    });
  }
};
```

### Bottom Tab Bar
```
+------------------+------------------+------------------+
|       Solo       |      Group       |    Dashboard     |
|  (Wine glass)    |    (Users)       |   (BarChart)     |
+------------------+------------------+------------------+
```

### Research Insights: Tab Navigation

**Mobile-first best practices:**
- Touch targets: minimum 44x44px (Apple HIG), 48x48dp (Material)
- Active state: filled icon + label, inactive: outline icon only
- Safe area: respect `env(safe-area-inset-bottom)` for notched devices
- Haptic feedback on tab change via `useHaptics` hook

**Configuration-driven navigation:**
```typescript
const TAB_CONFIG = [
  { key: 'solo', path: '/home/solo', icon: Wine, label: 'Solo' },
  { key: 'group', path: '/home/group', icon: Users, label: 'Group' },
  { key: 'dashboard', path: '/home/dashboard', icon: BarChart3, label: 'Dashboard' },
] as const;

type TabKey = typeof TAB_CONFIG[number]['key'];
```

---

## Tab Content Design

### Solo Tab (`/home` or `/home/solo`)

**Purpose**: Your personal wine journey - tastings you've done alone and learning paths.

**Content**:
1. **Hero Action Card**
   - "Start New Tasting" button (prominent)
   - Quick stats: X solo tastings, current streak

2. **Continue Journey** (if in progress)
   - Current chapter, progress bar
   - "Continue" button

3. **Recent Solo Tastings**
   - List of recent wines tasted solo
   - Tap to view detail

4. **Browse Journeys**
   - Journey cards grid
   - Filter by difficulty/type

**Actions**:
- Start New Tasting → `/tasting/new`
- View Tasting → `/solo/tasting/:id`
- Continue Journey → `/journeys/:id`
- Browse Journeys → expandable section or modal

### Research Insights: Solo Tab

**Reuse existing components from HomeTastings.tsx:**
- TastingCard component for recent tastings list
- Journey continuation card logic
- Empty state messaging

**Animation pattern (from codebase):**
```typescript
<AnimatePresence mode="wait">
  {activeJourney && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Continue Journey card */}
    </motion.div>
  )}
</AnimatePresence>
```

---

### Group Tab (`/home/group`)

**Purpose**: Live sessions with others - join, host, and review your group experiences.

**Content**:
1. **Quick Actions** (two prominent buttons)
   - "Join Session" - Enter with code or scan QR
   - "Host Session" - Start with package code

2. **Active Session** (if any)
   - Session you're currently in
   - "Rejoin" button

3. **Recent Group Tastings**
   - Sessions you've participated in
   - Shows: Package name, date, host, wines tasted
   - Badge: "Hosted" vs "Participated"

4. **Group Stats**
   - Total group tastings
   - Unique hosts/groups
   - Favorite package/wine from group sessions

**Actions**:
- Join Session → `/join` modal or page
- Host Session → `/host` flow
- View Group Tasting → `/dashboard/:email/tasting/:sessionId`

### Research Insights: Group Tab

**Critical: Reuse Gateway components directly:**
```typescript
import { JoinSessionView } from "@/components/gateway/JoinSessionView";
import { HostSessionView } from "@/components/gateway/HostSessionView";

// These components already handle:
// - Session code input with validation
// - QR scanner modal
// - Package code input
// - Host display name
// - Error states and loading
```

**Session restoration (from Gateway.tsx):**
```typescript
const { activeSession, endSession } = useSessionPersistence();

// Check for active session on mount
useEffect(() => {
  if (activeSession && activeSession.isActive) {
    setShowRestoreModal(true);
  }
}, [activeSession]);
```

**Race condition mitigation - tab switch during session validation:**
```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const validateSession = async (sessionCode: string) => {
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();

  try {
    const response = await fetch(`/api/sessions/${sessionCode}`, {
      signal: abortControllerRef.current.signal,
    });
    // ...
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
};

// Cleanup on unmount or tab change
useEffect(() => {
  return () => abortControllerRef.current?.abort();
}, []);
```

---

### Dashboard Tab (`/home/dashboard`)

**Purpose**: ALL your wine data in one place - unified view of solo + group tastings, insights, and eventually AI agent chat.

**Content**:
1. **Overview Stats**
   - Total tastings (X solo + Y group = Z total)
   - Unique wines
   - Average rating
   - Favorite region/grape

2. **Taste Profile** (from existing UserDashboard)
   - Preference bars (sweetness, acidity, tannins, body)
   - One-line summary
   - Red Wine Profile card
   - White Wine Profile card

3. **Wine Collection**
   - ALL wines rated (solo + group combined)
   - Filter: All | Solo | Group
   - Sort: Recent, Rating, Region

4. **Sommelier Tips** (if enough data)
   - What to ask at restaurants
   - Wines to explore next

5. **Future: Chat with Your Data**
   - "Ask about your wines" input
   - Photo menu scanner
   - AI recommendations

**Data Sources**:
- `/api/dashboard/:email` - existing endpoint
- `/api/solo/preferences` - solo preferences
- Combine both data sources

### Research Insights: Dashboard Tab

**Query key factory pattern:**
```typescript
const dashboardKeys = {
  all: ['dashboard'] as const,
  user: (email: string) => [...dashboardKeys.all, email] as const,
  solo: (email: string) => [...dashboardKeys.user(email), 'solo'] as const,
  group: (email: string) => [...dashboardKeys.user(email), 'group'] as const,
  unified: (email: string) => [...dashboardKeys.user(email), 'unified'] as const,
};
```

**Parallel queries for combined data:**
```typescript
const { data: dashboardData } = useQuery({
  queryKey: dashboardKeys.user(user.email),
  queryFn: () => apiRequest('GET', `/api/dashboard/${user.email}`),
});

const { data: soloData } = useQuery({
  queryKey: dashboardKeys.solo(user.email),
  queryFn: () => apiRequest('GET', '/api/solo/preferences'),
});

// Combine in component
const totalTastings = (dashboardData?.totalTastings ?? 0) + (soloData?.tastingCount ?? 0);
```

**Reuse existing UserDashboard components:**
- TasteProfileCard
- WinePreferenceBars
- SommelierTips section
- Wine collection grid

---

## Implementation Phases (Simplified)

### Research Insight: Reduce to 2 Phases

The simplicity reviewer recommended consolidating 5 phases to 2, and reducing 5 new files to 2:

### Phase 1: Build HomeV2 with All Three Tabs

**Single file approach (HomeV2.tsx):**
```typescript
// HomeV2.tsx - ~300 lines with inline tab components
export default function HomeV2() {
  const [location, setLocation] = useLocation();
  const activeTab = location.includes('/group') ? 'group'
                  : location.includes('/dashboard') ? 'dashboard'
                  : 'solo';

  return (
    <div className="min-h-screen bg-gradient-primary pb-20">
      <AnimatePresence mode="wait">
        {activeTab === 'solo' && <SoloTabContent key="solo" />}
        {activeTab === 'group' && <GroupTabContent key="group" />}
        {activeTab === 'dashboard' && <DashboardTabContent key="dashboard" />}
      </AnimatePresence>

      <BottomNav activeTab={activeTab} />
    </div>
  );
}

// Inline tab components (or extract to separate files if >100 lines each)
function SoloTabContent() { /* ... */ }
function GroupTabContent() { /* ... */ }
function DashboardTabContent() { /* ... */ }
```

**Tasks:**
- [ ] Create `HomeV2.tsx` with tab switching logic
- [ ] Create `BottomNav.tsx` component (reuse existing BottomTabBar patterns)
- [ ] Implement SoloTabContent (reuse HomeTastings content)
- [ ] Implement GroupTabContent (reuse Gateway JoinSessionView/HostSessionView)
- [ ] Implement DashboardTabContent (reuse UserDashboard content)
- [ ] Add routes in App.tsx

### Phase 2: Cleanup & Polish

**Tasks:**
- [ ] Update Gateway to show options for unauthenticated only
- [ ] Add redirects from old routes (`/solo` → `/home`, etc.)
- [ ] Test all flows end-to-end
- [ ] Remove deprecated files after verification
- [ ] Clear Service Worker cache on deploy

---

## Files to Create/Modify

**New files (reduced from 5 to 2):**
- `client/src/pages/HomeV2.tsx` - Unified home with inline tab components (~300 lines)
- `client/src/components/home/BottomNav.tsx` - Three-tab navigation (~80 lines)

**Modify:**
- `client/src/App.tsx` - Add new routes with `nest` prop
- `client/src/pages/Gateway.tsx` - Keep for unauthenticated only (no changes needed)

**Eventually delete:**
- `client/src/pages/Home.tsx` (old version)
- `client/src/pages/HomeTastings.tsx`
- `client/src/pages/HomeJourneys.tsx`
- `client/src/pages/HomeProfile.tsx`
- `client/src/components/layout/HomeLayout.tsx`
- `client/src/components/layout/BottomTabBar.tsx`

---

## Race Condition Mitigations

The race conditions reviewer identified 6 potential issues:

### 1. Tab switching during data fetch
**Risk:** User switches tabs before query completes, stale data renders
**Fix:** Use AbortController, check `isMounted` ref before setState

### 2. Auth state changes during navigation
**Risk:** User logs out mid-navigation, crash or wrong state
**Fix:** Guard all navigation with `if (!user) return;`

### 3. Service Worker cache serving stale UI
**Risk:** After deploy, users see old UI until hard refresh
**Fix:** Version SW cache, use `skipWaiting()` + notify user to refresh

### 4. Optimistic updates with network failures
**Risk:** UI shows success but network fails
**Fix:** TanStack Query's `onError` rollback, show toast on failure

### 5. Session restoration conflicts
**Risk:** User has active session but starts new one
**Fix:** SessionRestoreModal (already in Gateway.tsx), check before allowing new session

### 6. Animation state during rapid tab switches
**Risk:** AnimatePresence gets confused with rapid switching
**Fix:** Use `mode="wait"` and unique keys per tab

---

## Codebase Patterns to Follow

### Card Styling (glassmorphism pattern)
```typescript
className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20"
```

### Animation Pattern
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

### Data Fetching Pattern
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/endpoint', param],
  queryFn: async () => {
    const response = await apiRequest('GET', `/api/endpoint/${param}`, null);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  enabled: !!param,
});
```

### Loading State
```typescript
if (isLoading) {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );
}
```

### Empty State
```typescript
<div className="text-center py-12">
  <Wine className="w-12 h-12 text-white/30 mx-auto mb-4" />
  <p className="text-white/60">No tastings yet</p>
  <Button onClick={() => setLocation('/tasting/new')}>
    Start Your First Tasting
  </Button>
</div>
```

---

## Key Principles

1. **Three Pillars, Not One**: Solo, Group, and Dashboard are equal citizens
2. **Group Sessions are NOT deprecated**: They're the original value prop
3. **Dashboard unifies ALL data**: Solo + Group in one view
4. **Clear mental model**:
   - Solo = my personal wine journey
   - Group = social tasting experiences
   - Dashboard = everything about my wine data

---

## Success Criteria

- [ ] User can start a solo tasting from Solo tab
- [ ] User can join/host group session from Group tab
- [ ] User can see ALL their tastings (solo + group) in Dashboard
- [ ] Group tasting history is visible and accessible
- [ ] Existing features (journeys, profile, wine intelligence) all still work
- [ ] Navigation is clear and thumb-friendly on mobile
- [ ] No features are hidden or removed
- [ ] Tab switching is smooth with proper animations
- [ ] No race conditions on rapid tab switching

---

## What This Plan Does NOT Change

- Group session flow (`/join`, `/tasting/:id/:id`, `/host/:id/:id`)
- Solo tasting flow (`/tasting/new`, `/solo/tasting/:id`)
- Journey flow (`/journeys/:id`)
- Sommelier Dashboard (`/sommelier`)
- Package Editor (`/editor/:code`)
- Journey Admin (`/admin/journeys`)
- API endpoints

---

## Reference Files

- `CLAUDE.md` - Architecture overview
- `PRODUCT_ROADMAP.md` - Vision and priorities
- `PIVOT_RELEASE_NOTES.md` - Three experiences table
- `FEATURE_BACKLOG.md` - Dashboard redesign spec
- `client/src/pages/UserDashboard.tsx` - Existing dashboard with taste profile
- `client/src/pages/Gateway.tsx` - Join/Host session views
- `client/src/components/gateway/SelectionView.tsx` - Gateway options
- `client/src/components/gateway/JoinSessionView.tsx` - Join session UI (REUSE)
- `client/src/components/gateway/HostSessionView.tsx` - Host session UI (REUSE)
