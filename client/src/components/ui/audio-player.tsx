import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Loader2,
  AlertCircle,
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioPlayerProps {
  src: string;
  title?: string;
  description?: string;
  autoplay?: boolean;
  className?: string;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (error: string) => void;
}

export function AudioPlayer({
  src,
  title,
  description,
  autoplay = false,
  className = "",
  onLoadStart,
  onCanPlay,
  onError
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audio = audioRef.current;

  // Audio event handlers
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
    onLoadStart?.();
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    if (audio) {
      setDuration(audio.duration);
    }
    onCanPlay?.();
  };

  const handleError = () => {
    setIsLoading(false);
    const errorMessage = 'Failed to load audio. Please check the file format and try again.';
    setError(errorMessage);
    onError?.(errorMessage);
  };

  const handleTimeUpdate = () => {
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Control functions
  const togglePlay = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  };

  const handleSeek = (percentage: number) => {
    if (audio && duration) {
      const newTime = (percentage / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (audio) {
      audio.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (audio) {
      if (isMuted) {
        audio.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audio.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const restart = () => {
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audio.play();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Create visual waveform effect
  const generateWaveform = () => {
    const bars = [];
    const numBars = 40;
    const progress = duration > 0 ? currentTime / duration : 0;
    
    for (let i = 0; i < numBars; i++) {
      const height = Math.random() * 40 + 10; // Random height between 10-50px
      const isActive = i < progress * numBars;
      
      bars.push(
        <motion.div
          key={i}
          className={`w-1 rounded-full transition-colors duration-200 ${
            isActive ? 'bg-purple-400' : 'bg-white/20'
          }`}
          style={{ height: `${height}px` }}
          animate={{
            scaleY: isPlaying && isActive ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.05,
            repeat: isPlaying && isActive ? Infinity : 0,
          }}
        />
      );
    }
    
    return bars;
  };

  return (
    <div className={`bg-gradient-to-r from-purple-900/20 to-black/40 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl ${className}`}>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoplay}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-white py-8"
          >
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Loading audio...</p>
            {title && <p className="text-white/70 text-sm mt-1">{title}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-white py-8"
          >
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Audio Error</h3>
            <p className="text-white/80 mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                audio?.load();
              }}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Content */}
      <AnimatePresence>
        {!isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-purple-400" />
              </div>
              {title && (
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              )}
              {description && (
                <p className="text-white/80 text-sm">{description}</p>
              )}
            </div>

            {/* Waveform Visualization */}
            <div 
              className="flex items-end justify-center space-x-1 h-16 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                handleSeek(percentage);
              }}
            >
              {generateWaveform()}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress
                value={duration ? (currentTime / duration) * 100 : 0}
                className="h-2 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                  handleSeek(percentage);
                }}
              />
              <div className="flex justify-between text-xs text-white/60">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={restart}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              <Button
                size="lg"
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #a855f7;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}