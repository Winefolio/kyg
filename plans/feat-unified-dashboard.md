# feat: Unified User Dashboard

**Created**: 2026-01-15
**Status**: Draft
**Complexity**: High (authentication, data merging, route changes)

## Overview

Replace the fragmented dashboard experience with a single unified dashboard that shows ALL tasting data (solo + group) in one place.

### Current State (Fragmented)

| Route | Page | Data Shown | Auth Model |
|-------|------|------------|------------|
| `/dashboard/:email` | UserDashboard | Group tastings, sommelier tips, AI taste profile | Email param (no auth) |
| `/solo/profile` | SoloProfile | Solo stats, preference bars, monthly activity | Session auth |

### Proposed State (Unified)

| Route | Page | Data Shown | Auth Model |
|-------|------|------------|------------|
| `/dashboard/:email` | UnifiedDashboard | ALL tastings, combined stats, preference bars, recommendations | Session auth (recommended) |
| `/solo/profile` | Redirect → `/dashboard/:email` | N/A | N/A |
| `/solo/journal` | SoloJournal | Recording interface (unchanged) | Session auth |

---

## Problem Statement

Users who do both solo and group tastings have their wine knowledge fragmented across two separate dashboards:
- **UserDashboard** lacks preference bars and solo tasting data
- **SoloProfile** lacks sommelier tips and group tasting insights
- Users can't see their full wine journey in one place
- Preference profiles are calculated from partial data

This fragmentation dilutes the core value proposition: "Know Your Grape" should mean understanding your complete palate, not two partial views.

---

## Proposed Solution

### Architecture Decision: Email-Based Access (Simple)

**Decision**: The unified dashboard uses email-based access only—no session auth required.

**Rationale**:
- Keep it simple for now, optimize for ease of use
- Anyone can access dashboard with just an email URL
- Matches existing group tasting model
- Security hardening can come later

**Access Model**:
- `/dashboard/:email` accessible to anyone with the URL
- Solo + group data both shown for that email
- No authentication required to view

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Unified Dashboard                            │
│  /dashboard/:email (requires session, email must match)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Group Tastings  │    │  Solo Tastings   │                   │
│  │  (participants)  │    │  (tastings)      │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌──────────────────────┐                               │
│           │  Unified Stats       │                               │
│           │  - Total wines: 127  │                               │
│           │  - Solo: 43          │                               │
│           │  - Group: 84         │                               │
│           └──────────────────────┘                               │
│                       │                                          │
│           ┌───────────┴───────────┐                              │
│           ▼                       ▼                              │
│   ┌───────────────┐      ┌───────────────┐                      │
│   │  Preference   │      │  Combined     │                      │
│   │  Profile      │      │  Activity     │                      │
│   │  (weighted)   │      │  Feed         │                      │
│   └───────────────┘      └───────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Approach

### Phase 1: Backend Data Unification

**Goal**: Modify `getUserDashboardData()` to include solo tasting stats and preference data.

#### 1.1 Update Dashboard Data Method

**File**: `server/storage.ts:4735-4940`

```typescript
// Add to getUserDashboardData response
interface UnifiedDashboardData {
  // Existing fields...
  unifiedTastingStats: {
    total: number;
    solo: number;
    group: number;
  };
  preferences: {
    sweetness: number | null;
    acidity: number | null;
    tannins: number | null;
    body: number | null;
  };
  soloRecentActivity: SoloTasting[];
}
```

**Changes Required**:
1. Fetch solo tastings for the email: `storage.ts:4750`
2. Calculate combined stats: `storage.ts:4800`
3. Calculate preference averages from ALL tastings: `storage.ts:4850`
4. Merge recent activity from both sources: `storage.ts:4900`

#### 1.2 Add Preference Calculation Endpoint

**File**: `server/routes/dashboard.ts`

Add endpoint that calculates preferences from both solo and group data:

```typescript
// GET /api/dashboard/:email/preferences
// Returns preference averages from ALL tastings (solo + group responses)
```

#### 1.3 Update Wine Scores with Source

**File**: `server/storage.ts:4943-5176`

Ensure `getUserWineScores()` always populates `source` field:
- `'solo'` for tastings table wines
- `'group'` for packageWines via responses

### Phase 2: Frontend Unification

**Goal**: Enhance UserDashboard to show unified data with preference bars.

#### 2.1 Add Preference Bars to UserDashboard

**File**: `client/src/pages/UserDashboard.tsx`

Copy preference visualization from SoloProfile:
- Sweetness bar: `SoloProfile.tsx:204-224`
- Acidity bar
- Tannins bar
- Body bar

```tsx
// Add to UserDashboard after stats section
{dashboardData?.preferences && (
  <motion.div className="bg-gradient-to-br from-white/10 to-white/5 ...">
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp className="w-5 h-5 text-green-400" />
      <h2 className="text-lg font-semibold text-white">Taste Profile</h2>
    </div>
    <PreferenceBars preferences={dashboardData.preferences} />
  </motion.div>
)}
```

#### 2.2 Add Source Badges to Activity Feed

**File**: `client/src/pages/UserDashboard.tsx`

Add visual source indicators to tasting history items:

```tsx
// Source badge component
const SourceBadge = ({ source }: { source: 'solo' | 'group' }) => (
  <Badge
    variant="outline"
    className={source === 'solo'
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-blue-500/20 text-blue-300 border-blue-500/30"
    }
  >
    {source === 'solo' ? <User className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
    {source === 'solo' ? 'Solo' : 'Group'}
  </Badge>
);
```

#### 2.3 Implement SoloProfile Redirect

