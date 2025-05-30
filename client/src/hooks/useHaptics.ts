import { hapticPatterns } from "@/lib/animations";

export function useHaptics() {
  const triggerHaptic = (type: keyof typeof hapticPatterns) => {
    // Check if vibration API is available
    if ("vibrate" in navigator) {
      const pattern = hapticPatterns[type];
      navigator.vibrate(pattern);
    }
    
    // Visual feedback fallback
    console.log(`Haptic feedback: ${type}`);
  };

  return { triggerHaptic };
}
