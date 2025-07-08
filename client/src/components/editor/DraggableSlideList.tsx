import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Sparkles, ArrowUp, ArrowDown, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useCallback, useRef } from 'react';
import type { Slide } from '@shared/schema';

type ButtonState = 'idle' | 'blocked' | 'processing';

interface DraggableSlideListProps {
  slides: Slide[];
  activeSlideId: string | null;
  pendingReorders: Map<string, any>;
  pendingContentChanges: Set<string>;
  activelyMovingSlide: string | null;
  isProcessingQueue?: boolean;
  buttonStates?: Map<string, ButtonState>;
  onSlideClick: (slideId: string) => void;
  onSlideReorder: (newOrder: Slide[]) => void;
  onSlideDelete: (slideId: string) => void;
  onSlideMove: (slideId: string, direction: 'up' | 'down') => void;
}

interface DraggableSlideItemProps {
  slide: Slide;
  index: number;
  totalSlides: number;
  activeSlideId: string | null;
  pendingReorders: Map<string, any>;
  pendingContentChanges: Set<string>;
  activelyMovingSlide: string | null;
  isProcessingQueue?: boolean;
  buttonStates?: Map<string, ButtonState>;
  onSlideClick: (slideId: string) => void;
  onSlideDelete: (slideId: string) => void;
  onSlideMove: (slideId: string, direction: 'up' | 'down') => void;
}

