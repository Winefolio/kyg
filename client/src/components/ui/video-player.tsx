import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  src: string;
  title?: string;
  description?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (error: string) => void;
}

export function VideoPlayer({
  src,
  title,
  description,
  autoplay = false,
  controls = true,
  className = "",
  onLoadStart,
  onCanPlay,
  onError
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  const video = videoRef.current;

  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    if (isFullscreen && showControls) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [showControls, isFullscreen]);

  // Video event handlers
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
    onLoadStart?.();
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    if (video) {
      setDuration(video.duration);
    }
    onCanPlay?.();
  };

  const handleError = () => {
    setIsLoading(false);
    const errorMessage = 'Failed to load video. Please check the file format and try again.';
    setError(errorMessage);
    onError?.(errorMessage);
  };

  const handleTimeUpdate = () => {
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  // Control functions
  const togglePlay = () => {
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  };

  const handleSeek = (percentage: number) => {
    if (video && duration) {
      const newTime = (percentage / 100) * duration;
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (video) {
      video.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (video) {
      if (isMuted) {
        video.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        video.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const restart = () => {
    if (video) {
      video.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        video.play();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
  };

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isFullscreen && setShowControls(true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoplay}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        className="w-full h-full object-contain"
        playsInline
      />

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="text-center text-white">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Loading video...</p>
              {title && <p className="text-white/70 text-sm mt-1">{title}</p>}
            </div>
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
            className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className="text-center text-white p-6">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Video Error</h3>
              <p className="text-white/80 mb-4">{error}</p>
              <Button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  video?.load();
                }}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Overlay */}
      <AnimatePresence>
        {(title || description) && showControls && !isLoading && !error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent"
          >
            {title && (
              <h3 className="text-white text-xl font-bold mb-2">{title}</h3>
            )}
            {description && (
              <p className="text-white/80 text-sm">{description}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {controls && (
        <AnimatePresence>
          {showControls && !isLoading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
            >
              {/* Progress Bar */}
              <div className="mb-4">
                <Progress
                  value={duration ? (currentTime / duration) * 100 : 0}
                  className="h-1 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                    handleSeek(percentage);
                  }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={restart}
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-white/80 text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}