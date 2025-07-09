import React from 'react';
import { motion } from 'framer-motion';
import { VideoPlayer } from '@/components/ui/video-player';
import type { VideoMessagePayload } from '@shared/schema';

interface VideoMessageSlideProps {
  payload: VideoMessagePayload;
  className?: string;
}

export function VideoMessageSlide({ payload, className = "" }: VideoMessageSlideProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl ${className}`}
    >
      {/* Header */}
      {payload.title && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {payload.title}
          </h2>
          {payload.description && (
            <p className="text-white/80 text-lg leading-relaxed">
              {payload.description}
            </p>
          )}
        </div>
      )}

      {/* Video Player */}
      <div className="max-w-4xl mx-auto">
        <VideoPlayer
          src={payload.video_publicId ? `/api/media/${payload.video_publicId}/file` : payload.video_url || ''}
          title={payload.title}
          description={payload.description}
          autoplay={payload.autoplay}
          controls={payload.show_controls}
          className="w-full rounded-2xl overflow-hidden shadow-2xl"
        />
      </div>

      {/* Bottom spacing for content flow */}
      <div className="mt-8" />
    </motion.div>
  );
}