import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

interface BubbleCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  onComplete?: (code: string) => void;
  className?: string;
  label?: string;
  description?: string;
}

export function BubbleCodeInput({ 
  value, 
  onChange, 
  maxLength, 
  placeholder = "",
  onComplete,
  className = "",
  label,
  description
}: BubbleCodeInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { triggerHaptic } = useHaptics();

  useEffect(() => {
    if (value.length === maxLength && onComplete) {
      onComplete(value);
    }
  }, [value, maxLength, onComplete]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.length === maxLength && onComplete) {
      triggerHaptic('success');
      onComplete(value);
    }
  };

  const renderBubbleSlots = () => {
    const slots = [];
    
    for (let i = 0; i < maxLength; i++) {
      const char = value[i] || '';
      const isEmpty = !char;
      const isCurrent = i === value.length && focused;
      const isComplete = value.length === maxLength;

      slots.push(
        <motion.div
          key={i}
          className={`
            relative w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border-2 flex items-center justify-center text-xl font-bold
            backdrop-blur-xl cursor-pointer touch-manipulation font-mono
            transition-all duration-300
            ${isEmpty 
              ? 'border-white/30 bg-white/5 hover:border-white/40' 
              : isComplete
                ? 'border-green-400/70 bg-green-400/10 shadow-green-400/20'
                : 'border-white/60 bg-white/15 shadow-lg'
            }
          `}
          onClick={handleClick}
          animate={
            isCurrent ? {
              scale: [1, 1.05, 1],
              borderColor: ['rgba(59, 130, 246, 0.8)', 'rgba(96, 165, 250, 0.9)', 'rgba(59, 130, 246, 0.8)']
            } : {}
          }
          transition={{
            duration: 1.2,
            repeat: isCurrent ? Infinity : 0,
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className={`
            ${isEmpty ? 'text-white/40' : 'text-white'}
            transition-all duration-200 select-none
          `}>
            {char || (isEmpty && placeholder ? placeholder[i] || '' : '')}
          </span>
          
          <AnimatePresence>
            {isCurrent && (
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-blue-400/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      );
    }
    
    return slots;
  };

  const renderProgressDots = () => {
    const dots = [];
    
    for (let i = 0; i < maxLength; i++) {
      const isActive = i < value.length;
      const isComplete = value.length === maxLength;
      
      dots.push(
        <motion.div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isComplete 
              ? 'bg-green-400/80' 
              : isActive 
                ? 'bg-blue-400/80' 
                : 'bg-white/30'
          }`}
          animate={
            isComplete && isActive ? {
              scale: [1, 1.3, 1.1],
              backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(34, 197, 94, 1)", "rgba(34, 197, 94, 0.8)"]
            } : isActive ? {
              scale: [1, 1.2, 1]
            } : {}
          }
          transition={{ 
            duration: 0.4, 
            delay: i * 0.06,
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
        />
      );
    }
    
    return dots;
  };

  return (
    <motion.div 
      className={`space-y-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
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

      {/* Label and description */}
      {(label || description) && (
        <div className="text-center space-y-2">
          {label && (
            <h3 className="text-white/90 text-lg font-semibold">{label}</h3>
          )}
          {description && (
            <p className="text-white/60 text-sm">{description}</p>
          )}
        </div>
      )}
      
      {/* Bubble character slots */}
      <div 
        className="flex justify-center gap-2 sm:gap-3 cursor-pointer px-2"
        onClick={handleClick}
      >
        {renderBubbleSlots()}
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center space-x-2">
        {renderProgressDots()}
      </div>

      {/* Completion indicator */}
      <AnimatePresence>
        {value.length === maxLength && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <p className="text-green-400 text-sm font-medium">
              Ready to proceed! ✨
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}