import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { inputVariants } from "@/lib/micro-animations"
import { useHaptics } from "@/hooks/useHaptics"

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean
  success?: boolean
  hapticFeedback?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error = false, success = false, hapticFeedback = true, onFocus, onBlur, onChange, ...props }, ref) => {
    const { triggerHaptic } = useHaptics()
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      if (hapticFeedback) {
        triggerHaptic('selection')
      }
      if (onFocus) {
        onFocus(e)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      if (onBlur) {
        onBlur(e)
      }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0)
      if (onChange) {
        onChange(e)
      }
    }

    const getAnimationState = () => {
      if (error) return "error"
      if (success) return "success"
      if (isFocused) return "focus"
      return "idle"
    }

    return (
      <motion.input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200",
          className
        )}
        variants={inputVariants}
        animate={getAnimationState()}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        style={{
          transformOrigin: "center",
          boxShadow: isFocused 
            ? "0 0 0 3px rgba(59, 130, 246, 0.1)" 
            : "0 1px 3px rgba(0,0,0,0.1)"
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
