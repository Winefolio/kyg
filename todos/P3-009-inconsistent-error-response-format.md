# P3-009: Inconsistent Error Response Format

## Priority: MEDIUM (P3)
## Status: Open
## Category: Code Quality

## Summary
API error responses use inconsistent formats: some use `{ error: string }`, others use `{ message: string }`, and some include additional fields. This makes client-side error handling unreliable.

## Affected Files
- `server/routes/tastings.ts`
- `server/routes/auth.ts`
- `server/routes/wines.ts`
- `server/routes.ts`

## Current Inconsistencies
```typescript
// Pattern 1: { error: string }
return res.status(400).json({ error: "Wine name is required" });

// Pattern 2: { message: string }
return res.status(404).json({ message: "Tasting not found" });

// Pattern 3: { error: string, details: any }
return res.status(500).json({ error: "Failed", details: err.message });

// Pattern 4: Direct error object
return res.status(401).json(new Error("Unauthorized"));
```

## Fix Required

### 1. Define Standard Error Response
```typescript
// shared/types/api.ts
interface ApiError {
  error: {
    code: string;       // Machine-readable: 'NOT_FOUND', 'VALIDATION_ERROR'
    message: string;    // Human-readable description
    details?: unknown;  // Optional additional info
  };
}
```

### 2. Create Error Helper
```typescript
// server/lib/errors.ts
export function apiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return res.status(status).json({
    error: { code, message, details }
  });
}

// Usage
return apiError(res, 404, 'NOT_FOUND', 'Tasting not found');
return apiError(res, 400, 'VALIDATION_ERROR', 'Wine name is required');
```

### 3. Update All Endpoints
Search and replace all error responses to use the standard format.

## Benefits
- Predictable client-side error handling
- Better error messages for users
- Easier debugging with error codes

## Found By
Pattern Recognition Specialist Agent, Architecture Strategist Agent
