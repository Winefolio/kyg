# Fix: Navigation Missing After Login - Users Can't Access Solo/Group Tastings

## Overview

**Bug Report**: After logging in from the landing page, users are taken to a dashboard view that has NO navigation to Solo or Group tasting options. Users are stuck with no way to start any tastings.

**Root Cause**: The `/login` page redirects to `/dashboard/:email` (the old UserDashboard), which lacks the bottom tab navigation present in the new `/home` (HomeV2) unified experience.

## Problem Statement

The app has two dashboard experiences:
1. **Old**: `/dashboard/:email` → `UserDashboard.tsx` - Full-featured dashboard but NO bottom navigation
2. **New**: `/home` → `HomeV2.tsx` - Three-pillar design with Solo, Group, Dashboard tabs via `BottomNav`

When users click "Sign In" on the Landing page:
- They go to `/login`
- After successful login, they're redirected to `/dashboard/:email` (line 50 of Login.tsx)
- This page shows stats, taste profile, wine profiles - but NO way to navigate to Solo or Group tastings
- **Users are stuck**

## Proposed Solution

Redirect authenticated users to `/home` instead of `/dashboard/:email`. The new HomeV2 with bottom tabs provides access to all features:

- **Solo tab**: Solo tastings + Learning Journeys
- **Group tab**: Join/Host group sessions
- **Dashboard tab**: Stats, preferences, wine collection (same content as old dashboard)

### Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/Login.tsx:50` | Change redirect from `/dashboard/:email` to `/home` |
| `client/src/pages/Login.tsx:75` | Change redirect from `/journeys` to `/home` |

## Technical Approach

### Change 1: Update Login redirect destination

**File**: `client/src/pages/Login.tsx`

**Before** (line 50):
```typescript
const destination = redirectTo || `/dashboard/${encodeURIComponent(email.trim())}`;
```

**After**:
```typescript
const destination = redirectTo || '/home';
```

### Change 2: Update new user redirect

**Before** (line 75):
```typescript
setLocation('/journeys');
```

**After**:
```typescript
setLocation('/home');
```

## Acceptance Criteria

- [ ] Users who click "Sign In" from Landing and log in are taken to `/home`
- [ ] Bottom navigation tabs (Solo, Group, Dashboard) are visible after login
- [ ] Users can navigate to Solo tab and start a tasting
- [ ] Users can navigate to Group tab and join/host a session
- [ ] Users can navigate to Dashboard tab to see their stats
- [ ] Deep links via `?redirect=` query param still work (e.g., `/login?redirect=/journeys/5`)

## Testing Plan

1. Start from Landing page (`/`)
2. Click "Sign In" → goes to `/login`
3. Enter email and submit
4. Verify redirect to `/home` (not `/dashboard/:email`)
5. Verify bottom tabs are visible: Solo, Group, Dashboard
6. Click each tab and verify navigation works
7. Test deep link: `/login?redirect=/journeys/5` → should go to journey after login

## References

- **Problem location**: `client/src/pages/Login.tsx:50` - redirect destination
- **Old dashboard (no nav)**: `client/src/pages/UserDashboard.tsx`
- **New unified home**: `client/src/pages/HomeV2.tsx`
- **Bottom navigation**: `client/src/components/home/BottomNav.tsx:15-19` (tab config)
- **App routing**: `client/src/App.tsx:75` (`/dashboard/:email` → `UserDashboard`)
