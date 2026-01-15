# QuickQuestionBuilder Interface Mockup

## Visual Design Concept

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✨ Create New Question                                      [X]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1: Choose Question Type                                      │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐│
│  │     📝      │  │     📊      │  │     ✍️      │  │    ✓✗     ││
│  │  Multiple   │  │   Scale     │  │    Text     │  │  Yes/No   ││
│  │  Choice     │  │   Rating    │  │   Input     │  │           ││
│  │             │  │             │  │             │  │           ││
│  │ [Selected]  │  │             │  │             │  │           ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘│
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 2: Configure Your Question                                   │
│                                                                     │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐   │
│  │ Configuration               │  │ Live Preview              │   │
│  │                             │  │                           │   │
│  │ Question Title:             │  │ ┌───────────────────────┐ │   │
│  │ ┌─────────────────────────┐ │  │ │ What primary flavors  │ │   │
│  │ │What primary flavors do..│ │  │ │ do you detect?        │ │   │
│  │ └─────────────────────────┘ │  │ │                       │ │   │
│  │                             │  │ │ ○ Fruity              │ │   │
│  │ Answer Options:             │  │ │ ○ Earthy              │ │   │
│  │ ┌─────────────────────────┐ │  │ │ ○ Spicy               │ │   │
│  │ │ Fruity                  │ │  │ │ ○ Floral              │ │   │
│  │ └─────────────────────────┘ │  │ │                       │ │   │
│  │ ┌─────────────────────────┐ │  │ │ [Next]                │ │   │
│  │ │ Earthy                  │ │  │ └───────────────────────┘ │   │
│  │ └─────────────────────────┘ │  │                           │   │
│  │ ┌─────────────────────────┐ │  │ 💡 Tip: This question    │   │
│  │ │ Spicy                   │ │  │ works well in the intro  │   │
│  │ └─────────────────────────┘ │  │ section for red wines    │   │
│  │ [+ Add Option]             │  │                           │   │
│  │                             │  │                           │   │
│  │ ☑ Allow multiple selections │  │                           │   │
│  │ ☐ Include "Other" option    │  │                           │   │
│  └─────────────────────────────┘  └───────────────────────────┘   │
│                                                                     │
│  Suggested Templates:                                               │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐         │
│  │ Flavor Profile │ │ Body Assessment│ │ Tannin Level   │ [More] │
│  └────────────────┘ └────────────────┘ └────────────────┘         │
│                                                                     │
│  [Cancel]                                    [Save Question]        │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features Illustrated

### 1. Visual Question Type Selection
- Large, clickable cards with icons
- Clear visual hierarchy
- Selected state indication

### 2. Split-Screen Configuration
- Left: Configuration form
- Right: Live preview
- Real-time updates as you type

### 3. Smart Suggestions
- Context-aware tips based on wine type and section
- Template suggestions at the bottom
- One-click template application

### 4. Streamlined Workflow
- Two-step process: Select type → Configure
- Clear action buttons
- Escape hatch (Cancel) always visible

## Component Implementation Example

```tsx
// Example implementation structure
export function QuickQuestionBuilder({ onSave, context }) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [config, setConfig] = useState<QuestionConfig>({});

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>✨ Create New Question</DialogTitle>
        </DialogHeader>
        
        {step === 'type' && (
          <QuestionTypeSelector
            selected={selectedType}
            onSelect={(type) => {
              setSelectedType(type);
              setStep('config');
            }}
          />
        )}
        
        {step === 'config' && selectedType && (
          <div className="grid grid-cols-2 gap-6">
            <QuestionConfigurator
              type={selectedType}
              config={config}
              onChange={setConfig}
              suggestions={getSuggestions(context)}
            />
            <QuestionPreview
              type={selectedType}
              config={config}
              tips={getTips(selectedType, context)}
            />
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ type: selectedType, config })}>
            Save Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Benefits of This Design

1. **Speed**: Two clicks to create a basic question
2. **Clarity**: Visual selection reduces cognitive load
3. **Flexibility**: Easy to add new question types
4. **Learning**: Tips and templates guide new users
5. **Power**: Advanced options available but not required

## Mobile Responsive Version

On mobile, the interface stacks vertically:
- Question type cards in 2x2 grid
- Configuration and preview in tabs
- Bottom sheet pattern for better ergonomics

This design prioritizes speed and simplicity while maintaining the flexibility needed for advanced users.