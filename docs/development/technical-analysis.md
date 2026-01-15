# Technical Analysis & Fix Implementation Plan

## Issue Analysis

### 1. Wine Image Missing from First Slide

**Root Cause**: The slide template for the introductory interlude doesn't include wine image URL in payload
**Location**: `server/storage.ts` line ~167
**Current Code**:
```typescript
{
  position: 1,
  type: "interlude",
  section_type: "intro",
  payloadJson: {
    title: "Welcome to Your Wine Tasting",
    description: "Let's begin our journey through this exceptional wine",
    // Missing: wine_image field
  },
}
```

**Fix**: Add wine context to slide payload during creation

### 2. Slider UI Positioning Bug

**Root Cause**: CSS transform or positioning calculation mismatch between visual bar and interactive dot
**Likely Location**: Slider component in `client/src/components/` or shadcn UI slider implementation
**Symptoms**: 
- Click works correctly
- Drag shows incorrect dot position
- Visual bar position is correct

**Investigation Needed**: 
- Find slider component implementation
- Check CSS transforms and positioning
- Verify touch/mouse event handling

### 3. Wine Transition Missing

**Root Cause**: No transition slides or wine context switching in tasting flow
**Location**: `client/src/pages/TastingSession.tsx`
**Current State**: Slides flow sequentially without wine context awareness
**Required**: 
- Wine transition detection
- Wine information display
- Progress tracking per wine

### 4. Host Wine Selection Missing

**Root Cause**: No UI for hosts to select subset of wines from package
**Location**: `client/src/pages/HostDashboard.tsx` or host creation flow
**Required**:
- Wine list display from package
- Selection interface
- Session creation with wine subset

### 5. Sommelier Dashboard Incomplete

**Root Cause**: Basic dashboard without package/wine management capabilities
**Location**: `client/src/pages/SommelierDashboard.tsx`
**Required Features**:
- Package CRUD operations
- Wine management within packages
- Question editing interface
- Drag-and-drop functionality

## Implementation Strategy

### Phase 1: Critical Fixes (2-3 hours)

1. **Wine Image Fix** (30 min)
   - Update slide template generation
   - Add wine context to interlude slides
   - Test with existing data

2. **Slider Bug Fix** (1 hour)
   - Locate slider component
   - Debug positioning calculations
   - Fix CSS/JS alignment

3. **Wine Transitions** (1.5 hours)
   - Add wine detection logic
   - Create transition components
   - Update tasting session flow

### Phase 2: Feature Enhancements (4-5 hours)

4. **Host Wine Selection** (2 hours)
   - Design selection interface
   - Update session creation API
   - Implement wine filtering

5. **Sommelier Dashboard Base** (2-3 hours)
   - Package management interface
   - Wine CRUD operations
   - Basic question editing

## File Modification Plan

### Backend Changes
- `server/storage.ts`: Update slide template generation
- `server/routes.ts`: Add wine selection endpoints

### Frontend Changes
- `client/src/pages/TastingSession.tsx`: Wine transitions
- `client/src/pages/HostDashboard.tsx`: Wine selection UI
- `client/src/pages/SommelierDashboard.tsx`: Package management
- Slider component: Fix positioning bug

### New Components Needed
- WineTransition component
- WineSelector component
- PackageManager component
- QuestionEditor component

## Testing Strategy

1. **Immediate Testing**
   - Test wine image display
   - Verify slider behavior across browsers
   - Test wine transition flow

2. **Integration Testing**
   - Multi-wine session flow
   - Host wine selection workflow
   - Sommelier package creation

3. **User Experience Testing**
   - Mobile responsiveness
   - Touch interactions
   - Performance with multiple participants