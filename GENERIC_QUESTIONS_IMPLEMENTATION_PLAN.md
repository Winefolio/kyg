# Generic Questions Implementation Plan

## Executive Summary
This plan outlines the implementation of a comprehensive generic questions system that provides an easy, seamless process for creating various question types (multiple choice, slider, text) with a unified, intuitive interface.

## Current State Analysis

### Existing Question Types
1. **Multiple Choice** - Fully implemented with good UI
2. **Scale/Slider** - Implemented but with field naming inconsistencies
3. **Text Input** - Basic implementation
4. **Boolean (Yes/No)** - Listed but not implemented
5. **Non-question slides** - Limited editor support

### Current Pain Points
1. **Fragmented Creation Flow**: Question creation is buried in the slide config panel
2. **Limited Templates**: Templates exist but aren't easily accessible
3. **Field Inconsistencies**: Mixed naming (`question_type` vs `questionType`, `scale_min` vs `min`)
4. **No Live Preview**: Static preview doesn't show actual components
5. **Complex Navigation**: Multi-level UI makes quick question creation difficult

## Proposed Solution: Unified Question Creation System

### 1. Database Schema Enhancement

Add `generic_questions` field to slides table to support flexible question formats:

```sql
ALTER TABLE slides ADD COLUMN generic_questions jsonb;
```

This field will store:
```json
{
  "format": "multiple_choice|scale|text|boolean",
  "config": {
    // Format-specific configuration
  },
  "metadata": {
    "tags": ["flavor", "structure", "overall"],
    "difficulty": "beginner|intermediate|advanced",
    "estimated_time": 30
  }
}
```

### 2. New Question Creation Interface

#### A. Quick Question Builder Modal
Create a streamlined modal interface that appears when clicking "Add Question":

```typescript
interface QuickQuestionBuilderProps {
  onSave: (question: GenericQuestion) => void;
  wineContext?: Wine; // For context-aware suggestions
  sectionType?: string; // intro, deep_dive, ending
}
```

Features:
- **Visual Question Type Selector**: Card-based selection with icons
- **Live Preview**: Real component rendering as you type
- **Smart Defaults**: Pre-filled based on section and wine type
- **Template Gallery**: One-click common questions
- **Format Switcher**: Easy conversion between question types

#### B. Question Type Cards Design

```
┌─────────────────────────────────────────────────┐
│  Choose Question Type                           │
├─────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│ │    📝     │ │    📊     │ │    ✍️     │     │
│ │  Multiple │ │   Scale   │ │   Text    │     │
│ │  Choice   │ │  Rating   │ │   Input   │     │
│ └───────────┘ └───────────┘ └───────────┘     │
│                                                 │
│ ┌───────────┐ ┌───────────┐                   │
│ │    ✓✗     │ │    🎥     │                   │
│ │  Yes/No   │ │   Media   │                   │
│ └───────────┘ └───────────┘                   │
└─────────────────────────────────────────────────┘
```

### 3. Implementation Steps

#### Phase 1: Database & Backend (Week 1)
1. **Add generic_questions column**
   - Migration script
   - Update Drizzle schema
   - Add validation

2. **Create Generic Question API**
   - POST /api/slides/generic-question
   - GET /api/question-templates
   - PUT /api/slides/:id/convert-format

3. **Standardize Field Names**
   - Create migration to normalize existing data
   - Update all components to use consistent names

#### Phase 2: UI Components (Week 2)

1. **QuickQuestionBuilder Component**
```typescript
// client/src/components/editor/QuickQuestionBuilder.tsx
export function QuickQuestionBuilder({ 
  onSave, 
  wineContext, 
  sectionType 
}: QuickQuestionBuilderProps) {
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [preview, setPreview] = useState(true);
  const [questionData, setQuestionData] = useState<GenericQuestion>({
    format: 'multiple_choice',
    config: {},
    metadata: {}
  });

  // Real-time preview with actual components
  const renderPreview = () => {
    switch (questionData.format) {
      case 'multiple_choice':
        return <MultipleChoiceQuestion {...questionData.config} />;
      case 'scale':
        return <ScaleQuestion {...questionData.config} />;
      // etc...
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-4">
        {/* Question Builder Form */}
        <QuestionTypeSelector 
          selected={selectedType} 
          onChange={setSelectedType} 
        />
        {selectedType && (
          <QuestionConfigForm 
            type={selectedType}
            data={questionData}
            onChange={setQuestionData}
            suggestions={getSmartSuggestions(wineContext, sectionType)}
          />
        )}
      </div>
      <div className="bg-gray-900 rounded-lg p-4">
        {/* Live Preview */}
        <h3 className="text-white mb-4">Live Preview</h3>
        {preview && renderPreview()}
      </div>
    </div>
  );
}
```