**File**: `client/src/pages/SoloProfile.tsx`

Replace entire component with redirect:

```tsx
export default function SoloProfile() {
  const [, setLocation] = useLocation();

  const { data: authData, isLoading } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', null);
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false
  });

  useEffect(() => {
    if (!isLoading && authData?.user?.email) {
      setLocation(`/dashboard/${encodeURIComponent(authData.user.email)}`);
    } else if (!isLoading && !authData?.user) {
      setLocation('/solo/login');
    }
  }, [isLoading, authData, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );
}
```

### Phase 3: Navigation Updates

#### 3.1 Update BottomNav Profile Link

**File**: `client/src/components/solo/BottomNav.tsx`

Change profile navigation to go to unified dashboard:

```tsx
// Instead of /solo/profile
onClick={() => {
  // Get email from auth context and redirect to dashboard
  if (userEmail) {
    setLocation(`/dashboard/${encodeURIComponent(userEmail)}`);
  }
}}
```

#### 3.2 Simplify UserDashboard Data Fetching

**File**: `client/src/pages/UserDashboard.tsx`

No auth check needed—dashboard shows all data for the email in URL:

```tsx
// Fetch unified data using email from URL params
const { email } = useParams();
const { data: dashboardData } = useQuery({
  queryKey: ['/api/dashboard', email],
  queryFn: () => fetchDashboardData(email),
});
// Shows both solo + group data for this email
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Unified dashboard shows combined tasting count (solo + group)
- [ ] Preference bars (sweetness/acidity/tannins/body) displayed on dashboard
- [ ] Activity feed shows source badges (Solo/Group) for each tasting
- [ ] Wine collection shows source for each wine
- [ ] `/solo/profile` redirects to unified dashboard
- [ ] Users can still access solo journal for recording new tastings
- [ ] Recommendations based on combined preference data

### Non-Functional Requirements

- [ ] Dashboard loads within 2 seconds on 3G
- [ ] Mobile-responsive design maintained
- [ ] Existing group-only users not broken
- [ ] No authentication required to view dashboard

### Quality Gates

- [ ] TypeScript types updated for unified data shapes
- [ ] All existing dashboard tests pass
- [ ] New tests for combined data scenarios
- [ ] Manual test: User with only solo data
- [ ] Manual test: User with only group data
- [ ] Manual test: User with both

---

## Dependencies & Prerequisites

### Backend Dependencies
- `drizzle-orm` aggregation functions for combining queries
- Existing `getUserDashboardData()` method as base

### Frontend Dependencies
- TanStack Query for data fetching (already in use)
- Framer Motion for animations (already in use)
- No new dependencies required

### Data Prerequisites
- Valid email in URL (used to look up both solo and group data)
- No authentication required

---

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance regression | Medium | Low | Use existing optimized queries, add caching |
| Breaking existing group users | High | Low | Feature flag or gradual rollout |
| Redirect loops | Medium | Medium | Careful useEffect dependencies |
| Data not found for email | Low | Medium | Show graceful empty state |

---

## Files to Modify

### Backend

| File | Changes |
|------|---------|
| `server/storage.ts` | Add solo data to `getUserDashboardData()`, ensure source on wine scores |
| `server/routes/dashboard.ts` | Add `/api/dashboard/:email/preferences` endpoint |

### Frontend

| File | Changes |
|------|---------|
| `client/src/pages/UserDashboard.tsx` | Add preference bars, source badges, auth check |
| `client/src/pages/SoloProfile.tsx` | Replace with redirect component |
| `client/src/components/solo/BottomNav.tsx` | Update profile link |
| `client/src/App.tsx` | Route changes if needed |

### New Components

| Component | Purpose |
|-----------|---------|
| `PreferenceBars.tsx` | Reusable preference visualization |
| `SourceBadge.tsx` | Solo/Group indicator badge |

---

## Implementation Phases

### Phase 1: Backend (Foundation)
- Modify `getUserDashboardData()` to include solo stats
- Add preference calculation endpoint
- Ensure source field populated on all wines
- **Estimated complexity**: Medium

### Phase 2: Frontend (Core)
- Add preference bars to UserDashboard
- Add source badges to activity feed
- Add auth check for solo data visibility
- **Estimated complexity**: Medium

### Phase 3: Navigation (Polish)
- Implement SoloProfile redirect
- Update BottomNav
- Handle edge cases (no auth, email mismatch)
- **Estimated complexity**: Low

### Phase 4: Testing & Polish
- Test all user flow permutations
- Empty states for partial data
- Error handling and recovery
- **Estimated complexity**: Low

---

## Design Decisions (Confirmed)

1. **Access Model**: Email-only access, no authentication required
   - **Decision**: Anyone can view any dashboard with just the email URL
   - Security hardening deferred to later sprint

2. **Duplicate Wines**: Show as separate entries, both contribute to taste profile
   - **Decision**: Same wine tasted in solo and group contexts = two separate entries in activity feed
   - Both data points contribute to preference calculations (weighted equally)
   - Dates shown separately for each tasting context

---

## References

### Internal Code References
- `server/storage.ts:4735-4940` - `getUserDashboardData()` method
- `server/storage.ts:4708-4733` - `getUnifiedTastingStats()` already exists
- `client/src/pages/SoloProfile.tsx:204-224` - Preference bars implementation
- `client/src/pages/UserDashboard.tsx:629-635` - Existing menu navigation

### Research References
- TanStack Query `useQueries` with `combine` for multiple data sources
- Vivino/Untappd UX patterns for wine app dashboards
- shadcn/ui Card, Tabs, Badge components
- Motion for React stagger animations
