# Know Your Grape - Development Action Plan

## Overview
This document outlines the prioritized development tasks for the wine tasting platform overhaul. Each task includes my verification of the problem, questions/concerns, and detailed implementation steps.

---

## 🚨 Critical Issues & Verifications

### My Analysis of Current State

1. **Multi-Wine Flow**: ✅ VERIFIED - The `initializeWineTastingData` function in `server/storage.ts` (lines 428-450) DOES create slides for ALL wines, not just the first one. This contradicts the problem statement.

2. **Tooltip Systems**: ✅ VERIFIED - Two competing systems exist:
   - `DynamicTextRenderer.tsx` - Creates clickable terms with popups
   - `MultipleChoiceQuestion.tsx` - Has info panel in header (desired approach)
   - `WineTastingTooltip.tsx` - Separate hardcoded system (should be removed)

3. **Wine Selection**: ✅ VERIFIED - `SessionWineSelector.tsx` exists and is feature-complete with drag-and-drop

4. **Live Preview**: ✅ VERIFIED - `SlidePreviewPanel.tsx` uses static mockups, not real components

---

## 📋 Task Breakdown with Verification

### Group 1: Session Flow & Content Architecture

#### Task 1.1: Implement Continuous Multi-Wine Flow
**Status**: ❓ NEEDS CLARIFICATION
**My Finding**: The code already creates slides for all wines (line 428: `for (const wine of [chateauMargaux, chateauLatour, chateauYquem, brunello, chianti, opusOne, screamingEagle])`)

**Questions for You**:
1. Are you seeing issues with specific packages or all packages?
2. Is the problem in the runtime (TastingSession.tsx) rather than data seeding?
3. Should we check if transition slides between wines are working correctly?

**Proposed Investigation**:
```typescript
// Check if slides are being filtered correctly in TastingSession.tsx
// Verify wine transitions are triggering properly
// Ensure sessionWineSelections are being respected
```

---

#### Task 1.2: Implement Dynamic Slide Template System
**Status**: ✅ READY TO IMPLEMENT
**My Verification**: 
- `wineTemplates.ts` exists but needs expansion
- PackageEditor has no "Add Slide" UI currently
- No template selection dropdown exists

**Implementation Plan**:
```typescript
// Step 1: Enhance wineTemplates.ts
export const WINE_TASTING_TEMPLATES = {
  intro: [
    {
      id: 'welcome',
      name: 'Welcome Message',
      icon: '👋',
      type: 'interlude',
      section_type: 'intro',
      payloadTemplate: {
        title: 'Welcome to {{wineName}}',
        description: 'Let\'s explore this exceptional wine together'
      }
    },
    // Add more templates...
  ],
  deep_dive: [
    {
      id: 'body_assessment',
      name: 'Body Assessment',
      icon: '🍷',
      type: 'question',
      section_type: 'deep_dive',
      payloadTemplate: {
        title: 'How would you describe the body?',
        question_type: 'scale',
        scale_min: 1,
        scale_max: 5,
        scale_labels: ['Light', 'Full']
      }
    }
  ]
};

// Step 2: Add UI in PackageEditor.tsx
// - Add Popover with template grid
// - Group by section_type
// - Show icon and name for each template
```

**Files to Modify**:
- `client/src/lib/wineTemplates.ts` - Centralize all templates
- `client/src/pages/PackageEditor.tsx` - Add template selector UI
- Create new: `client/src/components/editor/TemplateSelector.tsx`

---

#### Task 1.3: Consolidate Tooltip UI
**Status**: ✅ READY TO IMPLEMENT
**My Verification**: Confirmed two systems exist, need to standardize

**Implementation Plan**:
```typescript
// Step 1: Modify DynamicTextRenderer.tsx
// Change from <button> to <span>
<span className="font-bold text-purple-300 underline decoration-dotted">
  {matchedTerm}
</span>

// Step 2: Create HelpfulTermsPanel.tsx
export function HelpfulTermsPanel({ content }: { content: string }) {
  const relevantTerms = extractRelevantTerms(content, glossaryTerms);
  // Render info icon and sliding panel
}

// Step 3: Add to all question components
<HelpfulTermsPanel content={question.title + ' ' + question.description} />
```

