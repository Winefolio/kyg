# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

```bash
npm run dev          # Start dev server (Express serves Vite, default port 5000)
npm run build        # Build for production (vite build + esbuild server)
npm start            # Run production server
npm run db:push      # Push schema changes to database (Drizzle)
npm run check        # TypeScript type checking
```

Note: Dev server runs Express which serves the Vite frontend. Port can be overridden with `PORT` env var.

## Architecture Overview

**Cata** is a wine tasting education platform with two main experiences:

1. **Live Sessions**: Host-led group tastings with real-time participant responses
2. **Solo Tastings**: Self-guided tastings via Learning Journeys or ad-hoc wines

### Tech Stack
- **Backend**: Express + TypeScript (tsx), PostgreSQL with Drizzle ORM
- **Frontend**: React + Vite, wouter routing, TanStack Query, Tailwind + shadcn/ui + Framer Motion
- **AI**: OpenAI GPT-5 family for wine intelligence, Whisper for transcription

### Key Directories
```
server/
├── routes.ts          # Main API routes (large file, ~2200 lines)
├── routes/            # Modular route files (auth, dashboard, journeys, tastings, wines, transcription)
├── services/          # Business logic (questionGenerator, wineValidation)
├── storage.ts         # Data access layer - all Drizzle queries
├── wine-intelligence.ts # GPT-powered wine characteristics lookup
└── openai-client.ts   # Sentiment analysis, summaries

client/src/
├── pages/             # Route components (Gateway, TastingSession, UserDashboard, etc.)
├── components/
│   ├── questions/     # Question type components (MultipleChoice, Scale, Text, etc.)
│   └── ui/            # shadcn/ui components + custom (video-player, audio-player, etc.)
├── hooks/             # Custom hooks (useAuth, useAudioRecorder, useHaptics, etc.)
└── contexts/          # React contexts (GlossaryContext)

shared/
└── schema.ts          # Drizzle schema - single source of truth for all tables
```

### Data Flow
```
Users/Journeys → Solo Tastings → Wine Intelligence (GPT) → User Dashboard/Preferences
Packages → Sessions → Participants → Responses → Analytics
```

### Database Schema (shared/schema.ts)
Core tables: `users`, `journeys`, `chapters`, `tastings`, `packages`, `packageWines`, `slides`, `sessions`, `participants`, `responses`

Support tables: `glossaryTerms`, `wineCharacteristicsCache`, `userJourneys`

## Key Patterns

### Authentication
- Session-based auth via express-session
- Client hook `useAuth.ts` syncs localStorage with server session
- `requireAuth` middleware in `server/routes/auth.ts`

### OpenAI Integration
- **Always use latest models**: `gpt-5.2` for complex reasoning (wine profiles, vision, AI question generation)
- **Mini models for simple tasks**: `gpt-5-mini` for straightforward tasks (characteristics lookup, sentiment analysis)
- Use `max_completion_tokens` (not `max_tokens`) for GPT-5 models
- Whisper API for audio transcription (`/api/transcribe`)

### Question Components
All question types in `client/src/components/questions/`:
- Receive `question` config and `value`/`onChange` props
- Support glossary term highlighting via `DynamicTextRenderer`
- Include optional audio recording button (TextQuestion)

### API Conventions
- RESTful routes under `/api/`
- Solo tasting routes: `/api/solo/tastings`, `/api/solo/wines`, `/api/solo/preferences`
- Journey routes: `/api/journeys`, `/api/journeys/:id/chapters/:chapterId/complete`
- Dashboard: `/api/dashboard/:email`

## Deployment

- **Platform**: Railway
- **Production URL**: https://cata-production.up.railway.app
- **Deploy trigger**: Push to `main` branch auto-deploys
- **Config**: `railway.json` in repo root

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For wine intelligence and transcription

Optional:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` - For media uploads
- `SESSION_SECRET` - For production session encryption

## Planning & Documentation

- `PRODUCT_ROADMAP.md` - Prioritized future features
- `PIVOT_RELEASE_NOTES.md` - Current release overview and testing guide
- `FEATURE_BACKLOG.md` - Deprioritized features and ideas
- `plans/` - Detailed feature specifications
