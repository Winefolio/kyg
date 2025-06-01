import { useCallback, useRef } from "react";
import { useHaptics } from "./useHaptics";

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  hapticFeedback?: boolean;
}

export function useAnimations() {
  const { triggerHaptic } = useHaptics();
  const animationRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerElement = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      animationRefs.current.set(id, element);
    } else {
      animationRefs.current.delete(id);
    }
  }, []);

  const animateElement = useCallback((
    id: string, 
    animation: string, 
    config: AnimationConfig = {}
  ) => {
    const element = animationRefs.current.get(id);
    if (!element) return;

    const {
      duration = 300,
      delay = 0,
      easing = 'ease-out',
      hapticFeedback = false
    } = config;

    // Apply CSS animation
    element.style.transition = `all ${duration}ms ${easing}`;
    
    if (delay > 0) {
      setTimeout(() => {
        element.classList.add(animation);
        if (hapticFeedback) {
          triggerHaptic('selection');
        }
      }, delay);
    } else {
      element.classList.add(animation);
      if (hapticFeedback) {
        triggerHaptic('selection');
      }
    }

    // Clean up animation class
    setTimeout(() => {
      element.classList.remove(animation);
    }, duration + delay);
  }, [triggerHaptic]);

  const pulseElement = useCallback((id: string) => {
    animateElement(id, 'animate-pulse', { 
      duration: 600, 
      hapticFeedback: true 
    });
  }, [animateElement]);

  const shakeElement = useCallback((id: string) => {
    animateElement(id, 'animate-shake', { 
      duration: 400, 
      hapticFeedback: true 
    });
  }, [animateElement]);

  const bounceElement = useCallback((id: string) => {
    animateElement(id, 'animate-bounce', { 
      duration: 500, 
      hapticFeedback: true 
    });
  }, [animateElement]);

  return {
    registerElement,
    animateElement,
    pulseElement,
    shakeElement,
    bounceElement
  };
}