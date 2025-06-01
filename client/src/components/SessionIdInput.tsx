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
    if (!hasCompleted && sessionId.length >= 8 && onComplete) {
      setHasCompleted(true);
      triggerHaptic('success');
      setTimeout(() => {
        onComplete(sessionId);
      }, 300);
    }
  }, [hasCompleted, onComplete, triggerHaptic]);

  useEffect(() => {
    if (value.length >= 8) {
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
    if (e.key === 'Enter' && value.trim().length >= 8) {
      handleComplete(value.trim());
    }
  };

  const renderCharacterSlots = () => {
    const slots = [];
    const minSlots = 8; // Start with 8 slots, expand as needed
    const actualSlots = Math.max(minSlots, value.length + (value.length < maxLength ? 1 : 0));
    
    for (let i = 0; i < actualSlots && i < maxLength; i++) {
      const char = value[i] || '';
      const isEmpty = !char;
      const isCurrent = i === value.length && focused;

      slots.push(
        <motion.div
          key={i}
          className={`
            relative w-8 h-10 sm:w-10 sm:h-12 rounded-lg border-2 flex items-center justify-center text-sm sm:text-base font-bold
            transition-all duration-300 backdrop-blur-xl cursor-pointer touch-manipulation
            ${isCurrent 
              ? 'border-blue-400/80 bg-blue-400/20 scale-105' 
              : isEmpty 
                ? 'border-white/30 bg-white/10 hover:border-white/40 active:border-white/50' 
                : 'border-white/50 bg-white/15'
            }
            ${hasCompleted && i < value.length ? 'border-green-400/60 bg-green-400/10' : ''}
          `}
          animate={isCurrent ? { 
            scale: [1, 1.05, 1], 
            borderColor: ['rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 1)', 'rgba(59, 130, 246, 0.8)']
          } : {}}
          transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0 }}
          whileHover={{ scale: 1.02 }}
          layout
        >
          <span className={`
            ${isEmpty ? 'text-white/40' : 'text-white'}
            transition-all duration-200 font-mono
          `}>
            {char}
          </span>
          
          {isCurrent && (
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-blue-400/40"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      );
    }
    return slots;
  };

  const renderProgressDots = () => {
    const progress = Math.min(value.length / 8, 1);
    const dotCount = 8;
    const dots = [];
    
    for (let i = 0; i < dotCount; i++) {
      const isActive = i < value.length;
      dots.push(
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isActive ? 'bg-blue-400/80' : 'bg-white/30'
          }`}
          animate={isActive ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        />
      );
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