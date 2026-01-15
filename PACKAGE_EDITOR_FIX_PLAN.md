# Package Editor Critical Issues Fix Plan

## Root Cause Analysis

### Issue 1: Slide Reordering Not Working Visually
**Root Causes:**
1. **State Management Conflict**: The `useEffect` on line 65 overwrites local state changes whenever `editorData` changes
2. **Position Assignment**: Positions are global across all sections in a wine, causing conflicts
3. **No Optimistic UI Updates**: The reorder mutation invalidates the query, triggering a data refetch that overwrites local changes

**Evidence:**
- Line 68: `const sortedSlides = [...(editorData.slides || [])].sort((a, b) => a.position - b.position);`
- This sorts ALL slides by position globally, not within their section context
- When reorderSlidesMutation succeeds, it invalidates the query, causing useEffect to reset the slides

### Issue 2: Multiple Choice Options Not Displayed
**Root Causes:**
1. **Initialization Issue**: When question type changes, the options array isn't initialized
2. **Field Name Mismatch**: The code checks for both `question_type` and `type` fields
3. **No Default Options**: Multiple choice questions start with no options

**Evidence:**
- QuestionConfigForm.tsx line 71: Only renders existing options, doesn't initialize empty array
- Line 29-31 in addOption: Creates new option with unique value, but no initial options exist

### Issue 3: Welcome Slides Disappearing
**Root Causes:**
1. **Position Calculation**: Line 163 calculates position across ALL slides for a wine, not per section
2. **No Special Handling**: Welcome slides aren't given priority position (position 1) in intro section
3. **Template Issues**: Welcome slide template uses generic name, not wine-specific

**Evidence:**
- Line 163: `const nextPosition = (wineSlides.length > 0 ? Math.max(...wineSlides.map(s => s.position)) : 0) + 1;`
- This assigns sequential positions without considering sections

## Comprehensive Fix Plan

### Phase 1: Fix State Management & Reordering

1. **Separate Server State from Local State**
   - Create `localSlides` state for optimistic updates
   - Only sync with server data on mount or explicit refresh
   - Use `localSlides` for rendering

2. **Fix Position Assignment**
   - Positions should be unique within wine + section combination
   - Create helper: `getNextPositionForSection(wineId, sectionType)`
   - Ensure positions start at 1 for each section

3. **Implement Proper Reordering**
   ```typescript
   const handleSlideReorder = (slideId: string, direction: 'up' | 'down') => {
     // Work with localSlides, not slides
     // Update positions within section context
     // Don't invalidate query immediately
     // Show optimistic update with loading state
   }
   ```

### Phase 2: Fix Question Type Support

1. **Initialize Options on Type Change**
   ```typescript
   // In QuestionConfigForm
   useEffect(() => {
     if (questionType === 'multiple_choice' && !payload.options?.length) {
       onPayloadChange({
         ...payload,
         options: [
           { value: 'option1', text: 'Option 1', description: '' },
           { value: 'option2', text: 'Option 2', description: '' }
         ]
       });
     }
   }, [questionType]);
   ```

2. **Add Visual Indicators**
   - Show option count badge
   - Preview how options will appear
   - Validation for minimum 2 options

3. **Support All Question Fields**
   - Ensure all question types have proper form fields
   - Add preview panel showing actual question component

### Phase 3: Fix Welcome Slides

1. **Auto-Create Welcome Slides**
   ```typescript
   const createWineWithWelcomeSlide = async (wineData) => {
     const wine = await createWine(wineData);
     await createSlide({
       packageWineId: wine.id,
       position: 1,
       type: 'interlude',
       section_type: 'intro',
       payloadJson: {
         title: `Welcome to ${wine.wineName}`,
         description: 'Get ready for an amazing tasting experience',
         wine_image_url: wine.wineImageUrl
       }
     });
   };
   ```

2. **Pin Welcome Slides**
   - Always show welcome slides first in intro section
   - Prevent deletion of last welcome slide
   - Special "Welcome" badge in UI

3. **Section-Based Positioning**
   - Maintain separate position counters per section
   - Sort slides by section first, then position

## Implementation Steps

### Step 1: Create Local State Management
```typescript
// Add after line 41
const [localSlides, setLocalSlides] = useState<Slide[]>([]);
const [hasLocalChanges, setHasLocalChanges] = useState(false);

// Modify useEffect to only set initial state
useEffect(() => {
  if (editorData && !hasLocalChanges) {
    setLocalSlides(editorData.slides || []);
  }
}, [editorData?.slides]);
```

### Step 2: Fix Slide Rendering
```typescript
// Replace line 409 with section-aware filtering
const sectionSlides = localSlides
  .filter(s => s.packageWineId === wine.id && s.section_type === key)
  .sort((a, b) => {
    // Welcome slides always first
    const aIsWelcome = a.type === 'interlude' && a.payloadJson?.title?.includes('Welcome');
    const bIsWelcome = b.type === 'interlude' && b.payloadJson?.title?.includes('Welcome');
    if (aIsWelcome && !bIsWelcome) return -1;
    if (!aIsWelcome && bIsWelcome) return 1;
    return a.position - b.position;
  });
```

### Step 3: Add Position Helper
```typescript
const getNextPositionForSection = (wineId: string, sectionType: string) => {
  const sectionSlides = localSlides.filter(
    s => s.packageWineId === wineId && s.section_type === sectionType
  );
  return sectionSlides.length > 0 
    ? Math.max(...sectionSlides.map(s => s.position)) + 1 
    : 1;
};
```

### Step 4: Fix Database Schema (Optional but Recommended)
```sql
-- Add unique constraint for wine + section + position
ALTER TABLE slides 
ADD CONSTRAINT unique_slide_position 
UNIQUE (package_wine_id, section_type, position);
```

## Testing Plan

1. **Reordering Tests**
   - Create 3 slides in same section
   - Reorder middle slide up/down
   - Verify visual update happens immediately
   - Verify positions persist after refresh

2. **Question Type Tests**
   - Change question to multiple choice
   - Verify options appear with defaults
   - Add/remove options
   - Save and verify persistence

3. **Welcome Slide Tests**
   - Create new wine
   - Verify welcome slide auto-created
   - Try to reorder - should stay first
   - Verify appears in intro section

## Success Criteria

1. ✅ Slides reorder visually without page refresh
2. ✅ All question types show appropriate config options
3. ✅ Welcome slides always appear first in intro section
4. ✅ Positions are unique within wine + section
5. ✅ Changes persist correctly to database
6. ✅ No position conflicts or duplicates

## Migration Notes

- Existing slides may have position conflicts
- Run position normalization script after deploy
- Backup database before schema changes