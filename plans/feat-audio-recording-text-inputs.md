# feat: Add Audio Recording Option to Text Input Questions

## Overview

Add a microphone button to text input questions that allows users to record voice notes instead of typing. Particularly useful for mobile users and wine tasting scenarios where typing is inconvenient.

## Context

- **Camera on mobile**: Already working! `capture="environment"` in `SoloTastingNew.tsx:439` opens rear camera on mobile. Desktop shows file picker (expected).
- **Text inputs**: `TextQuestion.tsx` currently only supports typing via textarea.

## Acceptance Criteria

- [ ] Add microphone button next to textarea in `TextQuestion.tsx`
- [ ] Use browser's MediaRecorder API for audio capture
- [ ] Show recording indicator (pulsing red dot) while recording
- [ ] Auto-transcribe audio to text using existing OpenAI Whisper integration (or add one)
- [ ] Fallback gracefully on browsers without microphone support
- [ ] Mobile-friendly touch targets

## Implementation

### `client/src/components/questions/TextQuestion.tsx`

Add microphone button UI:
```tsx
// Add to imports
import { Mic, MicOff, Loader2 } from 'lucide-react';

// Add state
const [isRecording, setIsRecording] = useState(false);
const [isTranscribing, setIsTranscribing] = useState(false);

// Add button next to textarea
<Button
  variant="ghost"
  onClick={toggleRecording}
  className="absolute right-2 bottom-2"
>
  {isRecording ? <MicOff className="text-red-400 animate-pulse" /> : <Mic />}
</Button>
```

### `server/routes/transcription.ts` (new)

Add Whisper transcription endpoint:
```typescript
// POST /api/transcribe
// Accept audio blob, return text
// Use OpenAI Whisper API (gpt-5-mini tier pricing)
```

## References

- Existing audio infrastructure: `client/src/components/ui/audio-player.tsx`
- OpenAI client: `server/openai-client.ts`
- Similar pattern: Photo capture in `SoloTastingNew.tsx`
