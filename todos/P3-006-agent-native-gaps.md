# P3-006: Agent-Native API Gaps (83% Coverage)

## Priority: LOW (P3)
## Status: Open
## Category: API Design

## Summary
3 user-facing features lack API equivalents, preventing AI agents from accessing the same functionality as human users.

## Current Coverage: 83% (15/18 features)

## Missing API Endpoints

### 1. Wine Image Upload
**User Action:** Upload wine label photo from camera
**Missing:** `POST /api/wines/image` with image analysis

**Fix:**
```typescript
router.post('/api/wines/image', upload.single('image'), async (req, res) => {
  const analysis = await analyzeWineLabel(req.file);
  res.json({ wine: analysis });
});
```

### 2. Audio Transcription Results
**User Action:** Record tasting notes via voice
**Missing:** Return transcription text in response

**Current:** Returns success only
**Needed:** `{ success: true, transcription: "..." }`

### 3. Level-Up Decision
**User Action:** Accept/decline level-up in modal
**Missing:** API to query pending level-up status

**Fix:**
```typescript
router.get('/api/users/:id/level-up-status', async (req, res) => {
  const user = await storage.getUser(req.params.id);
  res.json({
    eligible: user.levelUpPromptEligible,
    currentLevel: user.tastingLevel,
    nextLevel: getNextLevel(user.tastingLevel)
  });
});
```

## Why This Matters
- AI assistants can help users track their wine journey
- Voice assistants need API access
- Automation and testing need programmatic access
- "If a user can do it, an agent should be able to do it"

## Found By
Agent-Native Reviewer Agent
