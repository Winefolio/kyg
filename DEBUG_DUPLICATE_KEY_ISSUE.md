# Debugging Duplicate Key Constraint Issue

## The Problem
Still getting "duplicate key value violates unique constraint" when saving slide order, even after fixes.

## Investigation Plan

### 1. Analyze Client-Side Position Calculation

Looking at the client code, positions are assigned as:
- Welcome slides: position 1
- Other slides: 10, 20, 30, 40...

**Potential Issue**: If multiple welcome slides exist (shouldn't happen but might), they'd all get position 1.

### 2. Check What Updates Are Being Sent

The client groups by wine and assigns positions globally:
```javascript
slidesByWine.forEach((wineSlides, wineId) => {
  wineSlides
    .sort((a, b) => {
      // Welcome slides first, then by section, then by position
    })
    .forEach((slide, index) => {
      const isWelcome = // check if welcome
      const newPosition = isWelcome ? 1 : (index + 1) * 10;
    });
});
```

**Issue Found**: If there's a welcome slide, it gets position 1, but the next slide gets position 20 (index 1 + 1 = 2, * 10 = 20), not 10!

### 3. Server-Side Temporary Position Issue

Current logic seems correct with:
- tempOffset = max(maxExistingPosition + 10000, 100000)
- tempPosition = tempOffset + i (guaranteed unique)

But we need to verify this is the actual running code.

### 4. Race Condition Check
If the user clicks save multiple times, requests could overlap.

## Root Cause Hypothesis

The most likely issue is that the position calculation has gaps or duplicates:
1. Welcome slide gets position 1
2. But if there are non-welcome slides that already have position 1, we get a conflict
3. Or the index calculation is wrong, creating duplicate positions

## Fix Strategy

### Option 1: Recalculate ALL Positions
Instead of trying to be clever with partial updates, just:
1. Get ALL slides for the wine
2. Sort them by section and order
3. Assign clean positions: 1, 2, 3, 4...
4. Update ALL slides in the wine

### Option 2: Use Larger Gaps
- Welcome: position 1
- Intro: 1000, 1010, 1020...
- Deep Dive: 2000, 2010, 2020...
- Ending: 3000, 3010, 3020...

### Option 3: Fix Index Calculation
Ensure no duplicates in position assignment on client side.

### Option 4: Database Schema Change
Add section_type to the unique constraint so positions only need to be unique within a section.