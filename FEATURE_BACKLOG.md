# Feature Backlog & Ideas

This file tracks features that have been deprioritized, cut from reviews, or are brainstormed ideas for future consideration.

---

## Backlog Items

### Journey Recommendation Questionnaire
**Status**: Backlog
**Priority**: Medium
**Source**: User brainstorm (2025-01-15)

**Description**: Create an onboarding questionnaire that helps users discover which learning journeys are best suited for them.

**Proposed Flow**:
1. User starts "Find Your Journey" flow
2. Answer 5-8 preference questions:
   - What wines do you typically enjoy? (red/white/sparkling/etc.)
   - How would you rate your wine knowledge? (beginner/intermediate/advanced)
   - What's your primary goal? (learn basics/explore regions/refine palate/social confidence)
   - How much time can you dedicate? (1 wine/week, 2-3/week, daily)
   - Budget per bottle? ($10-15, $15-30, $30+)
   - Do you have wine storage/cellar access?
3. Algorithm recommends 1-3 journeys based on answers
4. Show match percentage and why each journey fits

**Technical Notes**:
- Could reuse existing question components from tasting flow
- Store questionnaire answers in user profile for future recommendations
- Consider using AI to generate personalized journey order

---

### User Dashboard Redesign - Rich Wine Discovery Experience
**Status**: In Progress (Sprint 4.1)
**Priority**: High
**Source**: User request (2026-01-15)

**Update (2026-01-15)**: Phase 1 of this feature is now in progress as "Unified User Dashboard" in Sprint 4.1.
See `plans/feat-unified-dashboard.md` for detailed implementation plan.

**Phase 1 (Sprint 4.1 - In Progress)**: Unified Dashboard
- Merge solo + group tastings into single view at `/dashboard/:email`
- Add preference bars (sweetness, acidity, tannins, body)
- Source badges showing Solo vs Group for each tasting
- Email-only access (no auth required for now)

**Phase 2 (Future)**: Rich Discovery
- Personalized wine recommendations
- Taste profile visualization with radar chart
- Wine discovery feed
- Purchase integration
- Social features

---

**Original Description**: Complete redesign of the user dashboard to create a compelling, feature-rich experience that helps users discover and buy wines based on their taste profile.

**Proposed Features (deferred to Phase 2)**:
1. **Personalized Wine Recommendations**
   - AI-powered suggestions based on tasting history
   - "Wines You'll Love" section with match percentages
   - Filter by price, region, style, availability

2. **Taste Profile Visualization**
   - Interactive radar chart showing preference dimensions (sweetness, acidity, tannin, body)
   - How your palate compares to different wine regions/styles
   - Evolution of your palate over time

3. **Wine Discovery Feed**
   - Personalized feed of wines matching your profile
   - Quick "Want to Try" / "Not Interested" actions
   - Save wines to wishlist/shopping list

4. **Purchase Integration**
   - Direct links to buy recommended wines
   - Price comparison across retailers
   - "Find Near Me" for local availability
   - Integration with wine delivery services

5. **Social & Sharing**
   - Share your wine profile
   - See what similar palates are drinking
   - Follow sommeliers or wine enthusiasts

**Technical Notes**:
- Requires enhanced profile analysis (now using GPT-5.2)
- Consider affiliate/partnership integrations for purchases
- Mobile-first design for in-store usage
- May need wine inventory database or API integration

---

### QuickQuestionBuilder Component (Live Session Editor)
**Status**: Backlog
**Priority**: Low (deprioritized with solo tasting pivot)
**Source**: GENERIC_QUESTIONS_IMPLEMENTATION_PLAN.md

**Description**: Streamlined modal for creating tasting questions with visual type selector, live preview, smart defaults, and template gallery.

**Features**:
- Card-based question type selection (Multiple Choice, Scale, Text, Boolean, Media)
- Real-time preview using actual question components
- Context-aware suggestions based on wine type and section
- One-click template insertion

---

### Template Gallery with Filtering
**Status**: Backlog
**Priority**: Low
**Source**: GENERIC_QUESTIONS_TODO.md

**Description**: Browsable gallery of question templates with filtering by category (flavor, structure, overall), difficulty level, and estimated time.

---

### Live Preview in Package Editor
**Status**: Backlog
**Priority**: Low
**Source**: TODO_DEVELOPMENT_PLAN.md

**Description**: Replace static preview in SlidePreviewPanel with actual question components. Includes debounced form updates for performance.

---

### Section Navigation (Clickable Progress Bar)
**Status**: Backlog
**Priority**: Low
**Source**: TODO_DEVELOPMENT_PLAN.md

