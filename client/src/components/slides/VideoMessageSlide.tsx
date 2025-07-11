import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VideoPlayer } from '@/components/ui/video-player';
import { getPreviewMediaUrl, validateMediaUrl } from '@/lib/media-prefetch';
import type { VideoMessagePayload } from '@shared/schema';

interface VideoMessageSlideProps {
  payload: VideoMessagePayload;
  className?: string;
}

export function VideoMessageSlide({ payload, className = "" }: VideoMessageSlideProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Determine the optimal video URL
  useEffect(() => {
    const url = getPreviewMediaUrl(payload.video_publicId, payload.video_url);
    setVideoUrl(url);
    
    // Validate the URL if it's available
    if (url) {
      setIsValidating(true);
      validateMediaUrl(url)
        .then(isValid => {
          if (!isValid) {
            setValidationError('Video could not be loaded. Please check the media file.');
          } else {
            setValidationError(null);
          }
        })
        .catch(() => {
          setValidationError('Unable to validate video URL.');
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [payload.video_publicId, payload.video_url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 md:p-8 border border-white/20 shadow-2xl ${className}`}
    >
      {/* Header */}
      {payload.title && (
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            {payload.title}
          </h2>
          {payload.description && (
            <p className="text-white/80 text-base sm:text-lg leading-relaxed">
              {payload.description}
            </p>
          )}
        </div>
      )}

      {/* Video Player */}
      <div className="w-full mx-auto">
        {videoUrl ? (
          <div className="relative w-full">
            {/* Aspect ratio container for responsive video */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/20">
              <VideoPlayer
                src={videoUrl}
                title={payload.title}
                description={payload.description}
                autoplay={payload.autoplay}
                controls={payload.show_controls}
                className="w-full h-full object-cover shadow-2xl"
                onError={(error) => {
                  console.error('Video player error:', error);
                  setValidationError(error);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="aspect-video w-full bg-black/20 rounded-2xl flex items-center justify-center">
            <p className="text-white/60 text-sm sm:text-base">No video URL provided</p>
          </div>
        )}
        
        {/* Show validation status */}
        {isValidating && (
          <div className="mt-3 text-center">
            <p className="text-white/60 text-sm">Validating video...</p>
          </div>
        )}
        
        {validationError && (
          <div className="mt-3 text-center">
            <p className="text-red-400 text-sm">{validationError}</p>
          </div>
        )}
      </div>

      {/* Bottom spacing for content flow */}
      <div className="mt-4 sm:mt-6 md:mt-8" />
    </motion.div>
  );
}