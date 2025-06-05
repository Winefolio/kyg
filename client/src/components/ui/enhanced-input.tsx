import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { modernInputVariants, springTransition } from "@/lib/modern-animations";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

export interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
  hapticFeedback?: boolean;
  focusAnimation?: boolean;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ className, type, error, success, hapticFeedback = true, focusAnimation = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const { triggerHaptic } = useHaptics();

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (hapticFeedback) {
        triggerHaptic('selection');
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      if (hapticFeedback && e.target.value) {
        triggerHaptic('selection');
      }
      props.onChange?.(e);
    };

    const getVariantState = () => {
      if (error) return "error";
      if (success) return "success";
      if (isFocused) return "focus";
      return "initial";
    };

    return (
      <div className="relative">
        <motion.input
          ref={ref}
          type={type}
          className={cn(
            "flex h-12 w-full rounded-xl border-2 bg-white/10 backdrop-blur-xl px-4 py-2 text-sm",
            "text-white placeholder:text-white/60",
            "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-300 transform-gpu",
            error && "border-red-500/50 bg-red-500/10",
            success && "border-green-500/50 bg-green-500/10",
            className
          )}
          variants={modernInputVariants}
          initial="initial"
          animate={getVariantState()}
          transition={springTransition}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          style={{
            transformOrigin: "center"
          }}
          {...(props as any)}
        />

        {/* Focus ring effect */}
        <AnimatePresence>
          {isFocused && focusAnimation && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-purple-400/60 pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>

        {/* Success indicator */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="absolute right-3 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={springTransition}
            >
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="absolute -bottom-6 left-0 text-xs text-red-400"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={springTransition}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

EnhancedInput.displayName = "EnhancedInput";

export { EnhancedInput };