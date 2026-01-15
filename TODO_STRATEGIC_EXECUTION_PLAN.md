# Know Your Grape - Strategic Execution Plan (FINAL)

## 🔍 Critical Analysis Summary

After deep investigation, I've identified the **exact root causes** of the issues:

### Issue 1: Template Payload Structure Mismatch ⚠️ CRITICAL
**Problem**: There's a mismatch between payload property names in templates vs. what the editor expects:

**Templates use**:
- `question_type` (underscore)
- `scale_min`, `scale_max` (underscore)  
- `scale_min_label`, `scale_max_label` (different naming)

**Editor expects**:
- `questionType` (camelCase)
- `scaleMin`, `scaleMax` (camelCase)
- `scaleLabels` (array format)

**Result**: When templates are copied to `payloadJson`, the editor form can't read the properties correctly because of naming mismatches.

### Issue 2: Conflicting Template Sources 🔄
**Problem**: Two different template systems exist:
1. `SlideEditor.tsx` - Lines 87-200+ (comprehensive templates with correct payload structure)
2. `wineTemplates.ts` - Lines 3-125 (simplified templates with incorrect property names)

The editor is using the **wrong template source** (wineTemplates.ts) which has incomplete payloads.

### Issue 3: Missing Scale Label Handling 📊
**Problem**: Scale questions need `scaleLabels` as an array `["Low", "High"]`, but templates provide separate `scale_min_label` and `scale_max_label` properties.

---

## 🎯 STRATEGIC EXECUTION PLAN

### PHASE 1: CRITICAL FIXES (Priority 1) 🚨

#### Task 1.1: Fix Template Payload Structure 
**Estimated Time**: 30 minutes
**Impact**: HIGH - Fixes all "blank slide" issues

**Action Steps**:
1. **Update wineTemplates.ts** to use correct property names:
   ```typescript
   // BEFORE (broken):
   payloadTemplate: {
     question_type: 'scale',
     scale_min: 1,
     scale_max: 10,
     scale_min_label: 'Low',
     scale_max_label: 'High'
   }

   // AFTER (fixed):
   payloadTemplate: {
     questionType: 'scale',  // camelCase
     scaleMin: 1,           // camelCase
     scaleMax: 10,          // camelCase
     scaleLabels: ['Low', 'High']  // array format
   }
   ```

2. **Add missing required fields** to all templates:
   - `question` property for question text
   - `description` property for subtitle
   - Complete `options` arrays for multiple choice
   - All timing/scoring properties

3. **Verify template completeness** by comparing with working examples in SlideEditor.tsx

#### Task 1.2: Unify Template Sources
**Estimated Time**: 45 minutes  
**Impact**: HIGH - Eliminates confusion and duplication

**Action Steps**:
1. **Consolidate into single source**: Move all quality templates from SlideEditor.tsx into wineTemplates.ts
2. **Update SlideEditor.tsx** to import templates from wineTemplates.ts
3. **Remove duplicate template definitions** from SlideEditor.tsx
4. **Ensure all UI dropdown/library selections** use the unified templates

#### Task 1.3: Fix Form Field Data Binding
**Estimated Time**: 15 minutes
**Impact**: HIGH - Ensures editor shows correct form fields

**Action Steps**:
1. **Verify QuestionSlideEditor** correctly reads `payload.questionType`
2. **Add missing scaleLabels fields** for scale questions:
   ```typescript
   {payload.questionType === 'scale' && (
     <>
       {/* Existing scaleMin/scaleMax inputs */}
       <div className="grid grid-cols-2 gap-4">
         <div>
           <Label className="text-white">Low Label</Label>
           <Input
             value={payload.scaleLabels?.[0] || ''}
             onChange={(e) => {
               const labels = [...(payload.scaleLabels || ['', ''])];
               labels[0] = e.target.value;
               updatePayload({ scaleLabels: labels });
             }}
             className="bg-white/10 border-white/20 text-white mt-2"
           />
         </div>
         <div>
           <Label className="text-white">High Label</Label>
           <Input
             value={payload.scaleLabels?.[1] || ''}
             onChange={(e) => {
               const labels = [...(payload.scaleLabels || ['', ''])];
               labels[1] = e.target.value;
               updatePayload({ scaleLabels: labels });
             }}
             className="bg-white/10 border-white/20 text-white mt-2"
           />
         </div>
       </div>
     </>
   )}
   ```

