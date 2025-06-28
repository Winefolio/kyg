# KnowYourGrape Platform

## Overview

KnowYourGrape is an interactive wine-tasting platform that enables sommeliers to create educational wine packages and host live tasting sessions. The platform provides real-time participant interaction, comprehensive analytics, and a sophisticated content management system for wine education.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **Routing**: Wouter for client-side navigation
- **State Management**: React Context + @tanstack/react-query for server state
- **UI Components**: Custom component library built on shadcn/ui and Radix UI primitives
- **Styling**: TailwindCSS with custom design system
- **Animations**: Framer Motion for smooth transitions and interactions

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Execution**: tsx for TypeScript execution in development
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints with comprehensive error handling
- **Real-time Features**: Polling-based updates for session management

## Key Components

### Core Business Logic
1. **Package Management**: Wine packages containing multiple wines and educational content
2. **Session Management**: Live tasting sessions with real-time participant tracking
3. **Content Creation**: Sophisticated slide editor with template system
4. **Analytics**: Comprehensive response tracking and aggregation

### User Roles & Workflows
- **Sommeliers**: Create packages, manage content, host sessions, view analytics
- **Hosts**: Start sessions, control flow, view participant progress
- **Participants**: Join sessions via QR codes, answer questions, view results

### Database Schema
The application uses a streamlined 6-table schema:
- `sommeliers` → `packages` → `packageWines` → `slides`
- `sessions` → `participants` → `responses`
- Global resources: `glossaryTerms`, `wineCharacteristics`, `slideTemplates`

## Data Flow

### Package Creation Flow
1. Sommelier creates package with basic metadata
2. Adds wines to package with descriptions and images
3. Creates slides using template system or custom content
4. Organizes slides into sections (intro, deep dive, ending)
5. Publishes package for session use

### Session Flow
1. Host creates session from existing package
2. Participants join via short codes (6-character) or QR scanning
3. Real-time progression through wine tastings
4. Automatic data collection and analytics generation
5. Session summary and export capabilities

### Content Management
- Template-based slide creation with multiple question types
- Dynamic slide positioning with conflict resolution
- Section-based organization (intro → deep dive → ending)
- Wine-specific content with package-level introductions

## External Dependencies

### Production Dependencies
- **Database**: PostgreSQL (via @neondatabase/serverless)
- **ORM**: Drizzle with drizzle-kit for migrations
- **Authentication**: Basic session-based auth (no external providers)
- **File Storage**: Image uploads for wine photos and package assets
- **UI Library**: Radix UI primitives for accessibility
- **Query Client**: TanStack Query for server state management

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Production bundling
- **PostCSS**: CSS processing with Autoprefixer

## Deployment Strategy

### Build Process
- Frontend: Vite builds React app to static assets
- Backend: ESBuild bundles Node.js server with external packages
- Database: Drizzle migrations applied via `npm run db:push`

### Environment Configuration
- Development: `npm run dev` (tsx + Vite dev server)
- Production: `npm run build && npm start`
- Type Checking: `npm run check` for TypeScript validation

### Database Management
- Schema: Defined in `shared/schema.ts` (single source of truth)
- Migrations: Managed through Drizzle Kit
- Seeding: Automated wine data initialization for development

## Changelog

- June 28, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.