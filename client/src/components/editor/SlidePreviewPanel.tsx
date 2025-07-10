import { AnimatePresence, motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MultipleChoiceQuestion } from '@/components/questions/MultipleChoiceQuestion';
import { ScaleQuestion } from '@/components/questions/ScaleQuestion';
import { TextQuestion } from '@/components/questions/TextQuestion';
import { BooleanQuestion } from '@/components/questions/BooleanQuestion';
import { VideoMessageSlide } from '@/components/slides/VideoMessageSlide';
import { AudioMessageSlide } from '@/components/slides/AudioMessageSlide';
import { TransitionSlide } from '@/components/slides/TransitionSlide';
import type { Slide, VideoMessagePayload, AudioMessagePayload, TransitionPayload } from '@shared/schema';
import { memo, useMemo } from 'react';

// Preview wrapper component that scales down and disables interactions
function PreviewWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`transform scale-75 origin-center pointer-events-none ${className}`}>
      {children}
    </div>
  );
}

// Render actual slide content using the same logic as TastingSession.tsx
function renderSlideContent(slide: Slide) {
  // Dummy handlers for preview mode
  const dummyHandlers = {
    onChange: () => {},
    onContinue: () => {},
  };

  switch (slide.type) {
    case 'interlude':
      const interludePayload = slide.payloadJson as any;
      return (
        <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center h-full flex flex-col justify-center">
          {interludePayload.wine_image_url && (
            <div className="mb-6">
              <img 
                src={interludePayload.wine_image_url} 
                alt={interludePayload.wine_name || 'Wine'} 
                className="w-32 h-40 mx-auto rounded-lg object-cover shadow-lg"
              />
            </div>
          )}
          <h3 className="text-2xl font-bold text-white mb-2">{interludePayload.title || 'Welcome'}</h3>
          {interludePayload.wine_name && (
            <p className="text-lg text-purple-300 mb-3 font-medium">{interludePayload.wine_name}</p>
          )}
          <p className="text-white/70 text-sm leading-relaxed">{interludePayload.description || 'No description provided'}</p>
        </div>
      );

    case 'video_message':
      return (
        <PreviewWrapper>
          <VideoMessageSlide
            payload={slide.payloadJson as VideoMessagePayload}
          />
        </PreviewWrapper>
      );

    case 'audio_message':
      return (
        <PreviewWrapper>
          <AudioMessageSlide
            payload={slide.payloadJson as AudioMessagePayload}
          />
        </PreviewWrapper>
      );

    case 'transition':
      return (
        <PreviewWrapper>
          <TransitionSlide
            payload={slide.payloadJson as TransitionPayload}
            onContinue={dummyHandlers.onContinue}
            autoAdvance={false} // Disable auto-advance in preview
          />
        </PreviewWrapper>
      );

    case 'question':
      // Check for new generic_questions format first
      if (slide.genericQuestions) {
        const gq = slide.genericQuestions as any; // Type assertion for unknown type
        
        switch (gq.format) {
          case 'multiple_choice':
            return (
              <PreviewWrapper>
                <MultipleChoiceQuestion
                  question={{
                    title: gq.config?.title || 'Untitled Question',
                    description: gq.config?.description || '',
                    category: gq.metadata?.category || 'Question',
                    options: gq.config?.options || [],
                    allow_multiple: gq.config?.allowMultiple || false,
                    allow_notes: gq.config?.allowNotes || false
                  }}
                  value={{ selected: [], notes: '' }}
                  onChange={dummyHandlers.onChange}
                />
              </PreviewWrapper>
            );
          
          case 'scale':
            return (
              <PreviewWrapper>
                <ScaleQuestion
                  question={{
                    title: gq.config?.title || 'Scale Question',
                    description: gq.config?.description || '',
                    category: gq.metadata?.category || 'Scale',
                    scale_min: gq.config?.scaleMin || 1,
                    scale_max: gq.config?.scaleMax || 10,
                    scale_labels: gq.config?.scaleLabels || ['Low', 'High']
                  }}
                  value={Math.floor(((gq.config?.scaleMin || 1) + (gq.config?.scaleMax || 10)) / 2)}
                  onChange={dummyHandlers.onChange}
                />
              </PreviewWrapper>
            );
          
          case 'text':
            return (
              <PreviewWrapper>
                <TextQuestion
                  question={{
                    title: gq.config?.title || 'Text Question',
                    description: gq.config?.description || '',
                    placeholder: gq.config?.placeholder || 'Enter your response...',
                    maxLength: gq.config?.maxLength || 500,
                    minLength: gq.config?.minLength,
                    rows: gq.config?.rows || 4,
                    category: gq.config?.category || 'Response'
                  }}
                  value=""
                  onChange={dummyHandlers.onChange}
                />
              </PreviewWrapper>
            );
          
          case 'boolean':
            return (
              <PreviewWrapper>
                <BooleanQuestion
                  question={{
                    title: gq.config?.title || 'Boolean Question',
                    description: gq.config?.description || '',
                    category: gq.config?.category || 'Yes/No',
                    trueLabel: gq.config?.trueLabel || 'Yes',
                    falseLabel: gq.config?.falseLabel || 'No',
                    trueIcon: gq.config?.trueIcon !== false,
                    falseIcon: gq.config?.falseIcon !== false
                  }}
                  value={null}
                  onChange={dummyHandlers.onChange}
                />
              </PreviewWrapper>
            );
        }
      }

      // Fallback to legacy payloadJson format
      const questionData = slide.payloadJson as any; // Type assertion for unknown type
      
      if (questionData?.questionType === 'multiple_choice' || questionData?.question_type === 'multiple_choice') {
        return (
          <PreviewWrapper>
            <MultipleChoiceQuestion
              question={{
                title: questionData?.title || questionData?.question || 'Untitled Question',
                description: questionData?.description || '',
                category: questionData?.category || 'Question',
                options: questionData?.options || [],
                allow_multiple: questionData?.allow_multiple || questionData?.allowMultiple || false,
                allow_notes: questionData?.allow_notes || questionData?.allowNotes || false
              }}
              value={{ selected: [], notes: '' }}
              onChange={dummyHandlers.onChange}
            />
          </PreviewWrapper>
        );
      }

      if (questionData?.questionType === 'scale' || questionData?.question_type === 'scale') {
        return (
          <PreviewWrapper>
            <ScaleQuestion
              question={{
                title: questionData?.title || questionData?.question || 'Scale Question',
                description: questionData?.description || '',
                category: questionData?.category || 'Scale',
                scale_min: questionData?.scale_min || questionData?.scaleMin || 1,
                scale_max: questionData?.scale_max || questionData?.scaleMax || 10,
                scale_labels: questionData?.scale_labels || questionData?.scaleLabels || ['Low', 'High']
              }}
              value={Math.floor(((questionData?.scale_min || questionData?.scaleMin || 1) + (questionData?.scale_max || questionData?.scaleMax || 10)) / 2)}
              onChange={dummyHandlers.onChange}
            />
          </PreviewWrapper>
        );
      }

      if (questionData?.questionType === 'text' || questionData?.question_type === 'text' ||
          questionData?.questionType === 'free_response' || questionData?.question_type === 'free_response') {
        return (
          <PreviewWrapper>
            <TextQuestion
              question={{
                title: questionData?.title || questionData?.question || 'Text Question',
                description: questionData?.description || '',
                placeholder: questionData?.placeholder || 'Enter your response...',
                maxLength: questionData?.maxLength || questionData?.max_length || 500,
                minLength: questionData?.minLength || questionData?.min_length,
                rows: questionData?.rows || 4,
                category: questionData?.category || 'Text Response'
              }}
              value=""
              onChange={dummyHandlers.onChange}
            />
          </PreviewWrapper>
        );
      }

      if (questionData?.questionType === 'boolean' || questionData?.question_type === 'boolean') {
        return (
          <PreviewWrapper>
            <BooleanQuestion
              question={{
                title: questionData?.title || questionData?.question || 'Boolean Question',
                description: questionData?.description || '',
                category: questionData?.category || 'Yes/No',
                trueLabel: questionData?.trueLabel || questionData?.true_label || 'Yes',
                falseLabel: questionData?.falseLabel || questionData?.false_label || 'No',
                trueIcon: questionData?.trueIcon !== false,
                falseIcon: questionData?.falseIcon !== false
              }}
              value={null}
              onChange={dummyHandlers.onChange}
            />
          </PreviewWrapper>
        );
      }

      // Fallback to text question
      return (
        <PreviewWrapper>
          <TextQuestion
            question={{
              title: questionData.title || questionData.question || 'Question',
              description: questionData.description || '',
              placeholder: questionData.placeholder || 'Enter your response...',
              maxLength: questionData.maxLength || questionData.max_length || 500,
              minLength: questionData.minLength || questionData.min_length,
              rows: questionData.rows || 4,
              category: questionData.category || 'Response'
            }}
            value=""
            onChange={dummyHandlers.onChange}
          />
        </PreviewWrapper>
      );

    default:
      return (
        <div className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl text-center">
          <p className="text-white">Unknown slide type: {slide.type}</p>
        </div>
      );
  }
}

export const SlidePreviewPanel = memo(function SlidePreviewPanel({ activeSlide }: { activeSlide: Slide | undefined }) {
  // Memoize the slide content to prevent re-renders
  const slideContent = useMemo(() => {
    if (!activeSlide) {
      return (
        <div className="text-center text-white/50 p-6">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Select a slide to preview</p>
        </div>
      );
    }
    return renderSlideContent(activeSlide);
  }, [activeSlide?.id, activeSlide?.payloadJson, activeSlide?.genericQuestions]);

  return (
    <div className="h-full flex items-center justify-center p-2">
      <div className="aspect-[9/16] w-full max-w-sm bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Content area - with top padding for nav clearance */}
        <div className="h-full flex flex-col pt-16 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide?.id || 'empty'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full flex items-center justify-center"
            >
              {slideContent}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom indicator */}
        {activeSlide && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between">
              <Badge 
                variant="secondary" 
                className="text-xs bg-black/40 border-white/20 text-white"
              >
                {activeSlide.type.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge 
                variant="outline" 
                className="text-xs border-white/20 text-white/70"
              >
                {activeSlide.section_type || 'general'}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});