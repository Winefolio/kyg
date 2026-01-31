# P2-002: Admin Routes Missing Authentication

## Priority: HIGH (P2)
## Status: Open
## Category: Security

## Summary
Admin-only routes for managing journeys, packages, and sessions lack proper authentication middleware.

## Affected Files
- `server/routes.ts` (admin endpoints)
- `server/routes/journeys.ts`

## Vulnerable Endpoints
- POST `/api/journeys` - Create journey (should be admin-only)
- PUT `/api/journeys/:id` - Update journey
- DELETE `/api/journeys/:id` - Delete journey
- POST `/api/packages` - Create package
- Various session management endpoints

## Fix Required

### 1. Create admin middleware
```typescript
// server/middleware/admin.ts
export const requireAdmin = async (req, res, next) => {
  const user = req.session?.user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

### 2. Apply to routes
```typescript
import { requireAdmin } from './middleware/admin';

router.post('/api/journeys', requireAuth, requireAdmin, async (req, res) => {
  // ...
});
```

## Risk if Not Fixed
- Any authenticated user can create/modify journeys
- Content can be vandalized or deleted
- Business logic bypassed

## Found By
Architecture Strategist Agent, Security Sentinel Agent
