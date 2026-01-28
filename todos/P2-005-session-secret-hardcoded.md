# P2-005: Session Secret Fallback is Hardcoded

## Priority: HIGH (P2)
## Status: Open
## Category: Security

## Summary
The session middleware has a hardcoded fallback secret when `SESSION_SECRET` env var is not set, making sessions predictable in development and potentially production.

## Affected Files
- `server/index.ts` or wherever session is configured

## Problematic Code
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  // ...
}));
```

## Fix Required

### 1. Remove fallback
```typescript
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}

app.use(session({
  secret: sessionSecret,
  // ...
}));
```

### 2. Generate strong secret for production
```bash
# Add to Railway/production env vars
SESSION_SECRET=$(openssl rand -base64 32)
```

## Risk if Not Fixed
- Session tokens can be forged if secret is known
- Account takeover via session hijacking
- All sessions compromised if secret leaked

## Found By
Security Sentinel Agent
