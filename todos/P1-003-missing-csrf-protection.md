# P1-003: Missing CSRF Protection

## Priority: CRITICAL (P1)
## Status: Open
## Category: Security

## Summary
State-changing endpoints lack CSRF protection, allowing attackers to perform actions on behalf of authenticated users.

## Affected Files
- `server/routes.ts` (all POST/PUT/DELETE endpoints)
- `server/routes/auth.ts`
- `server/routes/tastings.ts`

## Vulnerable Endpoints
- POST `/api/auth/login`
- POST `/api/solo/tastings`
- PUT `/api/users/:id/level-up`
- DELETE endpoints

## Fix Required

### Option 1: csurf middleware
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Add token to responses
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

### Option 2: SameSite cookies (simpler)
```typescript
app.use(session({
  cookie: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));
```

## Risk if Not Fixed
- Attackers can perform actions as authenticated users
- Account takeover via malicious links
- OWASP Top 10: A01:2021 - Broken Access Control

## Found By
Security Sentinel Agent
