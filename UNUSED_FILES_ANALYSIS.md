# Unused Files and Components Analysis

## Summary

This analysis identified **115 unused files** out of 134 total TypeScript/React files in the codebase. This represents approximately **86% unused code**. However, many of these files are likely false positives due to:

1. **Dynamic imports** not detected by static analysis
2. **Entry points** that are loaded by routing systems
3. **UI components** that are part of a design system library
4. **Migration files** and utilities that are used by build tools

## Critical Findings

### 1. Duplicate Tooltip Systems (High Priority)

**Problem**: Two competing tooltip systems exist, as mentioned in the project documentation:

- **WineTastingTooltip.tsx** (214 lines) - Hardcoded wine terms with modal popups
- **DynamicTextRenderer.tsx** (216 lines) - Dynamic system using GlossaryContext

**Impact**: Code duplication, inconsistent UX, maintenance burden

**Recommendation**: 
- Remove `WineTastingTooltip.tsx` and `WineTermText` helper
- Standardize on `DynamicTextRenderer` with GlossaryContext
- Update components using the old system

### 2. Unused UI Components (Low Priority)

**59 shadcn/ui components** appear unused, but this is likely expected for a component library. Actually used components:

**Most Used**:
- Button (37 imports)
- Badge (22 imports) 
- Card (23 imports)
- Label (17 imports)
- Input/Textarea (15 imports)

**Custom Components**:
- SegmentedProgressBar, VideoPlayer, AudioPlayer, MediaUpload (actively used)
- ModernButton, ModernCard, ModernSlider (2 imports each)

### 3. Potentially Dead Code

#### Server Files:
- **slide-positions.ts** - Position calculation utilities (unused imports)
- **migrations/relations.ts** - Auto-generated Drizzle relations (likely used by ORM)

#### Pages:
All page components show as "unused" but are likely loaded by the router:
- Gateway.tsx, TastingSession.tsx, HostDashboard.tsx, etc.

#### Components:
Many components marked as unused are likely loaded dynamically:
- Question components (MultipleChoiceQuestion, ScaleQuestion, etc.)
- Slide components (VideoMessageSlide, AudioMessageSlide)
- Editor components (SlideConfigPanel, QuestionConfigForm, etc.)

### 4. Template/Library Files

These files contain reusable content and may be used dynamically:
- **questionTemplates.ts** - Template definitions
- **wineTemplates.ts** - Wine slide templates
- **animations.ts**, **micro-animations.ts**, **modern-animations.ts** - Animation libraries

## Recommendations by Priority

### High Priority
1. **Consolidate tooltip systems** - Remove WineTastingTooltip, standardize on DynamicTextRenderer
2. **Verify dynamic imports** - Check if router, template systems use dynamic imports

### Medium Priority  
3. **Audit animations** - 3 animation files seem excessive, consider consolidation
4. **Review template usage** - Verify questionTemplates.ts and wineTemplates.ts are actively used
5. **Check slide-positions.ts** - Appears to be utility functions that should be imported somewhere

### Low Priority
6. **UI component cleanup** - After confirming which shadcn components are truly unused
7. **Hook consolidation** - Several custom hooks may be unused (useUserProfile, useAnimations)

## False Positives (Likely Not Actually Unused)

- **Page components** - Loaded by router
- **Question components** - Loaded dynamically in renderSlideContent
- **Editor forms** - Loaded conditionally in editor
- **Gateway views** - Loaded conditionally by Gateway component
- **Migration files** - Used by Drizzle ORM
- **Config files** - Used by build tools

## Verification Steps

To confirm actual unused status:

1. **Run build** - Build process will fail if truly unused files are imported
2. **Check dynamic imports** - Search for `import()`, `require()`, or string-based imports  
3. **Router configuration** - Verify page components are in routing table
4. **Template systems** - Check if templates are loaded from arrays/objects
5. **Test flows** - Navigate through app to see which components load

## Files Safe to Remove (After Verification)

Based on the project documentation mentioning duplicate tooltips:

- `client/src/components/WineTastingTooltip.tsx`
- Any references to `WineTermText` helper

All other "unused" files should be verified before removal, as they're likely false positives from static analysis limitations.