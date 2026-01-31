# P3-007: God Function in registerTastingsRoutes

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality

## Summary
The `registerTastingsRoutes` function is 340+ lines with 9 endpoints, multiple responsibilities, and nested business logic. This violates Single Responsibility Principle and makes testing difficult.

## Affected Files
- `server/routes/tastings.ts` (entire file, ~615 lines)

## Current Structure
```typescript
export function registerTastingsRoutes(app: Express): void {
  // 340+ lines of:
  // - Route definitions
  // - Request validation
  // - Business logic
  // - Database queries
  // - Error handling
  // - Background job dispatching
}
```

## Recommended Refactoring

### 1. Extract Route Handlers
```typescript
// server/routes/tastings/handlers.ts
export async function createTasting(req: Request, res: Response) { ... }
export async function getTasting(req: Request, res: Response) { ... }
export async function updateTasting(req: Request, res: Response) { ... }
```

### 2. Extract Business Logic to Service
```typescript
// server/services/tastingService.ts
export class TastingService {
  async createTasting(userId: number, data: CreateTastingInput): Promise<Tasting> {
    // Business logic here
  }

  async completeTasting(tastingId: number): Promise<CompletionResult> {
    // Level-up logic, stats update, etc.
  }
}
```

### 3. Clean Route Registration
```typescript
// server/routes/tastings/index.ts
export function registerTastingsRoutes(app: Express): void {
  app.post('/api/solo/tastings', requireAuth, createTasting);
  app.get('/api/solo/tastings/:id', requireAuth, getTasting);
  app.patch('/api/solo/tastings/:id', requireAuth, updateTasting);
  // ...
}
```

## Benefits
- Easier unit testing of business logic
- Clearer separation of concerns
- Smaller, focused files
- Reusable service layer

## LOC Reduction Potential
- Current: ~615 lines in one file
- After: ~100 lines in routes, ~300 in service, ~100 in handlers

## Found By
Pattern Recognition Specialist Agent
