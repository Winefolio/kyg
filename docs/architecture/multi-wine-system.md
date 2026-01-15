# Multi-Wine System Architecture

## Overview

The wine tasting platform has been migrated from a single-wine per package system to a multi-wine architecture that supports packages containing multiple wines, each with their own set of tasting slides.

## Database Schema

### Core Entities

```
packages
├── id (UUID, PK)
├── code (VARCHAR, UNIQUE)
├── name (TEXT)
├── description (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

package_wines
├── id (UUID, PK)
├── package_id (UUID, FK → packages.id)
├── position (INTEGER)
├── wine_name (TEXT)
├── wine_description (TEXT)
├── wine_image_url (TEXT)
├── created_at (TIMESTAMP)
└── UNIQUE(package_id, position)

slides
├── id (UUID, PK)
├── package_wine_id (UUID, FK → package_wines.id)
├── position (INTEGER)
├── type (VARCHAR) // 'question', 'media', 'interlude', 'video_message', 'audio_message'
├── section_type (VARCHAR) // 'intro', 'deep_dive', 'ending'
├── payload_json (JSONB)
└── created_at (TIMESTAMP)
```

## Data Flow

### 1. Package Creation
1. Create base package with code and metadata
2. Add multiple wines to package with positions
3. Create slide templates for each wine
4. Each wine gets identical question sets but with wine-specific context

### 2. Session Flow
1. Host selects package and wines to include
2. Session created with selected wine subset
3. Participants progress through wines sequentially
4. Transition slides between wines provide context
5. Analytics track responses per wine

### 3. API Structure

```typescript
GET /api/packages/:code/slides
// Returns slides organized by wine with wine context
{
  slides: [
    {
      ...slideData,
      wineInfo: {
        id: string,
        wineName: string,
        wineDescription: string,
        wineImageUrl: string,
        position: number
      }
    }
  ],
  wines: PackageWine[],
  totalCount: number
}
```

## Current Implementation Status

### ✅ Completed
- Database schema migration
- Core storage methods (createPackageWine, getPackageWines, getSlidesByPackageWineId)
- API route updates for multi-wine support
- Wine context injection in slide responses

### 🔄 In Progress
- Data seeding with proper multi-wine packages
- Frontend components adaptation
- Analytics system updates

### ❌ Pending
- Host wine selection interface
- Wine transition slides
- Advanced package management
- Question editing system

## Key Design Decisions

1. **Wine Position System**: Each wine has a position within the package for ordering
2. **Slide Duplication**: Each wine gets its own set of slides for independent analytics
3. **Context Injection**: Wine information is added to slides at runtime
4. **Backward Compatibility**: API maintains similar structure while adding wine context
5. **Flexible Selection**: Hosts can choose subset of wines from packages