**Description**: Allow participants to click on sections in the progress bar to navigate directly to that section. Currently shows progress but doesn't allow jumping.

---

### Host Wine Selection Integration
**Status**: Backlog
**Priority**: Low
**Source**: TODO_DEVELOPMENT_PLAN.md

**Description**: SessionWineSelector component exists and is complete, but not integrated into HostDashboard. Allows hosts to select/reorder which wines from a package to include in a specific session.

---

### Tooltip System Consolidation (HelpfulTermsPanel)
**Status**: Backlog
**Priority**: Low
**Source**: TODO_DEVELOPMENT_PLAN.md

**Description**: Two tooltip systems exist. Consolidate to single approach: info panel in header (MultipleChoiceQuestion style) rather than popup on click.

---

### Slide Drag & Drop Reordering
**Status**: Backlog
**Priority**: Low
**Source**: WINE_TASTING_ISSUES_MASTER_PLAN.md

**Description**: Add drag handles to slides in editor sidebar. Allow reordering within and between sections. Uses @dnd-kit (already in package.json).

---

### Description Slide Typing Lag Fix
**Status**: Backlog
**Priority**: Medium
**Source**: WINE_TASTING_ISSUES_MASTER_PLAN.md

**Description**: Every keystroke triggers API call. Add debouncing and local state management to SlideConfigPanel. Show saving indicator.

---

### Package Editor Breadcrumb Navigation
**Status**: Backlog
**Priority**: Low
**Source**: WINE_TASTING_ISSUES_MASTER_PLAN.md

**Description**: Add breadcrumb showing: Wine Name > Section > Slide Position. Show active slide number. Improve visual hierarchy in sidebar.

---

### Package/Wine Image Display
**Status**: Backlog
**Priority**: Low
**Source**: WINE_TASTING_ISSUES_MASTER_PLAN.md

**Description**: Package imageUrl exists in schema but never displayed. Add to Gateway/SessionJoin pages. Show wine images in intro slides.

---

### Welcome Slide System
**Status**: Backlog
**Priority**: Low
**Source**: WINE_TASTING_ISSUES_MASTER_PLAN.md

**Description**: Dedicated package-level intro. Auto-create welcome slide when creating first wine. Pin welcome slides to top. Special styling/icon.

---

## Future Ideas (Not Yet Scoped)

### Wine Scanning / Label Recognition
Integrate camera-based wine label scanning to auto-fill wine information during solo tastings.

### Social Sharing
Allow users to share their tasting notes, journey progress, or wine discoveries on social media.

### Sommelier Matching
Connect users with real sommeliers for personalized recommendations based on their tasting history.

### Wine Pairing Suggestions
After a tasting, suggest food pairings based on the wine characteristics and user preferences.

### Tasting Calendar
Schedule upcoming tastings and get reminders for journey chapters.

### Achievement System / Gamification
Badges, streaks, and milestones to encourage consistent wine exploration.

### Group Journey Mode
Allow friends to do a journey together, comparing notes and preferences along the way.

### Wine Cellar Tracker
Integration with or building of a personal wine collection management feature.

### Autosave with Conflict Resolution
Editor improvements for collaborative editing scenarios.

### Undo/Redo Functionality
History management for package editing.

### Keyboard Shortcuts
Power user features for faster content creation.

### Bulk Operations
Duplicate, delete multiple slides at once.

### Version History for Packages
Track changes and allow rollback to previous versions.

### Collaborative Editing
Real-time multi-user package editing.

### Question Type Conversion
Right-click existing question, select "Convert to...", intelligent data mapping.

---

## Cut Features (From Reviews)

*None yet - add features here when they get cut from sprint reviews*

---

## How to Use This File

1. **Adding Ideas**: Just append to "Future Ideas" with a brief description
2. **Promoting to Backlog**: Move from "Future Ideas" to "Backlog Items" with full description, status, priority, and notes
3. **Cut Features**: When a feature gets cut during review, move it to "Cut Features" with the date and reason
4. **Implementing**: When starting work on a backlog item, remove it from here and add to sprint plan

---

## Source Documents
These planning docs contain more technical detail on backlog items:
- `TODO_DEVELOPMENT_PLAN.md` - Session flow & editor tasks
- `TODO_STRATEGIC_EXECUTION_PLAN.md` - Template system fixes
- `WINE_TASTING_ISSUES_MASTER_PLAN.md` - 9 original bug/feature reports
- `GENERIC_QUESTIONS_IMPLEMENTATION_PLAN.md` - Question builder system
- `GENERIC_QUESTIONS_TODO.md` - Detailed task breakdown

---

*Last updated: 2025-01-15*
