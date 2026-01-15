# Comprehensive Drag and Drop Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Libraries Used](#libraries-used)
4. [Core Components](#core-components)
5. [Implementation Details](#implementation-details)
6. [API Endpoints](#api-endpoints)
7. [State Management](#state-management)
8. [Visual Feedback System](#visual-feedback-system)
9. [Performance Optimizations](#performance-optimizations)
10. [Error Handling](#error-handling)

## Overview

The drag and drop functionality in this wine tasting application allows sommeliers to organize and reorder slides within their wine packages. The system is implemented across multiple components and uses two different drag and drop libraries for different purposes.

### Key Features:
- **Slide Reordering**: Drag slides up/down within sections
- **Wine Reordering**: Drag wines to change their presentation order
- **Visual Feedback**: Real-time UI updates during drag operations
- **Boundary Protection**: Prevents invalid moves (e.g., moving welcome slides)
- **Optimistic Updates**: Instant UI feedback with background saving
- **Fractional Indexing**: Prevents position conflicts during concurrent edits

## Architecture

### High-Level Flow
1. User initiates drag operation → 
2. Framer Motion handles drag gesture → 
3. Component calculates new position → 
4. Optimistic UI update applied → 
5. API call to persist change → 
6. Success/failure handling with rollback if needed

### Component Hierarchy
```
PackageEditor.tsx
  └── DraggableSlideList.tsx (per wine section)
        └── DraggableSlideItem.tsx (individual slides)
              └── Framer Motion Reorder components

SessionWineSelector.tsx
  └── Framer Motion Reorder.Group
        └── Reorder.Item (individual wines)
```

## Libraries Used

### 1. Framer Motion (Primary)
- **Version**: ^11.18.2
- **Used In**: DraggableSlideList, SessionWineSelector
- **Purpose**: Main drag and drop implementation
- **API**: `Reorder` component with `Reorder.Group` and `Reorder.Item`

```json
"framer-motion": "^11.18.2"
```

### 2. @dnd-kit (Secondary/Partial)
- **Version**: 
  - @dnd-kit/core: ^6.3.1
  - @dnd-kit/sortable: ^10.0.0
- **Used In**: SlideListPanel (partially implemented)
- **Purpose**: Alternative DnD approach (not actively used in production)

```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0"
```

## Core Components

### 1. DraggableSlideList.tsx

**Location**: `/client/src/components/editor/DraggableSlideList.tsx`

**Purpose**: Main drag and drop implementation for slides

**Key Features**:
- Uses Framer Motion's `Reorder` components
- Handles both drag gestures and button controls (up/down arrows)
- Visual feedback for drag states
- Protection against invalid moves

**Props Interface**:
```typescript
interface DraggableSlideListProps {
  slides: Slide[];
  activeSlideId: string | null;
  pendingReorders: Map<string, any>;
  pendingContentChanges: Set<string>;
  activelyMovingSlide: string | null;
  isProcessingQueue?: boolean;
  buttonStates?: Map<string, ButtonState>;
  onSlideClick: (slideId: string) => void;
  onSlideReorder: (newOrder: Slide[]) => void;
  onSlideDelete: (slideId: string) => void;
  onSlideMove: (slideId: string, direction: 'up' | 'down') => void;
}
```

**Key Implementation Details**:

1. **Drag Controls**:
```typescript
const controls = useDragControls();
// Drag is initiated via:
onPointerDown={(e) => !isDisabled && controls.start(e)}
```

2. **Visual States During Drag**:
```typescript
whileDrag={{ 
  scale: 1.02,
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
  backgroundColor: "rgba(139, 92, 246, 0.1)"
}}
```

3. **Movement Validation**:
- Welcome slides cannot be moved from position 1
- Slides cannot cross section boundaries
- Visual feedback for blocked moves

### 2. PackageEditor.tsx

**Location**: `/client/src/pages/PackageEditor.tsx`

**Purpose**: Container component managing slide organization

**Key Drag & Drop Functions**:

1. **handleSlideReorder** (Button-based movement):
```typescript
const handleSlideReorder = (slideId: string, direction: 'up' | 'down') => {
  // Validates movement
  // Calculates new fractional position
  // Updates local state optimistically
  // Makes API call to persist
}
```

2. **handleDragReorder** (Drag-based movement):
```typescript
const handleDragReorder = (reorderedSlides: Slide[], wineId: string) => {
  // Finds which slide moved
  // Calculates fractional position between neighbors
  // Updates state and persists
}
```

**Fractional Indexing Strategy**:
- Base position: 100000
- Gap size: 1000
- New positions calculated as average between neighbors
- Prevents position conflicts

### 3. SessionWineSelector.tsx

**Location**: `/client/src/components/SessionWineSelector.tsx`

**Purpose**: Allows hosts to reorder wines for sessions

**Implementation**:
```typescript
<Reorder.Group 
  axis="y" 
  values={wineSelections} 
  onReorder={handleReorder}
  className="space-y-3"
>
  {wineSelections.map((item, index) => (
    <Reorder.Item key={item.wine.id} value={item}>
      {/* Wine card content */}
    </Reorder.Item>
  ))}
</Reorder.Group>
```

## Implementation Details

### State Management

The drag and drop system uses multiple state variables for tracking:

1. **Local Slides State**: 
```typescript
const [localSlides, setLocalSlides] = useState<Slide[]>([]);
```
- Holds optimistic updates
- Allows instant UI feedback

2. **Pending Changes Tracking**:
```typescript
const [pendingContentChanges, setPendingContentChanges] = useState<Set<string>>(new Set());
const [activelyMovingSlide, setActivelyMovingSlide] = useState<string | null>(null);
```

3. **Button States for Visual Feedback**:
```typescript
const [buttonStates, setButtonStates] = useState<Map<string, 'idle' | 'blocked' | 'processing'>>(new Map());
```

### Position Calculation

**Fractional Indexing Algorithm**:
```typescript
// Moving up
if (direction === 'up' && targetIndex >= 0) {
  const targetSlide = allWineSlides[targetIndex];
  const prevOfTarget = targetIndex > 0 ? allWineSlides[targetIndex - 1] : null;
  
  if (prevOfTarget) {
    newPosition = (prevOfTarget.position + targetSlide.position) / 2;
  } else {
    newPosition = targetSlide.position / 2;
  }
}

// Moving down
else if (direction === 'down' && targetIndex < allWineSlides.length) {
  const targetSlide = allWineSlides[targetIndex];
  const nextOfTarget = targetIndex < allWineSlides.length - 1 ? allWineSlides[targetIndex + 1] : null;
  
  if (nextOfTarget) {
    newPosition = (targetSlide.position + nextOfTarget.position) / 2;
  } else {
    newPosition = targetSlide.position + 10000;
  }
}
```

### Movement Restrictions

1. **Welcome Slides**:
```typescript
const isWelcomeSlide = slide.type === 'interlude' && 
  slide.section_type === 'intro' &&
  ((slide.payloadJson as any)?.is_welcome || 
   (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome'));

if (isWelcomeSlide && direction === 'down' && slide.position === 1) {
  // Block movement
}
```

2. **Section Boundaries**:
```typescript
const sectionSlides = localSlides
  .filter(s => s.packageWineId === slide.packageWineId && s.section_type === slide.section_type)
  .sort((a, b) => a.position - b.position);

const isFirstInSection = sectionIndex === 0;
const isLastInSection = sectionIndex === sectionSlides.length - 1;
```

## API Endpoints

### 1. Update Single Slide Position
**Endpoint**: `PUT /api/slides/:slideId/position`

**Request Body**:
```json
{
  "newPosition": 105000
}
```

**Implementation**:
```typescript
app.put("/api/slides/:slideId/position", async (req, res) => {
  const { slideId } = req.params;
  const { newPosition } = req.body;
  
  // Validation
  if (typeof newPosition !== 'number' || newPosition < 0) {
    return res.status(400).json({ message: "Position must be a positive number" });
  }
  
  await storage.updateSlidePosition(slideId, newPosition);
  res.json({ message: "Slide position updated successfully", slideId, newPosition });
});
```

### 2. Smart Swap (Alternative)
**Endpoint**: `POST /api/slides/smart-swap`

**Request Body**:
```json
{
  "slideId1": "slide-123",
  "slideId2": "slide-456"
}
```

### 3. Position Recovery
**Endpoint**: `POST /api/slides/recover-positions`

**Purpose**: Fix slides stuck at temporary positions

## Visual Feedback System

### 1. Drag Visual States
```css
/* Normal state */
border-transparent hover:bg-white/8

/* Active/Selected */
bg-gradient-to-r from-purple-600/40 to-purple-700/30

/* Pending changes */
border-amber-500/50 bg-amber-500/10 animate-pulse

/* While dragging */
scale: 1.02
boxShadow: enhanced
backgroundColor: purple tint
```

### 2. Button State Indicators
- **Processing**: Spinner animation
- **Blocked**: X icon with amber coloring
- **Success**: Brief scale animation

### 3. Toast Notifications
```typescript
toast({
  title: "Slide moved",
  description: "Position updated successfully",
  duration: 2000,
});
```

## Performance Optimizations

### 1. Debounced Click Handler
```typescript
const handleMoveWithDebounce = useCallback((slideId: string, direction: 'up' | 'down') => {
  const key = `${slideId}-${direction}`;
  const now = Date.now();
  const lastClick = clickTimestamps.current.get(key) || 0;
  
  if (now - lastClick < 500) {
    console.log(`🚫 Debounced click blocked: ${key}`);
    return;
  }
  
  clickTimestamps.current.set(key, now);
  onSlideMove(slideId, direction);
}, [onSlideMove]);
```

### 2. Optimistic Updates
- Local state updated immediately
- API call happens in background
- Rollback on failure

### 3. Minimal Re-renders
- Uses React.memo implicitly via Framer Motion
- Careful prop passing to avoid unnecessary updates

## Error Handling

### 1. API Error Responses
```typescript
onError: (error: any) => {
  let errorMessage = "Please try again";
  let errorTitle = "Error updating slide order";
  
  if (error?.response?.data) {
    const errorData = error.response.data;
    if (errorData.error === "DUPLICATE_POSITION") {
      errorTitle = "Position Conflict";
      errorMessage = "Multiple slides cannot have the same position.";
    }
    // ... other error cases
  }
  
  toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
  
  // Rollback optimistic update
  setLocalSlides(originalSlidesRef.current);
}
```

### 2. Validation Errors
- Position must be positive number
- Slide IDs must exist
- Wine IDs must match

### 3. Recovery Mechanisms
- Force refresh function
- Position recovery endpoint
- Automatic migration from legacy positions

## Best Practices

1. **Always validate movements** before applying
2. **Use fractional indexing** to avoid conflicts
3. **Provide visual feedback** for all states
4. **Implement optimistic updates** for better UX
5. **Handle errors gracefully** with rollback
6. **Debounce rapid actions** to prevent race conditions
7. **Test edge cases** (first/last items, section boundaries)

## Migration Notes

The system automatically migrates from legacy integer positions to the gap-based system:
```typescript
const needsPositionMigration = sortedSlides.some(s => s.position < 100000);
if (needsPositionMigration) {
  // Assigns new gap-based positions starting at 100000
}
```

## Future Enhancements

1. **Cross-wine drag and drop** (currently restricted to within-wine)
2. **Bulk operations** (select multiple slides)
3. **Undo/redo functionality**
4. **Keyboard shortcuts** for power users
5. **Touch gesture optimization** for mobile