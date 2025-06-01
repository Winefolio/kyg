import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useHaptics } from "@/hooks/useHaptics";

interface SessionIdInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (sessionId: string) => void;
  className?: string;
}

export function SessionIdInput({ 
  value, 
  onChange, 
  onComplete,
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
    const newValue = e.target.value.trim();
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

  const renderProgressBar = () => {
    const progress = Math.min((value.length / 8) * 100, 100);
    
    return (
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-xl">
        <motion.div
          className={`h-full rounded-full transition-all duration-500 ${
            progress >= 100 ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                            : 'bg-gradient-to-r from-blue-400 to-purple-500'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    );
  };

  const renderCharacterDisplay = () => {
    const displayValue = value || '';
    const maskedChars = displayValue.slice(0, -4).replace(/./g, '•');
    const visibleChars = displayValue.slice(-4);
    
    return (
      <div className="text-center space-y-2">
        <motion.div
          className={`text-2xl md:text-3xl font-mono tracking-wider transition-all duration-300 ${
            focused ? 'text-white' : 'text-white/80'
          }`}
          animate={hasCompleted ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.6 }}
        >
          {maskedChars}{visibleChars}
          {focused && (
            <motion.span
              className="text-white/60"
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              |
            </motion.span>
          )}
        </motion.div>
        
        {value.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/60 text-sm"
          >
            {value.length}/8+ characters
          </motion.p>
        )}
      </div>
    );
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
        placeholder="Session ID"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck="false"
      />

      {/* Interactive display area */}
      <motion.div
        className={`
          relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border-2 
          transition-all duration-300 cursor-text min-h-[120px] flex flex-col justify-center
          ${focused 
            ? 'border-blue-400/60 bg-white/15 shadow-xl shadow-blue-500/20' 
            : 'border-white/20 hover:border-white/30'
          }
          ${hasCompleted ? 'border-green-400/60 bg-green-400/5' : ''}
        `}
        onClick={handleClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Character display */}
        {renderCharacterDisplay()}

        {/* Completion indicator */}
        {hasCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          </motion.div>
        )}

        {/* Placeholder when empty */}
        {value.length === 0 && !focused && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: focused ? 0 : 1 }}
            className="text-center"
          >
            <p className="text-white/40 text-lg font-medium">Tap to enter Session ID</p>
            <p className="text-white/30 text-sm mt-1">e.g., abc123def456</p>
          </motion.div>
        )}
      </motion.div>

      {/* Progress bar */}
      {value.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {renderProgressBar()}
          {hasCompleted && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-green-400 text-sm font-medium"
            >
              Ready to join! 🎉
            </motion.p>
          )}
        </motion.div>
      )}
    </div>
  );
}