---

### PHASE 2: UX IMPROVEMENTS (Priority 2) 🎨

#### Task 2.1: Consolidate Tooltip System
**Estimated Time**: 1 hour
**Impact**: MEDIUM - Improves consistency

**Action Steps**:
1. **Modify DynamicTextRenderer.tsx**: Remove onClick, keep visual highlighting
2. **Create HelpfulTermsPanel.tsx**: Extract from MultipleChoiceQuestion.tsx  
3. **Deploy to all question components**: Consistent info icon behavior

#### Task 2.2: Integrate Wine Selection UI
**Estimated Time**: 45 minutes
**Impact**: HIGH - Critical host feature

**Action Steps**:
1. **Add to HostDashboard.tsx**:
   ```typescript
   import { SessionWineSelector } from '@/components/SessionWineSelector';
   
   // In render:
   <SessionWineSelector 
     sessionId={sessionId}
     packageId={session?.packageCode}
     onSelectionChange={setSelectedWineCount}
   />
   ```

2. **Update slide fetching logic** to respect wine selections in TastingSession.tsx

---

### PHASE 3: ADVANCED FEATURES (Priority 3) ⚡

#### Task 3.1: Live Preview Implementation
**Estimated Time**: 2 hours
**Impact**: HIGH - Major editor improvement

**Action Steps**:
1. **Lift state in PackageEditor.tsx**
2. **Refactor SlidePreviewPanel.tsx** to render real components
3. **Add debounced form updates** for performance

#### Task 3.2: Enhanced Template System  
**Estimated Time**: 1.5 hours
**Impact**: MEDIUM - Content creator efficiency

**Action Steps**:
1. **Add template categorization** (intro/deep_dive/ending)
2. **Improve template selection UI** with icons and descriptions
3. **Add template search/filter** functionality

---

## 🚀 IMMEDIATE ACTION ITEMS

### CRITICAL PATH (Do First):
1. ✅ **Fix wineTemplates.ts payload structure** - This will immediately resolve blank slides
2. ✅ **Add missing scaleLabels form fields** - This will make scale questions fully editable
3. ✅ **Test with "Acidity Level" template** - Verify complete fix

### SUCCESS METRICS:
- [ ] Create "Acidity Level" slide from template
- [ ] Slide shows complete form in editor (scaleMin, scaleMax, scaleLabels)
- [ ] Slide renders correctly for participants in TastingSession
- [ ] All form fields save properly to database

---

## 📋 DETAILED FILE CHANGES

### Files to Modify (Priority Order):

1. **`client/src/lib/wineTemplates.ts`** - Fix payload structure (CRITICAL)
2. **`client/src/components/SlideEditor.tsx`** - Add scaleLabels form fields  
3. **`client/src/components/ui/DynamicTextRenderer.tsx`** - Remove click behavior
4. **`client/src/pages/HostDashboard.tsx`** - Integrate wine selector
5. **`client/src/components/editor/SlidePreviewPanel.tsx`** - Live preview

### Database Verification Steps:
After each fix, verify in Supabase that new slides have:
- Correct `payload_json` structure
- All required properties (questionType, scaleMin, scaleMax, scaleLabels)
- Matching property names with editor expectations

---

## ⚠️ CRITICAL DISCOVERY

The **addSlideFromTemplate function is actually working correctly** - it copies the full `template.payloadTemplate`. The issue is that the **templates themselves have wrong property names** and **incomplete data**.

This explains why:
- ✅ Slides are created in database
- ❌ Editor forms appear empty (can't read questionType due to question_type naming)
- ❌ Participant view shows blank slides (same naming issue)

**Fix the templates = Fix everything!**

---

## 🎯 EXECUTION APPROACH

**Start with Phase 1, Task 1.1** - This single fix will resolve the majority of issues immediately. The other tasks are improvements and feature completions.

Ready to execute? Let's begin with fixing the template payload structure in wineTemplates.ts!