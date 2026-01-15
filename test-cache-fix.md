# Testing Guide for Data Consistency Fix

## Overview
This guide provides step-by-step instructions to verify that the caching issues have been resolved and all users see consistent slide data.

## Changes Implemented

1. **Server-side Cache Prevention Headers**
   - Added middleware to apply `Cache-Control: no-cache, no-store, must-revalidate` headers to all API responses
   - This prevents browsers and proxies from caching API responses

2. **React Query Configuration**
   - Already configured with `staleTime: 0` and `gcTime: 0` for slides query
   - Query invalidation on session status changes already implemented
   - Aggressive refetch options already in place

3. **Service Worker**
   - Already correctly configured to bypass cache for API calls

## Test Procedure

### Step 1: Start Fresh
1. Clear browser cache in all test browsers (Ctrl/Cmd + Shift + Delete)
2. Open browser DevTools Network tab to monitor requests

### Step 2: Create Test Scenario
1. **Admin User**: 
   - Log into Sommelier Dashboard
   - Select a package with "deep dive" and "ending" sections
   - Note the exact number of slides in each section

### Step 3: Start a Session
1. **Host User**:
   - Start a new session with the package
   - Note the session code

### Step 4: Test Multiple Participants
1. **Participant A** (Different Browser/Incognito):
   - Join the session with the code
   - Navigate through all slides
   - Count slides in each section
   - In DevTools Network tab, verify API responses have:
     - `Cache-Control: no-cache, no-store, must-revalidate, private`
     - `Pragma: no-cache`
     - `Expires: 0`

2. **Participant B** (Another Browser/Device):
   - Join the same session
   - Navigate through all slides
   - Verify same number of slides as Participant A

### Step 5: Modify Package (Live Test)
1. **Admin User**:
   - Go back to Package Editor
   - Add a new slide to "deep dive" section
   - Save changes

2. **All Participants**:
   - Refresh their browsers (F5)
   - Verify the new slide appears for everyone
   - Check DevTools to ensure fresh data is fetched (no 304 responses)

### Step 6: Offline/Online Test
1. **Participant C**:
   - Join session
   - Go offline (airplane mode)
   - Admin makes changes to package
   - Participant goes back online
   - Refresh page
   - Verify they see the updated slides

## Expected Results

✅ All participants see the exact same number of slides
✅ All participants see slides in the same order
✅ "Deep dive" and "ending" sections are visible to all users
✅ Changes to packages are immediately reflected after refresh
✅ No stale data is served from cache
✅ API responses include proper no-cache headers

## Troubleshooting

If issues persist:
1. Check browser DevTools for cached responses (should show "no-cache" in headers)
2. Verify service worker is not caching API calls
3. Check for any CDN or proxy caching between client and server
4. Ensure all test participants are using the latest code

## Verification Commands

Run these commands to verify the deployment:

```bash
# Check if server is running with latest changes
curl -I http://localhost:5000/api/sessions/test | grep -i cache-control
# Should show: Cache-Control: no-cache, no-store, must-revalidate, private

# Test a package slides endpoint
curl -I http://localhost:5000/api/packages/TESTCODE/slides | grep -i cache
# Should show cache prevention headers
```