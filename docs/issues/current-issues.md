# Current Issues & Fixes

This document tracks all identified issues and their proposed solutions.

## Critical Issues

### 1. Missing Wine Image in First Slide
**Issue**: The wine image is not displaying on the introductory interlude slide
**Location**: `server/storage.ts` - slide template generation
**Impact**: Poor user experience, missing visual context
**Status**: Identified ✅

### 2. Poor Wine Transition Experience
**Issue**: No smooth transition between wines in a tasting session
**Location**: `client/src/pages/TastingSession.tsx`
**Impact**: Jarring user experience when moving between wines
**Status**: Identified ✅

### 3. Slider UI Behavior Bug
**Issue**: Slider dot position doesn't match the visual bar when dragging
**Location**: Slider component implementation
**Impact**: Confusing user interaction, inaccurate input feedback
**Status**: Identified ✅

## Feature Gaps

### 4. Host Wine Selection
**Issue**: Host cannot choose how many wines from package to use in session
**Location**: `client/src/pages/HostDashboard.tsx`
**Impact**: Limited session customization
**Status**: Feature gap ✅

### 5. Incomplete Sommelier Dashboard
**Issue**: Missing comprehensive package/wine management interface
**Requirements**:
- Add packages and wines
- Arrange and edit questions (Kahoot-style)
- Package management interface
**Location**: `client/src/pages/SommelierDashboard.tsx`
**Impact**: No content management system
**Status**: Major feature gap ✅

## Technical Debt

### 6. Backend Schema Issues
**Issue**: Some database queries still referencing old schema
**Location**: `server/storage.ts`, `server/routes.ts`
**Impact**: Potential runtime errors
**Status**: Partially resolved ✅

## Priority Matrix

| Issue | Priority | Complexity | Effort |
|-------|----------|------------|--------|
| Wine Image Fix | High | Low | 1h |
| Wine Transitions | High | Medium | 3h |
| Slider Bug | Medium | Low | 2h |
| Host Wine Selection | High | Medium | 4h |
| Sommelier Dashboard | Critical | High | 8h |
| Schema Cleanup | Medium | Low | 1h |

## Next Steps

1. **Immediate (Today)**
   - Fix wine image display
   - Repair slider behavior
   - Add smooth wine transitions

2. **Short-term (This Week)**
   - Implement host wine selection
   - Begin sommelier dashboard features

3. **Medium-term (Next Week)**
   - Complete comprehensive package management
   - Advanced question editing interface