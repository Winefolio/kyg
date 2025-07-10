import React from 'react';
import { motion } from 'framer-motion';
import { AudioPlayer } from '@/components/ui/audio-player';
import type { AudioMessagePayload } from '@shared/schema';

interface AudioMessageSlideProps {
  payload: AudioMessagePayload;
  className?: string;
}

export function AudioMessageSlide({ payload, className = "" }: AudioMessageSlideProps) {
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

      {/* Audio Player */}
      <div className="max-w-2xl mx-auto">
        <AudioPlayer
          src={payload.audio_publicId ? `/api/media/${payload.audio_publicId}/stream` : payload.audio_url || ''}
          title={payload.title}
          description={payload.description}
          autoplay={payload.autoplay}
          className="w-full"
        />
      </div>

      {/* Bottom spacing for content flow */}
      <div className="mt-8" />
    </motion.div>
  );
}