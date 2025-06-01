import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  className?: string;
  onComplete?: (code: string) => void;
}

export function CodeInput({ 
  value, 
  onChange, 
  maxLength, 
  placeholder = "", 
  className = "",
  onComplete 
}: CodeInputProps) {
  const [focused, setFocused] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerHaptic } = useHaptics();

  const handleComplete = useCallback((code: string) => {
    if (!hasCompleted && code.length === maxLength && onComplete) {
      setHasCompleted(true);
      triggerHaptic('success');
      setTimeout(() => {
        onComplete(code);
      }, 200);
    }
  }, [hasCompleted, maxLength, onComplete, triggerHaptic]);

  useEffect(() => {
    if (value.length === maxLength) {
      handleComplete(value);
    } else {
      setHasCompleted(false);
    }
  }, [value, handleComplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().slice(0, maxLength);
    if (newValue !== value) {
      triggerHaptic('selection');
      onChange(newValue);
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
  };

  const renderCharacterSlots = () => {
    const slots = [];
    for (let i = 0; i < maxLength; i++) {
      const char = value[i] || '';
      const placeholderChar = placeholder[i] || '';
      const isEmpty = !char;
      const isCurrent = i === value.length && focused;

      slots.push(
        <motion.div
          key={i}
          className={`
            relative w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold
            transition-all duration-300 backdrop-blur-xl cursor-pointer
            ${isCurrent 
              ? 'border-white/60 bg-white/20 scale-105' 
              : isEmpty 
                ? 'border-white/30 bg-white/10 hover:border-white/40' 
                : 'border-white/50 bg-white/15'
            }
            ${hasCompleted && i < value.length ? 'border-green-400/60 bg-green-400/10' : ''}
          `}
          animate={isCurrent ? { 
            scale: [1, 1.05, 1], 
            borderColor: ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,0.6)']
          } : {}}
          transition={{ duration: 0.8, repeat: isCurrent ? Infinity : 0 }}
          whileHover={{ scale: 1.02 }}
        >
          <span className={`
            ${isEmpty ? 'text-white/40' : 'text-white'}
            transition-all duration-200
          `}>
            {char || placeholderChar}
          </span>
          
          {isCurrent && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-white/40"
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
    const dots = [];
    for (let i = 0; i < maxLength; i++) {
      dots.push(
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i < value.length ? 'bg-white/80' : 'bg-white/30'
          }`}
          animate={i < value.length ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3, delay: i * 0.1 }}
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
        className="sr-only"
        maxLength={maxLength}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck="false"
      />

      {/* Character slots */}
      <div 
        className="flex justify-center gap-3 cursor-pointer"
        onClick={handleClick}
      >
        {renderCharacterSlots()}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {renderProgressDots()}
      </div>
    </div>
  );
}