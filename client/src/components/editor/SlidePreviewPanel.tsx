import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Play, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Slide } from '@shared/schema';

function InterludePreview({ payload }: { payload: any }) {
  return (
    <div className="text-center p-6 h-full flex flex-col justify-center">
      {payload.wine_image_url && (
        <div className="mb-6">
          <img 
            src={payload.wine_image_url} 
            alt={payload.wine_name || 'Wine'} 
            className="w-32 h-40 mx-auto rounded-lg object-cover shadow-lg"
          />
        </div>
      )}
      <h3 className="text-2xl font-bold text-white mb-2">{payload.title || 'Welcome'}</h3>
      {payload.wine_name && (
        <p className="text-lg text-purple-300 mb-3 font-medium">{payload.wine_name}</p>
      )}
      <p className="text-white/70 text-sm leading-relaxed">{payload.description || 'No description provided'}</p>
      
      <div className="mt-6 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Clock className="w-3 h-3" />
          {payload.duration || 30}s
        </div>
        {payload.showContinueButton && (
          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
            Auto-advance
          </Badge>
        )}
      </div>
    </div>
  );
}

function QuestionPreview({ payload }: { payload: any }) {
  const isMultipleChoice = payload.questionType === 'multiple_choice' && payload.options;
  const isScale = payload.questionType === 'scale' && payload.scaleMin !== undefined;
  
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          {payload.question || payload.title || 'Question'}
        </h3>
        {payload.description && (
          <p className="text-white/70 text-sm">{payload.description}</p>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {isMultipleChoice && (
          <div className="space-y-3">
            {payload.options?.slice(0, 4).map((option: any, index: number) => (
              <div 
                key={option.id || index}
                className="bg-white/10 rounded-lg p-3 text-white text-sm text-center border border-white/20"
              >
                {option.text}
              </div>
            ))}
            {payload.allowMultiple && (
              <Badge variant="secondary" className="mx-auto">Multiple Choice</Badge>
            )}
          </div>
        )}

        {isScale && (
          <div className="space-y-4">
            <div className="flex justify-between text-white/70 text-xs">
              <span>{payload.scaleLabels?.[0] || payload.scaleMin}</span>
              <span>{payload.scaleLabels?.[1] || payload.scaleMax}</span>
            </div>
            <div className="flex justify-center space-x-2">
              {Array.from({ length: Math.min(payload.scaleMax - payload.scaleMin + 1, 10) }).map((_, i) => (
                <div 
                  key={i}
                  className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs"
                >
                  {payload.scaleMin + i}
                </div>
              ))}
            </div>
          </div>
        )}

        {payload.questionType === 'text' && (
          <div className="bg-white/10 rounded-lg p-4 text-white/50 text-center border border-white/20">
            Text input area
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {payload.timeLimit || 60}s
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {payload.points || 10} pts
        </div>
      </div>
    </div>
  );
}

function VideoPreview({ payload }: { payload: any }) {
  return (
    <div className="p-6 h-full flex flex-col justify-center text-center">
      <div className="w-20 h-20 mx-auto mb-4 bg-red-600 rounded-full flex items-center justify-center">
        <Play className="w-8 h-8 text-white ml-1" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {payload.title || 'Video Message'}
      </h3>
      <p className="text-white/70 text-sm mb-4">
        {payload.description || 'Video content will play here'}
      </p>
      {payload.videoUrl && (
        <Badge variant="outline" className="mx-auto border-red-500/50 text-red-300">
          Video Ready
        </Badge>
      )}
    </div>
  );
}

export function SlidePreviewPanel({ activeSlide }: { activeSlide: Slide | undefined }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="aspect-[9/16] w-full max-w-sm bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Phone-like header */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-black/20 rounded-t-3xl flex items-center justify-center">
          <div className="w-16 h-1 bg-white/30 rounded-full"></div>
        </div>

        {/* Content area */}
        <div className="pt-8 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide?.id || 'empty'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="h-full"
            >
              {!activeSlide && (
                <div className="h-full flex items-center justify-center text-center text-white/50 p-6">
                  <div>
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Select a slide to preview</p>
                  </div>
                </div>
              )}
              
              {activeSlide?.type === 'interlude' && (
                <InterludePreview payload={activeSlide.payloadJson} />
              )}
              
              {activeSlide?.type === 'question' && (
                <QuestionPreview payload={activeSlide.payloadJson} />
              )}
              
              {(activeSlide?.type === 'video_message' || activeSlide?.type === 'audio_message') && (
                <VideoPreview payload={activeSlide.payloadJson} />
              )}
              
              {activeSlide?.type === 'media' && (
                <div className="h-full flex items-center justify-center text-center text-white/50 p-6">
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                      📷
                    </div>
                    <p className="text-sm">Media Slide</p>
                  </div>
                </div>
              )}
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
}