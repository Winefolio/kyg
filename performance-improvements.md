# TastingSession.tsx Performance Improvements

## 1. Add useCallback for Event Handlers

```typescript
const goToNextSlide = useCallback(async () => {
  // existing logic
}, [slides, currentSlideIndex, currentSlide, wines, /* other deps */]);

const goToPreviousSlide = useCallback(() => {
  // existing logic
}, [currentSlideIndex, isSaving]);

const jumpToSlide = useCallback((slideIndex: number) => {
  // existing logic
}, [currentSlideIndex, isSaving]);

const handleAnswerChange = useCallback(async (slideId: string, answer: any) => {
  // existing logic
}, [participantId, saveResponse, currentSlideIndex]);

const handleComplete = useCallback(async () => {
  // existing logic
}, [endSession, currentSession, sessionId, participantId, setLocation]);
```

## 2. Memoize Expensive Computations

```typescript
// Memoize slide organization
const organizedSlides = useMemo(() => {
  if (!slidesData) return { slides: [], wines: [], slidesByWine: {} };
  
  const allSlides = slidesData.slides || [];
  const wines = slidesData.wines || [];
  // ... rest of the complex organization logic
  
  return { slides, wines, slidesByWine, sortedSlidesByWine };
}, [slidesData]);

// Memoize section progress
const sections = useMemo(() => {
  // existing section calculation logic
  return calculatedSections;
}, [currentWineSlides, currentSlideInWine, completedSlides, slides, currentSlide]);
```

## 3. Optimize API Calls

```typescript
// Replace polling with event-driven updates
const { data: currentSession } = useQuery({
  queryKey: [`/api/sessions/${sessionId}`],
  queryFn: async () => { /* ... */ },
  enabled: !!sessionId,
  refetchInterval: false, // Disable polling
  // Use WebSocket or SSE for real-time updates instead
});

// Add reasonable caching to slides query
const { data: slidesData } = useQuery({
  queryKey: [`/api/packages/${currentSession?.packageCode}/slides`, participantId, currentSession?.status],
  queryFn: async () => { /* ... */ },
  enabled: !!currentSession?.packageCode && !!participantId,
  staleTime: 5000, // 5 seconds
  gcTime: 10000, // 10 seconds
  refetchOnMount: false,
  refetchOnWindowFocus: false,
});
```

## 4. Batch State Updates

```typescript
const handleAnswerChange = useCallback(async (slideId: string, answer: any) => {
  // Use React 18's automatic batching or unstable_batchedUpdates
  setAnswers(prev => ({ ...prev, [slideId]: answer }));
  
  if (participantId) {
    // Don't set isSaving immediately - let the UI stay responsive
    const savePromise = saveResponse(participantId, slideId, answer);
    
    // Only show saving state for long operations
    const timeoutId = setTimeout(() => setIsSaving(true), 100);
    
    try {
      await savePromise;
      await apiRequest('PATCH', `/api/participants/${participantId}/progress`, { 
        progress: currentSlideIndex + 1 
      });
    } finally {
      clearTimeout(timeoutId);
      setIsSaving(false);
    }
  }
}, [participantId, saveResponse, currentSlideIndex]);
```

## 5. Remove Console Logs

Create a debug utility that can be toggled:

```typescript
const debug = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Replace all console.log with debug
debug('🔄 [STATE CHANGE] currentSlideIndex changed:', { ... });
```

## 6. Optimize Animations

```typescript
// Reduce animation complexity for lower-end devices
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const slideAnimation = reduceMotion ? {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 }
} : {
  initial: { opacity: 0, y: 20, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: TRANSITION_DURATIONS.slideAnimation
};
```

## 7. Cleanup Timeouts

```typescript
useEffect(() => {
  const timeouts: NodeJS.Timeout[] = [];
  
  // Store timeout refs
  const addTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeouts.push(id);
    return id;
  };
  
  // Cleanup on unmount
  return () => {
    timeouts.forEach(clearTimeout);
  };
}, []);
```

## 8. Virtualize Long Lists

For the sidebar wine list with many slides:

```typescript
import { FixedSizeList } from 'react-window';

// Replace the wine slides mapping with a virtualized list
<FixedSizeList
  height={400}
  itemCount={wineSlides.length}
  itemSize={60}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {/* Render individual slide item */}
    </div>
  )}
</FixedSizeList>
```

## 9. Lazy Load Heavy Components

```typescript
const VideoMessageSlide = lazy(() => import('@/components/slides/VideoMessageSlide'));
const AudioMessageSlide = lazy(() => import('@/components/slides/AudioMessageSlide'));

// Wrap in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <VideoMessageSlide {...props} />
</Suspense>
```

## 10. Debounce Rapid State Changes

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSaveResponse = useDebouncedCallback(
  async (participantId: string, slideId: string, answer: any) => {
    await saveResponse(participantId, slideId, answer);
  },
  500 // 500ms debounce
);
```