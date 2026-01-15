# Package Intro Fix Plan

## Current Issues
1. Package intro slide is stored with the first wine, making it appear as if a wine exists
2. In PackageEditor sidebar, package intro appears as a wine that can have slides added to it
3. SommelierDashboard shows "1 wine" when only package intro exists

## Root Cause
The package intro slide is being attached to the first wine's ID (`packageWineId`), which makes the system treat it as part of that wine.

## Solutions Implemented

### 1. PackageEditor Sidebar Display
✅ Added separate "Package Introduction" section at the top of sidebar
✅ Filtered out wines that only contain the package intro slide
✅ Excluded package intro slides from wine slide counts

### 2. Visual Separation
✅ Package intro now shows in a distinct purple card with Package icon
✅ Wine sections only show actual wine content slides

## Remaining Issues

### Wine Count Display
The SommelierDashboard still shows "1 wine" when a package only has the intro slide because:
- The intro is attached to a wine record in the database
- The wine exists but only contains the package intro

### Potential Solutions

1. **Virtual Wine Approach** (Current)
   - Keep package intro attached to first wine
   - Filter display logic to hide "empty" wines
   - Pros: No database changes needed
   - Cons: Confusing data model

2. **Separate Storage** (Recommended)
   - Create a dedicated `package_intros` table
   - Or use a special `packageWineId` value (e.g., NULL or special UUID)
   - Pros: Clean data model
   - Cons: Requires migration

3. **Special Flag**
   - Add `is_package_intro_holder` flag to wines
   - Filter these wines from counts
   - Pros: Minimal changes
   - Cons: Still somewhat confusing

## Recommendation

For now, the visual fixes in PackageEditor improve the UX significantly. The wine count issue in SommelierDashboard is cosmetic and can be addressed by:
1. Filtering wines that only contain package intro slides from the count
2. Or showing "0 wines" until actual wine content is added