**Files to Modify**:
- `client/src/components/ui/DynamicTextRenderer.tsx` - Remove onClick
- Create: `client/src/components/ui/HelpfulTermsPanel.tsx`
- Update: All question components to include panel

**⚠️ Important**: Should we keep the visual highlighting (underline) when removing clickability?

---

### Group 2: Host & Editor Experience

#### Task 2.1: Implement Host Wine Selection & Ordering
**Status**: 🟡 PARTIALLY COMPLETE
**My Verification**: 
- `SessionWineSelector.tsx` component is complete
- API endpoint `/api/sessions/:sessionId/wine-selections` exists
- BUT: Not integrated into HostDashboard

**Implementation Plan**:
```typescript
// Step 1: Integrate into HostDashboard.tsx
import { SessionWineSelector } from '@/components/SessionWineSelector';

// Add to the Host Controls section
<SessionWineSelector 
  sessionId={sessionId}
  packageId={session.packageId}
  onSelectionChange={setSelectedWineCount}
/>

// Step 2: Update TastingSession.tsx data fetching
// Check for sessionWineSelections before fetching slides
```

**Missing Backend Logic**:
- Need to update `/api/packages/:code/slides` endpoint to respect wine selections
- Current implementation doesn't filter based on session selections

---

#### Task 2.2: Implement True Live Preview
**Status**: ✅ READY TO IMPLEMENT
**My Verification**: Preview uses static components, not real ones

**Implementation Plan**:
```typescript
// Step 1: Lift state in PackageEditor.tsx
const [liveSlideData, setLiveSlideData] = useState(null);
const [debouncedSlideData] = useDebounce(liveSlideData, 250);

// Step 2: Refactor SlidePreviewPanel.tsx
switch (slideData.type) {
  case 'question':
    if (slideData.payloadJson.question_type === 'multiple_choice') {
      return <MultipleChoiceQuestion 
        question={slideData.payloadJson}
        value={null}
        onChange={() => {}}
        readOnly
      />;
    }
    // ... other question types
}

// Step 3: Pass onChange to SlideConfigPanel
<SlideConfigPanel
  activeSlide={activeSlide}
  onFormChange={setLiveSlideData}
/>
```

---

## 🎯 Execution Priority & Timeline

### Phase 1: Quick Fixes (2-3 hours)
1. **Task 1.3**: Tooltip Consolidation - Clear requirement, simple fix
2. **Task 2.1**: Complete Wine Selection Integration - Component exists, just needs wiring

### Phase 2: Core Features (4-6 hours)  
3. **Task 1.2**: Template System - High impact for content creators
4. **Task 2.2**: Live Preview - Major UX improvement for editors

### Phase 3: Investigation Required
5. **Task 1.1**: Multi-Wine Flow - Need clarification on actual issue

---

## ❓ Questions & Concerns

1. **Multi-Wine Flow**: The code appears to already handle multiple wines. Is the issue in the UI navigation rather than data?

2. **Template System**: Should templates be stored in the database (for sommelier customization) or kept in code?

3. **Wine Selection**: Should non-selected wines be completely hidden or shown as disabled?

4. **Performance**: Live preview with complex slides might lag. Should we add a preview toggle?

5. **Backward Compatibility**: Will existing sessions work after wine selection changes?

---

## 🚀 Recommended Starting Point

I recommend starting with **Task 1.3 (Tooltip Consolidation)** because:
- Clear requirements
- No dependencies
- Improves consistency immediately
- Low risk of breaking changes

Then move to **Task 2.1 (Wine Selection Integration)** since the component is already built and just needs to be connected.

---

## 📝 Additional Observations

1. **Transition Slides**: The system supports transition slides between wines, but they might not be triggering correctly in the UI.

2. **Section Navigation**: The progress bar shows sections but clicking doesn't navigate - this wasn't in the original requirements but would be valuable.

3. **Missing API Endpoint**: The `/api/sessions/:sessionId/wine-selections` POST endpoint might not be implemented in routes.ts.

4. **Preview Components**: Question components might need a `readOnly` or `preview` prop to work properly in the preview panel.

Let me know which tasks you'd like to tackle first and if you need clarification on any of my findings!