function DraggableSlideItem({
  slide,
  index,
  totalSlides,
  activeSlideId,
  pendingReorders,
  pendingContentChanges,
  activelyMovingSlide,
  isProcessingQueue,
  buttonStates,
  onSlideClick,
  onSlideDelete,
  onSlideMove
}: DraggableSlideItemProps) {
  const controls = useDragControls();
  const clickTimestamps = useRef<Map<string, number>>(new Map());
  
  const isWelcomeSlide = slide.type === 'interlude' && 
    ((slide.payloadJson as any)?.is_welcome || 
     (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome'));
  
  const canMoveUp = index > 0;
  const canMoveDown = index < totalSlides - 1;
  const hasPendingPositionChange = pendingReorders.has(slide.id);
  const hasPendingContentChange = pendingContentChanges.has(slide.id);
  // Only show visual feedback for content changes or when this specific slide is actively being moved
  const isActivelyMoving = activelyMovingSlide === slide.id;
  const hasPendingChanges = hasPendingContentChange || isActivelyMoving;
  const isDisabled = isProcessingQueue || false;
  
  // Get button states for visual feedback
  const upButtonState = buttonStates?.get(`${slide.id}-up`) || 'idle';
  const downButtonState = buttonStates?.get(`${slide.id}-down`) || 'idle';
  
  // Check if buttons are in specific states
  const upButtonBlocked = upButtonState === 'blocked';
  const upButtonProcessing = upButtonState === 'processing';
  const downButtonBlocked = downButtonState === 'blocked';
  const downButtonProcessing = downButtonState === 'processing';
  
  // Debounced move handler to prevent rapid clicking race conditions
  const handleMoveWithDebounce = useCallback((slideId: string, direction: 'up' | 'down') => {
    const key = `${slideId}-${direction}`;
    const now = Date.now();
    const lastClick = clickTimestamps.current.get(key) || 0;
    
    // Debounce: prevent clicks within 500ms
    if (now - lastClick < 500) {
      console.log(`🚫 Debounced click blocked: ${key} (too soon after last click)`);
      return;
    }
    
    // Update timestamp and call the original handler
    clickTimestamps.current.set(key, now);
    onSlideMove(slideId, direction);
  }, [onSlideMove]);
  
  return (
    <Reorder.Item
      key={slide.id}
      value={slide}
      id={slide.id}
      className={`group relative rounded-lg transition-all duration-200 border ${
        activeSlideId === slide.id 
          ? 'bg-gradient-to-r from-purple-600/40 to-purple-700/30 border-purple-500/50 shadow-lg shadow-purple-900/25' 
          : isWelcomeSlide
          ? 'bg-gradient-to-r from-amber-900/20 to-amber-800/10 border-amber-500/20 hover:border-amber-500/40'
          : hasPendingChanges
          ? 'border-amber-500/50 bg-amber-500/10 animate-pulse'
          : 'border-transparent hover:bg-white/8 hover:border-white/10 hover:shadow-md'
      } ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
      whileDrag={{ 
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
        backgroundColor: "rgba(139, 92, 246, 0.1)"
      }}
      dragListener={false}
      dragControls={controls}
    >
      <div 
        className="p-2.5 cursor-pointer flex items-center"
        onClick={() => onSlideClick(slide.id)}
      >
        <div
          className={`touch-none ${isDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
          onPointerDown={(e) => !isDisabled && controls.start(e)}
        >
          <GripVertical className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${hasPendingPositionChange ? 'text-amber-400' : 'text-white/30'}`} />
        </div>
        
        <div className={`w-1.5 h-1.5 rounded-full mr-2.5 transition-colors ${
          activeSlideId === slide.id 
            ? 'bg-purple-300' 
            : isWelcomeSlide 
            ? 'bg-amber-400' 
            : 'bg-white/40 group-hover:bg-white/60'
        }`} />
        
        <div className="flex items-center flex-1 min-w-0">
          {isWelcomeSlide && (
            <>
              <Sparkles className="w-3 h-3 mr-1.5 text-amber-400 flex-shrink-0" />
              <Badge className="mr-2 px-1.5 py-0 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                Welcome
              </Badge>
            </>
          )}
          <p className="text-sm font-medium text-white truncate">
            {(slide.payloadJson as any)?.title || 'Untitled Slide'}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveWithDebounce(slide.id, 'up');
            }}
            disabled={!canMoveUp || isDisabled || upButtonProcessing}
            className={`h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 ${
              upButtonBlocked ? 'border border-amber-500/70 bg-amber-500/20 text-amber-300' : ''
            } ${upButtonProcessing ? 'animate-pulse' : ''}`}
            title={upButtonBlocked ? "Cannot move up from section boundary" : "Move up"}
          >
            {upButtonProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : upButtonBlocked ? (
              <X className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleMoveWithDebounce(slide.id, 'down');
            }}
            disabled={!canMoveDown || isDisabled || downButtonProcessing}
            className={`h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 ${
              downButtonBlocked ? 'border border-amber-500/70 bg-amber-500/20 text-amber-300' : ''
            } ${downButtonProcessing ? 'animate-pulse' : ''}`}
            title={downButtonBlocked ? "Cannot move down from section boundary" : "Move down"}
          >
            {downButtonProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : downButtonBlocked ? (
              <X className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSlideDelete(slide.id);
            }}
            className="h-6 w-6 p-0 text-white/60 hover:text-red-400 hover:bg-red-500/10"
            title="Delete slide"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Reorder.Item>
  );
}

export function DraggableSlideList({
  slides,
  activeSlideId,
  pendingReorders,
  pendingContentChanges,
  activelyMovingSlide,
  isProcessingQueue,
  buttonStates,
  onSlideClick,
  onSlideReorder,
  onSlideDelete,
  onSlideMove
}: DraggableSlideListProps) {
  return (
    <Reorder.Group 
      axis="y" 
      values={slides}
      onReorder={onSlideReorder}
      className="pl-3 space-y-1.5"
    >
      {slides.map((slide, index) => (
        <DraggableSlideItem
          key={slide.id}
          slide={slide}
          index={index}
          totalSlides={slides.length}
          activeSlideId={activeSlideId}
          pendingReorders={pendingReorders}
          pendingContentChanges={pendingContentChanges}
          activelyMovingSlide={activelyMovingSlide}
          isProcessingQueue={isProcessingQueue}
          buttonStates={buttonStates}
          onSlideClick={onSlideClick}
          onSlideDelete={onSlideDelete}
          onSlideMove={onSlideMove}
        />
      ))}
    </Reorder.Group>
  );
}