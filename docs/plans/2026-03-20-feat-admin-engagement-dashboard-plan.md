---
title: Admin Engagement Dashboard
type: feat
date: 2026-03-20
---

# Admin Engagement Dashboard

## Overview

A simple admin page at `/admin` inside the existing KYG app that gives a quick read on whether people are actually using the product. Queries the existing PostgreSQL database directly via Drizzle — no Supabase UI needed.

Hidden URL, no auth required (consistent with existing `/admin/journeys` pattern).

## Problem Statement

Supabase's dashboard is clunky for quick engagement checks. We need a single page that answers: "Are people using this thing?" — signups, tastings, journey progress, at a glance.

## Proposed Solution

One new API route (`/api/admin/engagement`) that runs aggregate queries against existing tables. One new React page (`/admin`) that displays the results in a clean card-based layout using existing shadcn/ui components.

### What It Shows

**Summary Cards (top row):**
- Total users
- Users this week / this month
- Total solo tastings completed
- Tastings this week / this month
- Onboarding completion rate (%)

**User Activity Table:**
- Recent users (last 20): email, created date, tastings count, last tasting date, tasting level, onboarding completed
- Sortable by most recent activity

**Journey Engagement (if journeys exist):**
- Active journeys count
- Users enrolled in journeys
- Chapter completion counts

**Group Sessions (quick counts):**
- Total sessions created
- Total participants
- Sessions this month

## Technical Approach

### Backend: One New Route File

**`server/routes/admin.ts`**

Single route that runs aggregate SQL queries via Drizzle:

```typescript
// GET /api/admin/engagement
// Returns all engagement metrics in one payload
{
  summary: {
    totalUsers: number,
    usersThisWeek: number,
    usersThisMonth: number,
    totalTastings: number,
    tastingsThisWeek: number,
    tastingsThisMonth: number,
    onboardingCompletionRate: number,
  },
  recentUsers: Array<{
    email: string,
    createdAt: string,
    tastingsCompleted: number,
    lastTastingDate: string | null,
    tastingLevel: string,
    onboardingCompleted: boolean,
  }>,
  journeys: {
    activeJourneys: number,
    usersEnrolled: number,
    chapterCompletions: number,
  },
  sessions: {
    totalSessions: number,
    totalParticipants: number,
    sessionsThisMonth: number,
  }
}
```

Tables queried:
- `users` — signups, onboarding, tasting level
- `tastings` — solo tasting activity
- `userJourneys` — journey enrollment
- `chapterCompletions` — journey progress
- `sessions` — group sessions
- `participants` — group participation

Register in `server/routes.ts` alongside existing route registrations.

### Frontend: One New Page

**`client/src/pages/AdminDashboard.tsx`**

- Uses TanStack Query to fetch `/api/admin/engagement`
- Card layout with shadcn/ui `Card` components
- Simple table for recent users using existing table patterns
- No charts in MVP — just numbers and a table
- Loading/error states via TanStack Query

**`client/src/App.tsx`** — add route:
```typescript
<Route path="/admin" component={AdminDashboard} />
```

## Acceptance Criteria

- [x] `/api/admin/engagement` returns all metrics in one request
- [x] `/admin` page renders summary cards with key counts
- [x] Recent users table shows last 20 users with activity info
- [x] Journey and session counts display correctly
- [x] Page loads fast (single query, no N+1)
- [x] No auth gate — hidden URL only

## Files to Create/Modify

| File | Action |
|------|--------|
| `server/routes/admin.ts` | **Create** — engagement metrics endpoint |
| `server/routes.ts` | **Modify** — register admin routes |
| `client/src/pages/AdminDashboard.tsx` | **Create** — dashboard page |
| `client/src/App.tsx` | **Modify** — add `/admin` route |

## MVP

Keep it minimal:
- No charts or graphs (just numbers)
- No date range pickers (hardcoded "this week" / "this month")
- No export functionality
- No real-time updates (refresh to see new data)
- Single API call, single page

## Future Considerations (Not Now)

- Time-series charts with recharts
- Date range filtering
- CSV export
- Retention cohort analysis
- Session recording integration
