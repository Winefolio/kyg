import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TransitionPayload } from "@shared/schema";

interface TransitionSlideProps {
  payload: TransitionPayload;
  onContinue: () => void;
  autoAdvance?: boolean;
}

export function TransitionSlide({ payload, onContinue, autoAdvance = true }: TransitionSlideProps) {
  const [timeRemaining, setTimeRemaining] = useState(payload.duration || 2000);
  
  useEffect(() => {
    if (!autoAdvance || payload.showContinueButton) return;
    
    const timer = setTimeout(() => {
      onContinue();
    }, payload.duration || 2000);
    
    // Update countdown
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 100));
    }, 100);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [autoAdvance, payload.duration, payload.showContinueButton, onContinue]);

  const renderAnimation = () => {
    switch (payload.animation_type || 'wine_glass_fill') {
      case 'wine_glass_fill':
        return (
          <motion.div
            className="relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-6 sm:mb-8"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Wine glass outline */}
            <Wine className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 text-white/30 absolute inset-0" />
            
            {/* Wine fill animation */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-b-full"
              initial={{ height: 0 }}
              animate={{ height: "60%" }}
              transition={{ 
                duration: (payload.duration || 2000) / 1000, 
                ease: "easeInOut" 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-red-600 to-red-500 opacity-80" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-red-400 to-transparent opacity-50"
                animate={{ 
                  backgroundPosition: ["0% 100%", "0% 0%", "0% 100%"] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
            
            {/* Sparkles */}
            <motion.div
              className="absolute -inset-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-300" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );
        
      case 'fade':
        return (
          <motion.div
            className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ 
                duration: (payload.duration || 2000) / 1000,
                ease: "linear"
              }}
            />
          </motion.div>
        );
        
      case 'slide':
        return (
          <motion.div className="flex justify-center items-center space-x-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-white/30"
                animate={{
                  backgroundColor: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.3)"],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-auto">
      {/* Background with image support */}
      <div className="fixed inset-0">
        {payload.backgroundImage ? (
          <>
            <img 
              src={payload.backgroundImage} 
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800">
            {/* Orange overlay removed for better mobile visibility */}
          </div>
        )}
      </div>

      {/* Animated particles */}
      <div className="fixed inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            animate={{
              y: [-20, -100],
              opacity: [0, 0.5, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${100 + Math.random() * 20}%`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-[100dvh] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          className="max-w-2xl w-full text-center py-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animation */}
          <AnimatePresence mode="wait">
            {renderAnimation()}
          </AnimatePresence>

          {/* Title */}
          <motion.h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {payload.title}
          </motion.h1>

          {/* Description */}
          {payload.description && (
            <motion.p
              className="text-base sm:text-lg lg:text-xl text-white/80 mb-6 sm:mb-8 max-w-lg mx-auto px-4 sm:px-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {payload.description}
            </motion.p>
          )}

          {/* Continue button or auto-advance indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {payload.showContinueButton ? (
              <Button
                onClick={onContinue}
                size="lg"
                className="bg-white text-purple-900 hover:bg-white/90 shadow-2xl px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base min-h-[44px]"
              >
                Continue
                <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
              </Button>
            ) : autoAdvance && (
              <div className="flex items-center justify-center space-x-2 text-white/60">
                <motion.div
                  className="w-2 h-2 bg-white/60 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm">
                  Continuing in {Math.ceil(timeRemaining / 1000)}s
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}