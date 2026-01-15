# Know Your Grape - Wine Tasting Platform

## Overview

Know Your Grape is a real-time, interactive wine-tasting platform that enables sommeliers to create tasting "packages" and guide participants through structured wine experiences. The platform consists of a content management system for sommeliers and an interactive session interface for participants.

## System Architecture

### Tech Stack
- **Backend**: Node.js with Express server, executed via tsx
- **Database**: PostgreSQL with Drizzle ORM for schema and queries
- **Frontend**: React with Vite as the build tool
- **Routing**: wouter for client-side routing
- **Data Fetching/State**: @tanstack/react-query for server data fetching and caching
- **UI & Animation**: Custom component library built on shadcn/ui (Radix UI primitives) styled with tailwindcss, animations powered by framer-motion

### Directory Structure
```
├── client/src/          # React frontend application
│   ├── components/      # UI components and forms
│   ├── pages/          # Main application pages
│   └── lib/            # Utilities and templates
├── server/             # Express backend server
│   ├── routes.ts       # API endpoints
│   └── storage.ts      # Database access layer
├── shared/             # Shared TypeScript schemas
└── migrations/         # Database migrations
```

## Key Components

### Database Schema (shared/schema.ts)
The core data relationships follow this hierarchy:
- `sommeliers` → `packages` → `packageWines` → `slides`
- `sessions` are created from a package
- `participants` join a session
- `responses` belong to a participant and a slide
- `sessionWineSelections` allow hosts to customize which wines are active in a session

### API Layer (server/routes.ts)
RESTful API with key endpoints:
- `/api/packages/*` - Package management and editor data
- `/api/sessions/*` - Session creation and participant management
- `/api/slides/*` - CRUD operations on slides within wines
- `/api/responses` - Participant answer submission
- `/api/glossary` - Wine terminology

### Data Access Layer (server/storage.ts)
Comprehensive database abstraction with semantic functions like `getPackageByCode`, `createParticipant`, and `getAggregatedSessionAnalytics` for the Host Dashboard.

## Data Flow

### Sommelier Workflow
1. **Package Creation**: Create wine packages through SommelierDashboard
2. **Wine Management**: Add wines to packages with detailed information
3. **Slide Creation**: Use PackageEditor to create and arrange slides using templates
4. **Session Management**: Create sessions from packages and customize wine selections

### Participant Workflow
1. **Gateway Entry**: Access via QR code or short session codes
2. **Session Join**: Enter name and join existing session
3. **Tasting Flow**: Progress through structured slides (intro → deep dive → ending)
4. **Response Submission**: Submit answers with automatic persistence

### Host Workflow
1. **Session Control**: Real-time participant monitoring and session controls
2. **Analytics**: Live response tracking and analysis
3. **Wine Selection**: Customize which package wines are included in session

## External Dependencies

### Core Libraries
- **@tanstack/react-query**: Server state management and caching
- **@dnd-kit**: Drag and drop functionality for slide reordering
- **framer-motion**: Animations and transitions
- **@radix-ui**: Accessible UI primitives
- **drizzle-orm**: Type-safe database ORM
- **wouter**: Lightweight React router

### Database
- PostgreSQL with connection pooling
- Drizzle migrations managed by drizzle-kit
- Optimized with indexes for performance

## Deployment Strategy

### Development
```bash
npm run dev     # Start development server (Vite + Express)
npm run check   # TypeScript type checking
npm run db:push # Push schema changes to database
```

### Production
```bash
npm run build   # Build for production
npm start       # Run production server
```

### Database Management
- Schema changes through Drizzle migrations
- Connection pooling configured for concurrent operations
- Indexes on frequently queried columns for performance

## Changelog
- June 29, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.