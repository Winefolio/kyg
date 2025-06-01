import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

interface SessionIdInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (sessionId: string) => void;
  maxLength?: number;
  className?: string;
}

export function SessionIdInput({ 
  value, 
  onChange, 
  onComplete,
  maxLength = 12,
  className = ""
}: SessionIdInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerHaptic } = useHaptics();

  const handleComplete = useCallback((sessionId: string) => {
    if (!hasCompleted && sessionId.length >= 6 && onComplete) {
      setHasCompleted(true);
      triggerHaptic('success');
      setTimeout(() => {
        onComplete(sessionId);
      }, 500);
    }
  }, [hasCompleted, onComplete, triggerHaptic]);

  useEffect(() => {
    if (value.length >= 6) {
      handleComplete(value);
    } else {
      setHasCompleted(false);
    }
  }, [value, handleComplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.slice(0, maxLength);
    if (newValue !== value) {
      triggerHaptic('selection');
      onChange(newValue);
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim().length >= 4) {
      handleComplete(value.trim());
    }
  };

  const renderCharacterSlots = () => {
    const slots = [];
    const minSlots = 6; // Start with 6 slots minimum
    const actualSlots = Math.max(minSlots, value.length + (value.length < maxLength ? 1 : 0));
    
    for (let i = 0; i < actualSlots && i < maxLength; i++) {
      const char = value[i] || '';
      const isEmpty = !char;
      const isCurrent = i === value.length && focused;

      slots.push(
        <motion.div
          key={i}
          className={`
            relative w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold
            transition-all duration-300 backdrop-blur-xl cursor-pointer touch-manipulation
            ${isCurrent 
              ? 'border-blue-400/80 bg-blue-400/20 scale-105 shadow-lg shadow-blue-400/25' 
              : isEmpty 
                ? 'border-white/30 bg-white/10 hover:border-white/40 active:border-white/50' 
                : 'border-white/60 bg-white/20 shadow-md'
            }
            ${hasCompleted && i < value.length ? 'border-green-400/70 bg-green-400/15 shadow-green-400/20' : ''}
          `}
          animate={isCurrent ? { 
            scale: [1, 1.05, 1], 
            borderColor: ['rgba(59, 130, 246, 0.8)', 'rgba(96, 165, 250, 0.9)', 'rgba(59, 130, 246, 0.8)']
          } : {}}
          transition={{ duration: 1.2, repeat: isCurrent ? Infinity : 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          layout
        >
          <span className={`
            ${isEmpty ? 'text-white/40' : 'text-white'}
            transition-all duration-200 font-mono uppercase
          `}>
            {char}
          </span>
          
          {isCurrent && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-blue-400/50"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      );
    }
    return slots;
  };

  const renderProgressDots = () => {
    const minLength = 6;
    const dots = [];
    
    for (let i = 0; i < minLength; i++) {
      const isActive = i < value.length;
      const isComplete = value.length >= minLength;
      
      dots.push(
        <motion.div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            isComplete 
              ? 'bg-green-400/80' 
              : isActive 
                ? 'bg-blue-400/80' 
                : 'bg-white/30'
          }`}
          animate={isActive ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.4, delay: i * 0.08 }}
        />
      );
    }
    
    // Add additional dots for longer inputs
    if (value.length > minLength) {
      for (let i = minLength; i < Math.min(value.length, maxLength); i++) {
        dots.push(
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400/60"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        );
      }
    }
    
    return dots;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hidden input for keyboard handling */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyPress={handleKeyPress}
        className="sr-only"
        maxLength={maxLength}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck="false"
      />

      {/* Character slots */}
      <div 
        className="flex justify-center gap-1 sm:gap-2 cursor-pointer px-2 flex-wrap"
        onClick={handleClick}
      >
        {renderCharacterSlots()}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-4">
        {renderProgressDots()}
      </div>

      {/* Completion message */}
      {hasCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-green-400 text-sm md:text-base font-medium">
            Ready to join session!
          </p>
        </motion.div>
      )}
    </div>
  );
}