2. **Smart Template Suggestions**
```typescript
function getSmartSuggestions(wine?: Wine, section?: string) {
  // Return context-aware question templates
  if (section === 'intro' && wine?.wineType === 'red') {
    return [
      { title: "First Impression", type: "scale", config: {...} },
      { title: "Color Intensity", type: "multiple_choice", config: {...} }
    ];
  }
  // More contextual logic...
}
```

3. **Unified Question Config Form**
```typescript
// Replaces current QuestionConfigForm with dynamic fields
export function UnifiedQuestionConfig({ 
  type, 
  data, 
  onChange 
}: UnifiedQuestionConfigProps) {
  const fields = getFieldsForType(type);
  
  return (
    <Form>
      {fields.map(field => (
        <DynamicField 
          key={field.name}
          field={field}
          value={data[field.name]}
          onChange={(value) => onChange(field.name, value)}
        />
      ))}
    </Form>
  );
}
```

#### Phase 3: Editor Integration (Week 3)

1. **Update Package Editor**
   - Add "Quick Add Question" button in each section
   - Integrate QuickQuestionBuilder modal
   - Show question type badges in sidebar

2. **Enhanced Slide List**
```typescript
// Show question types visually in sidebar
<div className="flex items-center space-x-2">
  <QuestionTypeBadge type={slide.generic_questions?.format} />
  <span>{slide.payloadJson.title}</span>
</div>
```

3. **Drag & Drop with Type Conversion**
   - Allow dragging questions between sections
   - Prompt for format conversion if needed

#### Phase 4: Template System (Week 4)

1. **Template Gallery Component**
```typescript
export function TemplateGallery({ 
  onSelect,
  filters 
}: TemplateGalleryProps) {
  const templates = useTemplates(filters);
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onClick={() => onSelect(template)}
          preview={<MiniPreview config={template.config} />}
        />
      ))}
    </div>
  );
}
```

2. **Common Question Templates**
```typescript
export const commonQuestions = {
  flavor: {
    beginner: [
      {
        format: 'multiple_choice',
        config: {
          title: "What flavors do you detect?",
          options: ["Fruity", "Earthy", "Spicy", "Floral"],
          allow_multiple: true
        }
      }
    ],
    advanced: [
      {
        format: 'text',
        config: {
          title: "Describe the specific fruit characteristics",
          placeholder: "e.g., blackberry, cassis, cherry..."
        }
      }
    ]
  },
  // More categories...
};
```

### 4. User Experience Flow

1. **Creating a New Question**:
   - Click "+" button in section
   - Modal opens with question type cards
   - Select type → Configure → See live preview
   - Save adds to wine section

2. **Using Templates**:
   - Click "Browse Templates"
   - Filter by category/difficulty
   - Preview template
   - One-click add with customization

3. **Converting Question Types**:
   - Right-click existing question
   - Select "Convert to..."
   - System intelligently maps data
   - Preview before confirming

### 5. Technical Considerations

#### Data Migration Strategy
```typescript
// Migrate existing slides to generic_questions format
async function migrateToGenericQuestions() {
  const slides = await db.select().from(slides).where(eq(slides.type, 'question'));
  
  for (const slide of slides) {
    const genericQuestion = convertToGenericFormat(slide.payloadJson);
    await db.update(slides)
      .set({ generic_questions: genericQuestion })
      .where(eq(slides.id, slide.id));
  }
}
```

#### Backwards Compatibility
- Keep existing payloadJson field
- Dual-write during transition period
- Components check both fields

### 6. Success Metrics

1. **Time to Create Question**: < 30 seconds
2. **Template Usage**: > 60% of questions from templates
3. **Format Conversion Usage**: Track successful conversions
4. **User Satisfaction**: Editor NPS score > 8

### 7. Implementation Timeline

**Week 1**: Database schema, API endpoints, data migration
**Week 2**: Core UI components, QuickQuestionBuilder
**Week 3**: Editor integration, live preview
**Week 4**: Template system, polish, testing

### 8. Next Steps

1. **Immediate Actions**:
   - Create database migration for generic_questions
   - Build QuickQuestionBuilder component
   - Standardize field names across codebase

2. **Testing Strategy**:
   - Unit tests for format conversion
   - E2E tests for question creation flow
   - User testing with sommeliers

3. **Documentation**:
   - Question format specification
   - Template creation guide
   - Migration guide for existing packages

## Conclusion

This implementation plan provides a comprehensive solution for generic questions that:
- Simplifies question creation to < 30 seconds
- Provides visual, intuitive interface
- Maintains backwards compatibility
- Enables rapid content creation through templates
- Supports all question types uniformly

The phased approach ensures we can deliver value incrementally while building towards the complete vision.