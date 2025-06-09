# Generic Questions Implementation - Actionable To-Do List

## Immediate Priority Tasks (This Week)

### Task 1: Database Schema Update
- [ ] Create migration to add `generic_questions` jsonb column to slides table
- [ ] Update Drizzle schema in `shared/schema.ts`
- [ ] Add Zod validation schema for generic_questions format
- [ ] Test migration on local database

### Task 2: Standardize Field Names
- [ ] Create data migration script to normalize existing field names:
  - `question_type` → `questionType` (standardize on camelCase)
  - `scale_min/scale_max` → `scaleMin/scaleMax`
  - `scale_labels` → `scaleLabels`
  - `allow_multiple` → `allowMultiple`
  - `allow_notes` → `allowNotes`
- [ ] Update all components to use standardized names
- [ ] Test backwards compatibility

### Task 3: Create QuickQuestionBuilder Component
- [ ] Create `client/src/components/editor/QuickQuestionBuilder.tsx`
- [ ] Implement question type selector with visual cards
- [ ] Add configuration forms for each question type
- [ ] Integrate live preview using actual question components
- [ ] Add smart suggestions based on wine/section context

### Task 4: Update Package Editor UI
- [ ] Add "Quick Add Question" button to each section
- [ ] Integrate QuickQuestionBuilder as a modal
- [ ] Add question type badges to slide list
- [ ] Improve visual hierarchy in sidebar

### Task 5: Create Template System
- [ ] Create `client/src/lib/questionTemplates.ts` with common questions
- [ ] Build TemplateGallery component
- [ ] Add template filtering by category/difficulty
- [ ] Implement one-click template insertion

## Code Implementation Steps

### 1. Database Migration (Priority: HIGH)
```sql
-- migrations/0002_add_generic_questions.sql
ALTER TABLE slides ADD COLUMN generic_questions jsonb;

-- Migrate existing data
UPDATE slides 
SET generic_questions = jsonb_build_object(
  'format', COALESCE(payload_json->>'question_type', payload_json->>'questionType', 'multiple_choice'),
  'config', payload_json,
  'metadata', jsonb_build_object(
    'migrated', true,
    'migratedAt', NOW()
  )
)
WHERE type = 'question';
```

### 2. QuickQuestionBuilder Component Structure
```typescript
// client/src/components/editor/QuickQuestionBuilder.tsx
const QuickQuestionBuilder = () => {
  // Step 1: Type selection
  // Step 2: Configuration
  // Step 3: Preview & Save
};
```

### 3. Unified Question Config
```typescript
// client/src/components/editor/UnifiedQuestionConfig.tsx
const questionFields = {
  multiple_choice: [
    { name: 'title', type: 'text', label: 'Question' },
    { name: 'options', type: 'array', label: 'Answer Options' },
    { name: 'allowMultiple', type: 'boolean', label: 'Allow Multiple Selections' }
  ],
  scale: [
    { name: 'title', type: 'text', label: 'Question' },
    { name: 'scaleMin', type: 'number', label: 'Minimum Value' },
    { name: 'scaleMax', type: 'number', label: 'Maximum Value' },
    { name: 'scaleLabels', type: 'array', label: 'Labels' }
  ],
  // etc...
};
```

### 4. Template Integration
```typescript
// client/src/lib/questionTemplates.ts
export const questionTemplates = {
  wine_tasting: {
    intro: [
      {
        id: 'first-impression',
        name: 'First Impression',
        format: 'scale',
        config: {
          title: 'Rate your first impression',
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: ['Disappointing', 'Exceptional']
        }
      }
    ]
  }
};
```

## Testing Checklist

### Unit Tests
- [ ] Test generic_questions validation
- [ ] Test field name normalization
- [ ] Test format conversion logic
- [ ] Test template application

### Integration Tests
- [ ] Test question creation flow
- [ ] Test live preview updates
- [ ] Test saving to database
- [ ] Test loading existing questions

### E2E Tests
- [ ] Test complete question creation workflow
- [ ] Test template selection and customization
- [ ] Test question type conversion
- [ ] Test drag-and-drop in editor

## UI/UX Improvements

### Visual Enhancements
- [ ] Add icons for each question type
- [ ] Create smooth transitions between steps
- [ ] Add keyboard shortcuts for power users
- [ ] Implement autosave with visual feedback

### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Add screen reader support
- [ ] Test with accessibility tools

## Performance Optimizations

- [ ] Lazy load question templates
- [ ] Debounce live preview updates
- [ ] Cache template gallery
- [ ] Optimize bundle size

## Documentation Tasks

- [ ] Write question format specification
- [ ] Create template authoring guide
- [ ] Document migration process
- [ ] Add inline help tooltips

## Success Criteria

1. **Question Creation Time**: < 30 seconds from click to save
2. **Zero Configuration**: Smart defaults work 80% of the time
3. **Template Usage**: 60%+ of questions created from templates
4. **User Satisfaction**: Positive feedback from 3+ test users

## Implementation Order

1. **Day 1-2**: Database schema + migration
2. **Day 3-4**: QuickQuestionBuilder component
3. **Day 5**: Template system
4. **Day 6**: Editor integration
5. **Day 7**: Testing & polish

## Notes for Development

- Keep existing functionality working during transition
- Use feature flags if needed for gradual rollout
- Monitor performance impact of live preview
- Gather user feedback early and often

## Next Actions

1. Start with database migration script
2. Create QuickQuestionBuilder component shell
3. Set up template structure
4. Begin standardizing field names

This focused approach ensures we deliver a working generic questions system that dramatically improves the question creation experience while maintaining backwards compatibility.