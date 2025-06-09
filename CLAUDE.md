# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

```bash
# Development
npm run dev              # Start development server (Vite + Express)

# Building & Production
npm run build           # Build for production
npm start              # Run production server

# Database
npm run db:push        # Push schema changes to database

# Type Checking
npm run check          # Run TypeScript type checking
```

## Phase I: High-Level Architecture & Data Flow

### Tech Stack:
- **Backend**: Node.js with an Express server, executed via tsx.
- **Database**: PostgreSQL, with Drizzle ORM for schema and queries. Migrations are managed by drizzle-kit.
- **Frontend**: React with Vite as the build tool.
- **Routing**: wouter for client-side routing.
- **Data Fetching/State**: @tanstack/react-query is the primary mechanism for server data fetching and caching. Client-side state is managed with React Context (GlossaryContext, etc.) and component-level state (useState).
- **UI & Animation**: A custom component library built on shadcn/ui (using Radix UI primitives) and styled with tailwindcss. Animations are heavily powered by framer-motion.
### Data Schemas (shared/schema.ts)
This is the heart of the application. The schema is well-defined and establishes clear relationships:
sommeliers -> packages -> packageWines -> slides
sessions are created from a package.
participants join a session.
responses belong to a participant and a slide.
glossaryTerms, wineCharacteristics, and slideTemplates are global resources.
The recent addition of sessionWineSelections allows hosts to customize which wines from a package are active in a specific session.
Authentication: The schema includes a sommeliers table with a passwordHash, but the provided code doesn't show a full login implementation. The participant flow is based on a session code and a user-provided display name, not a formal login.
Phase II: Backend & Server-Side Logic (server/)
API Endpoints (server/routes.ts): The API is RESTful and well-organized. Key routes include:
/api/packages/...: For fetching and managing wine packages. Crucially, /api/packages/:code/editor provides all data needed for the editor UI in one call.
/api/sessions/...: For creating, getting status, and managing participants of a live session.
/api/slides/...: For CRUD operations on slides within a wine.
/api/responses: For submitting participant answers.
/api/glossary: For fetching the wine terminology.
Database Interaction (server/storage.ts): This is the most critical backend file. It acts as a comprehensive data access layer (DAL).
It correctly abstracts all Drizzle ORM queries into semantic functions like getPackageByCode or createParticipant.
The initializeWineTastingData function seeds the database with initial content, which is great for development but was a source of bugs in the past (as noted in the Replit log).
The new getAggregatedSessionAnalytics function is the powerhouse for the Host Dashboard, calculating response distributions and stats on the fly.
Phase III: Comprehensive Frontend Analysis & User Flows
This section details how the different parts of the app function, connecting the code to the user experience.
1. The Sommelier's Workflow: Creating Content (SommelierDashboard.tsx, PackageEditor.tsx)
How it Works: The SommelierDashboard is the main entry point. It's a tabbed interface showing "Packages," "Sessions," and "Analytics."
Package Management: A sommelier can create a new package (PackageModal), which triggers a POST /api/packages call. The backend generates a unique code for it.
Wine Management: Within an expanded package view, they can add a wine (WineModal), which triggers POST /api/wines. They can also edit or delete existing wines.
Slide Editing: The most complex part is the PackageEditor.tsx. It's a dedicated page for arranging and editing the slides for all wines in a package.
It fetches all package data via GET /api/packages/:code/editor.
The left sidebar lists wines, which can be expanded to show the slides for that wine, grouped by section_type (Intro, Deep Dive, Ending).
Clicking a slide sets it as activeSlideId, which is passed to SlideConfigPanel.tsx.
SlideConfigPanel.tsx renders the appropriate form (QuestionConfigForm.tsx, etc.) to edit the slide's payloadJson. Saving triggers a PATCH /api/slides/:id request.
A "Template Library" is available to quickly add new, pre-configured slides to a wine.
2. The Host's Workflow: Starting a Session (Gateway.tsx, HostDashboard.tsx)
How it Works:
Gateway: A user selects "Host Session" on the Gateway.tsx page.
Input: They enter their name and a packageCode.
Creation: This triggers a POST /api/sessions request with createHost: true. The backend creates a new session and a participant record with isHost: true.
Redirection: The host is redirected to the HostDashboard.tsx page.
Management: The HostDashboard provides a real-time view of the session.
It fetches session and participant data every few seconds.
It provides controls to Start, Pause, and Reset the session via PATCH /api/sessions/:sessionId/status.
It displays a QR code and link for participants to join.
It includes the SessionWineSelector.tsx component, allowing the host to choose which wines from the package to include in this specific session. This is a powerful new feature.
The "Analytics" tab uses the GET /api/sessions/:sessionId/analytics endpoint to show real-time response data.
3. The Participant's Workflow: Joining and Tasting (Gateway.tsx, TastingSession.tsx)
How it Works:
Gateway: A user selects "Join Session" on Gateway.tsx.
Joining: They enter a short_code for the session. This navigates them to SessionJoin.tsx.
Registration: On SessionJoin.tsx, they enter their name and email. Submitting this form calls POST /api/sessions/:sessionId/participants to create their participant record.
Tasting: They are redirected to TastingSession.tsx, the core of the user experience.
Data Fetching: It fetches all slides for the session's package via /api/packages/:packageCode/slides?participantId=....
Slide Rendering: The renderSlideContent function uses a switch on currentSlide.type to render the correct question component (e.g., MultipleChoiceQuestion).
Answering: When a user interacts with a question component, its onChange handler updates the answers state in TastingSession.tsx. A useEffect hook then calls the saveResponse function from the useSessionPersistence hook. This function sends the answer to POST /api/responses and handles offline storage.
Navigation: The "Next" and "Previous" buttons increment/decrement currentSlideIndex. The logic correctly handles isTransitioningSection to show the WineTransition.tsx component when moving between wines.
Completion: When the final slide is completed, the handleComplete function navigates the user to the TastingCompletion.tsx page.
Adam's To-Do List: Analysis & Strategic Plan
Here is a granular analysis of Adam's to-do list, framed by the problems we need to solve and a plan to execute them using the existing codebase.
Group 1: Live Session Enhancements (TastingSession.tsx)
Problem: "Make sections clickable."
Root Cause: The SegmentedProgressBar.tsx component is correctly calculating and displaying progress for the "Intro," "Deep Dive," and "Ending" sections. However, the onClick handler is not fully implemented in the parent TastingSession.tsx to navigate.
Action Plan:
In TastingSession.tsx, create a handleSectionClick(sectionName: string) function.
Inside this function, determine the index of the first slide that belongs to the clicked sectionName. You can reuse the logic already in the component that calculates section progress.
Call jumpToSlide(firstSlideIndex) with the calculated index.
Pass this handleSectionClick function as the onSectionClick prop to the <SegmentedProgressBar /> component.
Problem: "Add summary to end."
Root Cause: The TastingCompletion.tsx page is a static "thank you" screen. It doesn't fetch or display any results from the session. The useSessionPersistence hook correctly ends the local session, but no data is fetched for a summary.
Action Plan:
Enhance API: Modify the /api/sessions/:sessionId/analytics endpoint in server/routes.ts and storage.ts to also be callable by a regular participant (not just a host) after the session is complete. It should return a summary of their own answers compared to the group average or expert notes.
Update Component: Modify TastingCompletion.tsx. Use useQuery to call the analytics endpoint.
Build UI: Create components to visualize the summary data (e.g., a list of questions, user's answer vs. most common answer). The ImmediateFeedback.tsx component is a great starting point for this UI.
Problem: "Make more pages and get them aligned with their Airtable questions."
Root Cause: This is a content workflow problem. Manually creating slides from an Airtable is inefficient.
Action Plan: This is a high-impact automation task.
Create a Script: Develop a new script, e.g., scripts/sync-airtable.ts.
Use Airtable API: In the script, use the Airtable API to fetch all records from the question base.
Transform Data: Write a function to map the Airtable fields to the InsertSlide and InsertPackageWine schemas defined in shared/schema.ts.
Seed the Database: The script will connect to the database (re-using server/db.ts) and use the Drizzle ORM to insert or update the packages, packageWines, and slides tables. This script would replace the hardcoded initializeWineTastingData function in storage.ts.
Problem: "Get the tips in the right places... get rid of pop up one."
Root Cause: There are two competing tooltip systems.
System A (Correct): GlossaryContext.tsx provides terms to DynamicTextRenderer.tsx, which automatically finds and wraps terms in text with a pop-up definition. This is used in MultipleChoiceQuestion.tsx.
System B (Redundant): WineTastingTooltip.tsx and its helper WineTermText are a separate, hard-coded system used in EnhancedMultipleChoice.tsx. This is likely the "pink one" or "pop up one" that needs to be removed.
Action Plan:
Standardize: Go into EnhancedMultipleChoice.tsx and any other component using WineTermText or WineTastingTooltip.
Replace: Replace all instances of <WineTermText>{...} with <DynamicTextRenderer text={...} />.
Delete: Delete the client/src/components/WineTastingTooltip.tsx file entirely to enforce the use of the single, correct system.
Align: Ensure all question titles and descriptions in the Airtable (and thus, the database) use the exact phrasing of the terms defined in server/storage.ts's initializeGlossaryTerms function so they are automatically highlighted.
Group 2: Package Editor Overhaul (PackageEditor.tsx)
Problem: "Make the slides visible in the sidebar so we can click them... make it easier to arrange them."
Root Cause: The PackageEditor.tsx sidebar currently shows wines, and slides are nested inside. This is not ideal for re-ordering slides between different wines or visualizing the entire flow. It lacks drag-and-drop functionality.
Action Plan:
Integrate DnD: Use the @dnd-kit/core and @dnd-kit/sortable packages (already in package.json).
Refactor Sidebar: Change the sidebar to be a single, unified list of all slides, visually grouped by wine (e.g., with a wine header). Each slide should be a SortableItem.
Implement onDragEnd: When a drag-and-drop operation finishes, get the new order of slides. This will likely involve changing a slide's position and potentially its packageWineId if it was moved to a different wine section.
API Call: Create a new API endpoint, e.g., PUT /api/slides/order, that accepts an array of { slideId, newPosition, newPackageWineId } objects. The backend will process this in a single database transaction to update all slides at once.
Problem: "Add a transition card or slide that we can edit."
Root Cause: The transition slide type was added to the schema but the editor UI is incomplete. The TransitionSlideEditor in SlideEditor.tsx is very basic.
Action Plan (Building on Adam's co-dev's work):
Enhance TransitionSlideEditor: In SlideEditor.tsx, add form fields to the TransitionSlideEditor component for title, description, duration, and animation_type.
Improve WineTransition.tsx: Modify the WineTransition.tsx component to accept and display this title and description over the animation.
Add More Animations: In WineTransition.tsx, add logic to render different SVG animations based on the animation_type prop (e.g., 'fade', 'slide'). You can find great animation examples in lib/modern-animations.ts.
Problem: "Make the previews work again."
Root Cause: The SlidePreviewPanel.tsx is a "dead" preview. It renders a simplified, static representation of the slide. It does not use the real slide components or reflect live changes from the editor form.
Action Plan:
Live State: The SlideConfigPanel.tsx (the editor form) needs to pass its live, unsaved state to the SlidePreviewPanel.tsx.
Refactor SlidePreviewPanel.tsx: Gut the current static preview logic. Instead, create a switch statement based on activeSlide.type.
Render Real Components: Inside the switch, render the actual question components (MultipleChoiceQuestion, ScaleQuestion, etc.), passing the live form data as props. This will create a 100% accurate preview.
Performance: To prevent re-rendering on every keystroke, wrap the state update that triggers the preview re-render in a debounce function (you can create a simple useDebounce hook).

---

# Recent Major Implementation: Media Upload System

## Video and Audio Message Slides (✅ Completed)

Successfully implemented a comprehensive media upload system for sommeliers to include personal video and audio messages in their wine tasting experiences.

### Key Components Added:
- **Video/Audio Slide Types**: Added `video_message` and `audio_message` to slide types in schema
- **Media Upload Infrastructure**: 
  - Supabase Storage integration for media files (`server/supabase-storage.ts`)
  - Universal MediaUpload component with drag & drop (`client/src/components/ui/media-upload.tsx`)
  - Server-side upload endpoints (`/api/upload/media`)
- **Media Players**: 
  - Custom VideoPlayer with wine-themed controls (`client/src/components/ui/video-player.tsx`)
  - AudioPlayer with waveform visualization (`client/src/components/ui/audio-player.tsx`)
- **Content Creation**:
  - Updated QuickQuestionBuilder to include video/audio message options
  - Added 6 media message templates to question template library
  - Live preview support for media slides in editor
- **Slide Rendering**: 
  - VideoMessageSlide and AudioMessageSlide components for TastingSession
  - Integrated into TastingSession renderSlideContent function

### Technical Architecture:
- **Storage**: Uses Supabase Storage for media files (not Supabase SDK for database)
- **Database**: PostgreSQL connection via `postgres` library + Drizzle ORM (existing pattern)
- **Validation**: File type, size limits, and progress tracking
- **UI**: Consistent with existing wine-themed design language

### Usage:
Sommeliers can now add personal video welcomes, wine introduction videos, tasting technique demonstrations, audio stories about vineyards, and encouragement messages throughout their tasting packages.

### Environment Setup:
- **Required**: `DATABASE_URL` for PostgreSQL connection
- **Optional**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE` for media uploads
- **Graceful Degradation**: If Supabase variables are not set, the server starts normally but media upload features are disabled with user-friendly error messages

# Current Development Focus (Updated)

Based on the "Know Your Grape" project brief, our immediate priorities are:

## Primary Goals
1. **Seamless Multi-Wine Experience**: Ensure tasting flows perfectly between wines with replicable structure
2. **Dynamic Content Creation**: Template-based slide system for easy content management  
3. **UI/UX Polish**: Consistent tooltip system and live preview in editor

## Active Tasks (See TODO_DEVELOPMENT_PLAN.md)

### Group 1: Session Flow & Content Architecture
- **Task 1.1**: Verify/Fix multi-wine flow continuity
- **Task 1.2**: Implement dynamic slide template system
- **Task 1.3**: Consolidate tooltip UI (info panel only, no popups)

### Group 2: Host & Editor Experience
- **Task 2.1**: Complete host wine selection integration  
- **Task 2.2**: Implement true live preview with real components

## Key Implementation Notes

1. **Tooltip System**: Standardize on info panel (MultipleChoiceQuestion style), remove DynamicTextRenderer popups
2. **Wine Selection**: SessionWineSelector exists but needs HostDashboard integration
3. **Templates**: Centralize in wineTemplates.ts, add UI selector in PackageEditor
4. **Live Preview**: Lift state to parent, render actual question components

## Development Approach
- Start with Task 1.3 (tooltip consolidation) - clearest requirements
- Then Task 2.1 (wine selection) - component ready, needs wiring  
- Follow with template system and live preview
- Verify multi-wine flow issue before implementing fixes

# Initial Task
Please analyze the entire repository structure, understand how it works, review all key files, and provide a comprehensive assessment of the codebase architecture and functionality.
