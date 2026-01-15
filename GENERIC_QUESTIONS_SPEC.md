# Generic Questions Technical Specification

## Data Structure Definition

### Base Schema
```typescript
interface GenericQuestion {
  format: QuestionFormat;
  config: QuestionConfig;
  metadata: QuestionMetadata;
  validation?: ValidationRules;
}

type QuestionFormat = 'multiple_choice' | 'scale' | 'text' | 'boolean' | 'ranking' | 'matrix';
```

### Format-Specific Configurations

#### Multiple Choice
```typescript
interface MultipleChoiceConfig {
  title: string;
  description?: string;
  options: Array<{
    id: string;
    text: string;
    value: string;
    description?: string;
    imageUrl?: string;
  }>;
  allowMultiple: boolean;
  allowOther: boolean;
  otherLabel?: string;
  randomizeOptions?: boolean;
  minSelections?: number;
  maxSelections?: number;
}
```

#### Scale Rating
```typescript
interface ScaleConfig {
  title: string;
  description?: string;
  scaleMin: number;
  scaleMax: number;
  scaleLabels: [string, string]; // [min label, max label]
  step: number;
  showNumbers: boolean;
  showLabels: boolean;
  defaultValue?: number;
  visualStyle: 'slider' | 'buttons' | 'stars';
}
```

#### Text Input
```typescript
interface TextConfig {
  title: string;
  description?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number; // for textarea
  inputType: 'text' | 'textarea' | 'email' | 'number';
  pattern?: string; // regex validation
}
```

#### Boolean (Yes/No)
```typescript
interface BooleanConfig {
  title: string;
  description?: string;
  trueLabel: string;  // default: "Yes"
  falseLabel: string; // default: "No"
  defaultValue?: boolean;
  visualStyle: 'buttons' | 'toggle' | 'checkbox';
}
```

### Metadata Structure
```typescript
interface QuestionMetadata {
  tags: string[];
  category: 'appearance' | 'aroma' | 'taste' | 'structure' | 'overall';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number; // seconds
  pointValue?: number;
  expertNote?: string;
  glossaryTerms?: string[]; // auto-highlighted terms
  relatedCharacteristics?: string[]; // wine characteristic IDs
}
```

### Validation Rules
```typescript
interface ValidationRules {
  required: boolean;
  customValidation?: {
    rule: string; // JS expression
    message: string;
  };
  dependencies?: Array<{
    questionId: string;
    condition: string; // JS expression
  }>;
}
```

## Database Storage

### PostgreSQL JSONB Column
```sql
-- Generic questions column stores the complete question configuration
ALTER TABLE slides 
ADD COLUMN generic_questions jsonb,
ADD CONSTRAINT valid_generic_question CHECK (
  generic_questions IS NULL OR (
    generic_questions ? 'format' AND
    generic_questions ? 'config' AND
    generic_questions->>'format' IN (
      'multiple_choice', 'scale', 'text', 'boolean', 'ranking', 'matrix'
    )
  )
);

-- Index for searching by format and tags
CREATE INDEX idx_slides_question_format ON slides ((generic_questions->>'format'));
CREATE INDEX idx_slides_question_tags ON slides USING gin ((generic_questions->'metadata'->'tags'));
```

## Migration Strategy

### Phase 1: Dual Write
```typescript
// During transition, write to both fields
async function createSlide(data: SlideInput) {
  const genericQuestion = convertToGenericFormat(data);
  
  return await db.insert(slides).values({
    ...data,
    payloadJson: data.payloadJson, // Keep for backwards compatibility
    generic_questions: genericQuestion
  });
}
```

### Phase 2: Data Migration
```typescript
// Batch migration script
async function migrateExistingQuestions() {
  const questions = await db.select()
    .from(slides)
    .where(eq(slides.type, 'question'));
    
  for (const question of questions) {
    const genericFormat = {
      format: normalizeFormat(question.payloadJson.question_type),
      config: normalizeConfig(question.payloadJson),
      metadata: extractMetadata(question)
    };
    
    await db.update(slides)
      .set({ generic_questions: genericFormat })
      .where(eq(slides.id, question.id));
  }
}

function normalizeFormat(type: string): QuestionFormat {
  const formatMap = {
    'multiple_choice': 'multiple_choice',
    'multiplechoice': 'multiple_choice',
    'scale': 'scale',
    'slider': 'scale',
    'text': 'text',
    'text_input': 'text',
    'boolean': 'boolean',
    'yes_no': 'boolean'
  };
  
  return formatMap[type.toLowerCase()] || 'text';
}
```

## API Endpoints

### Create Generic Question
```typescript
POST /api/slides/generic-question
{
  "packageWineId": "uuid",
  "position": 5,
  "sectionType": "deep_dive",
  "genericQuestion": {
    "format": "scale",
    "config": {
      "title": "How would you rate the tannins?",
      "scaleMin": 1,
      "scaleMax": 5,
      "scaleLabels": ["Soft", "Aggressive"],
      "visualStyle": "slider"
    },
    "metadata": {
      "tags": ["structure", "tannins"],
      "category": "structure",
      "difficulty": "intermediate"
    }
  }
}
```

### Convert Question Format
```typescript
PUT /api/slides/:id/convert-format
{
  "toFormat": "multiple_choice",
  "conversionOptions": {
    "preserveTitle": true,
    "generateOptions": true
  }
}

// Response includes preview of converted question
{
  "original": { ... },
  "converted": { ... },
  "warnings": ["Scale values will be converted to 5 options"]
}
```

## Frontend Usage

### Type-Safe Question Rendering
```typescript
function renderQuestion(slide: Slide) {
  const gq = slide.generic_questions;
  if (!gq) return renderLegacyQuestion(slide);
  
  switch (gq.format) {
    case 'multiple_choice':
      return <MultipleChoiceQuestion {...gq.config as MultipleChoiceConfig} />;
    case 'scale':
      return <ScaleQuestion {...gq.config as ScaleConfig} />;
    case 'text':
      return <TextQuestion {...gq.config as TextConfig} />;
    case 'boolean':
      return <BooleanQuestion {...gq.config as BooleanConfig} />;
    default:
      return <div>Unknown question format</div>;
  }
}
```

### Smart Defaults by Context
```typescript
function getQuestionDefaults(
  format: QuestionFormat, 
  context: { wine?: Wine, section?: string }
): Partial<GenericQuestion> {
  const defaults: Record<QuestionFormat, any> = {
    multiple_choice: {
      config: {
        allowMultiple: false,
        randomizeOptions: false
      },
      metadata: {
        difficulty: 'beginner',
        estimatedTime: 20
      }
    },
    scale: {
      config: {
        scaleMin: 1,
        scaleMax: 10,
        step: 1,
        showNumbers: true,
        visualStyle: 'slider'
      },
      metadata: {
        difficulty: 'intermediate',
        estimatedTime: 15
      }
    }
    // ... other formats
  };
  
  // Apply context-specific overrides
  if (context.section === 'intro' && format === 'scale') {
    defaults.scale.config.scaleMax = 5; // Simpler scale for intro
  }
  
  return defaults[format];
}
```

## Benefits

1. **Consistency**: Single source of truth for question data
2. **Flexibility**: Easy to add new question formats
3. **Type Safety**: Full TypeScript support
4. **Searchability**: JSONB indexes for fast queries
5. **Migration Path**: Gradual transition from legacy format
6. **Extensibility**: Metadata supports future features

This specification provides a robust foundation for the generic questions system while maintaining backwards compatibility and enabling future enhancements.