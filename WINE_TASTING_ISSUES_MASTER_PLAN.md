# Wine Tasting Application Issues - Master Investigation & Fix Plan

## Executive Summary
After thoroughly investigating the 9 reported issues, I've identified root causes ranging from simple state management bugs to missing UI components and performance bottlenecks. This document provides detailed analysis and actionable fixes for each issue.

## Issue Analysis & Solutions

### 1. Edit Wine Dropdown Not Working (HIGH PRIORITY)
**Location**: `client/src/pages/SommelierDashboard.tsx:668-669`

**Root Cause**: The Wine Modal requires `selectedPackage` to be set (line 1094), but when clicking edit from the dropdown, only `selectedWine` is set, not `selectedPackage`.

**Fix**:
```tsx
// Line 668-669, modify openWineModal call to:
onClick={() => {
  setSelectedPackage(pkg); // Add this line
  openWineModal("edit", wine);
}}
```

### 2. Description Slide Typing Lag (HIGH PRIORITY)
**Location**: `client/src/components/editor/SlideConfigPanel.tsx:73-75`

**Root Cause**: Every keystroke triggers `handleFieldChange` → `handlePayloadChange` → `onUpdate` → `updateSlideMutation` API call. No debouncing or local state management.

**Fix - Implement Debounced Updates**:
1. Add local state for form fields
2. Debounce the actual API updates
3. Show saving indicator

```tsx
// In SlideConfigPanel.tsx
const [localPayload, setLocalPayload] = useState(payload);
const debouncedUpdate = useMemo(
  () => debounce((updates) => onUpdate(slide.id, updates), 500),
  [slide.id, onUpdate]
);

// Update textarea to use local state
<Textarea
  value={localPayload.description || ""}
  onChange={(e) => {
    const newPayload = { ...localPayload, description: e.target.value };
    setLocalPayload(newPayload);
    debouncedUpdate({ payloadJson: newPayload });
  }}
/>
```

### 3. Image Support Clarity (MEDIUM PRIORITY)

**Findings**:
- Package has `imageUrl` field in schema but it's never displayed
- Wine images (`wineImageUrl`) are shown in WineTransition component
- No UI to upload package images in PackageModal

**Fix**:
1. Add ImageUpload component to PackageModal for package image
2. Display package image on Gateway/SessionJoin pages
3. Add clear labels in WineModal: "Wine Bottle Image" with helper text
4. Show wine images in intro slides (first slide of each wine)

### 4. Package Editor UX Issues (HIGH PRIORITY)

**Problems Identified**:
- No clear indication of which slide is being edited
- Slide number/position not visible
- Active slide title truncated in sidebar
- No breadcrumb navigation

**Fix - Enhanced Visual Feedback**:
```tsx
// In PackageEditor.tsx main content area
<div className="mb-6">
  <div className="flex items-center space-x-2 text-white/60 text-sm mb-2">
    <span>{currentWine?.wineName}</span>
    <ChevronRight className="w-4 h-4" />
    <span>{sectionDetails[activeSlide.section_type].title}</span>
    <ChevronRight className="w-4 h-4" />
    <span>Slide {activeSlide.position}</span>
  </div>
  <h2 className="text-2xl font-bold text-white">
    {activeSlide.payloadJson?.title || 'Untitled Slide'}
  </h2>
</div>
```

### 5. Missing Text Input Component (HIGH PRIORITY)

**Root Cause**: No TextQuestion component exists. Text questions fall through to default rendering in TastingSession.tsx

**Fix - Create TextQuestion Component**:
```tsx
// New file: client/src/components/questions/TextQuestion.tsx
export function TextQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">{question.title}</h3>
      {question.description && (
        <p className="text-white/70">{question.description}</p>
      )}
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder || 'Type your answer here...'}
        className="min-h-[120px]"
        maxLength={question.maxLength || 500}
      />
      {question.maxLength && (
        <p className="text-xs text-white/50 text-right">
          {(value || '').length}/{question.maxLength}
        </p>
      )}
    </div>
  );
}
```

### 6. Slide Reordering UI (MEDIUM PRIORITY)

**Current State**: No drag-and-drop functionality, no visual affordances for reordering

**Fix - Implement Drag & Drop**:
1. Use @dnd-kit (already in package.json)
2. Add drag handles to slides in sidebar
3. Visual feedback during drag
4. Update positions on drop
5. Batch API update for all affected slides

**Implementation Overview**:
```tsx
// Wrap slides in DndContext and SortableContext
// Add drag handle icon (GripVertical)
// Implement onDragEnd handler
// Create PUT /api/slides/reorder endpoint
```

### 7. Boolean Question Support (HIGH PRIORITY)

**Root Cause**: Yes/No questions configured but no rendering component

**Fix - Simple Boolean Component**:
```tsx
// Add case in TastingSession.tsx renderSlideContent
case 'boolean':
  return (
    <div className="space-y-4">
      <h3>{question.title}</h3>
      <div className="flex gap-4">
        <Button
          variant={value === true ? "default" : "outline"}
          onClick={() => onChange(true)}
          className="flex-1"
        >
          Yes
        </Button>
        <Button
          variant={value === false ? "default" : "outline"}
          onClick={() => onChange(false)}
          className="flex-1"
        >
          No
        </Button>
      </div>
    </div>
  );
```

### 8. Welcome Slide Organization (MEDIUM PRIORITY)

**Issues**:
- No dedicated welcome slide template
- Welcome content gets lost when editing other slides
- No clear package-level intro

**Fix - Package Welcome System**:
1. Add "Package Welcome" template to SLIDE_TEMPLATES
2. Auto-create welcome slide when creating first wine
3. Pin welcome slides to top of wine
4. Special styling/icon for welcome slides

### 9. Performance & Architecture Issues

**Additional Findings**:
- No loading states during mutations
- No optimistic updates
- Missing error boundaries
- Inefficient re-renders in PackageEditor

**Recommended Improvements**:
1. Implement React.memo for slide components
2. Add loading overlays during saves
3. Optimistic updates for better UX
4. Error boundaries for graceful failures

## Implementation Priority

### Phase 1 - Critical Fixes (1-2 days)
1. Fix wine edit dropdown (Issue #1) - 30 mins
2. Add debouncing to editor (Issue #2) - 2 hours
3. Create TextQuestion component (Issue #5) - 1 hour
4. Create BooleanQuestion component (Issue #7) - 30 mins

### Phase 2 - UX Improvements (2-3 days)
1. Enhanced editor clarity (Issue #4) - 3 hours
2. Image support improvements (Issue #3) - 2 hours
3. Welcome slide system (Issue #8) - 3 hours

### Phase 3 - Advanced Features (3-4 days)
1. Drag-and-drop reordering (Issue #6) - 1 day
2. Performance optimizations - 1 day
3. Additional polish and testing - 1 day

## Testing Checklist
- [ ] Wine edit works from all locations
- [ ] No lag when typing in descriptions
- [ ] Images display correctly
- [ ] Clear indication of active slide
- [ ] Text questions accept input
- [ ] Boolean questions work
- [ ] Slides can be reordered
- [ ] Welcome slides persist
- [ ] Performance is smooth

## Long-term Recommendations
1. Implement autosave with conflict resolution
2. Add undo/redo functionality
3. Keyboard shortcuts for power users
4. Bulk operations (duplicate, delete multiple)
5. Version history for packages
6. Collaborative editing support