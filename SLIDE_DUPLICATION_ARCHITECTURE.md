# Wine Slide Duplication Feature Architecture

## 1. Feature Overview

**Purpose**: Enable duplication of slides from one wine to another within the same package
**Target Users**: Sommeliers creating wine tasting packages
**Location**: Package Editor interface
**Scope**: Slides within same package only (not cross-package)

## 2. User Interface Design

### 2.1 Trigger Location
- **Position**: Wine section header in Package Editor
- **Visibility**: Only show when wine has slides (slide count > 0)
- **Button**: "Copy Slides" with dropdown arrow icon

### 2.2 Dropdown Menu Structure
```
Wine Section Header
├── [Wine Name] (X slides)
├── [Add Slide Button]
├── [Copy Slides ▼] ← NEW BUTTON
    └── Dropdown Menu:
        ├── "Copy to Wine 1: [Wine Name]" (if different wine)
        ├── "Copy to Wine 2: [Wine Name]" (if different wine)
        ├── "Copy to Wine 3: [Wine Name]" (if different wine)
        └── [Disabled if no other wines available]
```

### 2.3 Confirmation Dialog
```
Modal: "Copy Slides to [Target Wine Name]?"
├── Source: [Source Wine Name] - X slides
├── Target: [Target Wine Name] - Y existing slides
├── Warning: "This will add X new slides to [Target Wine]"
├── Option: "Replace existing slides" vs "Add to existing slides"
├── [Cancel] [Copy Slides]
```

## 3. Technical Implementation

### 3.1 Database Operations
**Required Functions**:
- `getSlidesByWineId(wineId)`: Fetch all slides for source wine
- `duplicateSlides(sourceWineId, targetWineId, options)`: Core duplication logic
- `getNextSlidePosition(wineId)`: Calculate position for new slides

### 3.2 Slide Duplication Logic
```typescript
interface DuplicationOptions {
  targetWineId: string;
  replaceExisting: boolean; // true = replace, false = append
  preservePositions: boolean; // maintain slide ordering
}

async function duplicateSlides(sourceWineId: string, options: DuplicationOptions) {
  1. Fetch source slides with full payload data
  2. If replaceExisting: Delete target wine's existing slides
  3. For each source slide:
     - Generate new slide ID
     - Update packageWineId to target wine
     - Calculate new position (append or replace)
     - Preserve all other data (type, payloadJson, section_type)
     - Create new slide record
  4. Return count of duplicated slides
}
```

### 3.3 Position Management
**Append Mode**: 
- Get max position of target wine slides
- Add source slides with positions: maxPosition + 1, maxPosition + 2, etc.

**Replace Mode**:
- Delete all target wine slides
- Copy source slides with original positions (1, 2, 3, etc.)

### 3.4 Data Preservation
**What Gets Copied**:
- Slide type (multiple_choice, scale, text, etc.)
- Complete payloadJson content
- Section type (intro, deep_dive, ending)
- All question text, options, and configuration

**What Gets Updated**:
- Slide ID (new UUID)
- packageWineId (target wine)
- Position (recalculated)
- Created timestamp

## 4. API Endpoints

### 4.1 New Endpoint: POST /api/wines/{wineId}/duplicate-slides
```typescript
Request Body:
{
  targetWineId: string;
  replaceExisting: boolean;
}

Response:
{
  success: boolean;
  duplicatedCount: number;
  targetWineId: string;
  message: string;
}
```

### 4.2 Integration with Existing Storage
```typescript
// Add to IStorage interface
duplicateWineSlides(
  sourceWineId: string, 
  targetWineId: string, 
  replaceExisting: boolean
): Promise<{ count: number; slides: Slide[] }>;

// Implementation in DatabaseStorage
async duplicateWineSlides(sourceWineId, targetWineId, replaceExisting) {
  // 1. Validate both wines exist in same package
  // 2. Fetch source slides
  // 3. Handle target wine slides (delete if replacing)
  // 4. Create duplicated slides with new IDs and positions
  // 5. Return result
}
```

## 5. Frontend Components

### 5.1 WineSlideCopyButton Component
```typescript
interface WineSlideCopyButtonProps {
  sourceWine: PackageWine;
  availableWines: PackageWine[];
  onCopyComplete: (targetWineId: string, count: number) => void;
}
```

### 5.2 CopyConfirmationModal Component
```typescript
interface CopyConfirmationModalProps {
  sourceWine: PackageWine;
  targetWine: PackageWine;
  sourceSlideCount: number;
  targetSlideCount: number;
  onConfirm: (replaceExisting: boolean) => void;
  onCancel: () => void;
}
```

## 6. Error Handling & Validation

### 6.1 Validation Rules
- Source wine must have slides (count > 0)
- Target wine must be different from source wine
- Both wines must be in same package
- User must have edit permissions

### 6.2 Error Cases
- **No target wines available**: Disable button, show tooltip
- **API failure**: Show error toast with retry option
- **Permission denied**: Show permission error message
- **Invalid wine IDs**: Handle gracefully with user feedback

## 7. User Experience Considerations

### 7.1 Loading States
- Show spinner on "Copy Slides" button during operation
- Disable all form interactions during duplication
- Show progress indicator for large slide sets

### 7.2 Success Feedback
- Toast notification: "X slides copied to [Wine Name]"
- Automatically refresh wine section to show new slides
- Highlight newly added slides temporarily

### 7.3 Undo Functionality (Future Enhancement)
- Store operation history for potential undo
- Allow reverting duplication within session

## 8. Testing Strategy

### 8.1 Unit Tests
- Slide duplication logic
- Position calculation
- Data preservation
- Error handling

### 8.2 Integration Tests
- End-to-end duplication flow
- Database consistency
- UI interaction flow

### 8.3 Edge Cases
- Empty source wine
- Single wine in package
- Large slide sets (performance)
- Concurrent modifications

## 9. Performance Considerations

### 9.1 Optimization Strategies
- Batch slide creation for large sets
- Lazy loading of wine options
- Debounced API calls
- Client-side caching of wine data

### 9.2 Scalability
- Handle packages with many wines efficiently
- Optimize database queries for slide fetching
- Consider pagination for large slide sets

## 10. Future Enhancements

### 10.1 Advanced Features
- Cross-package slide copying
- Selective slide copying (choose specific slides)
- Slide template library
- Bulk operations on multiple wines

### 10.2 Template System
- Save slide sets as reusable templates
- Template categories (intro, tasting, conclusion)
- Community template sharing