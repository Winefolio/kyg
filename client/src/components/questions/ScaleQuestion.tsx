import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModernSlider } from "@/components/ui/modern-slider";
import { Label } from "@/components/ui/label";
import { modernCardVariants, springTransition } from "@/lib/modern-animations";
import { useHaptics } from "@/hooks/useHaptics";

interface ScaleQuestionProps {
  question: {
    title: string;
    description: string;
    category: string;
    scale_min: number;
    scale_max: number;
    scale_labels: [string, string];
  };
  value: number;
  onChange: (value: number) => void;
}

export function ScaleQuestion({ question, value, onChange }: ScaleQuestionProps) {
  const { triggerHaptic } = useHaptics();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-white/20 shadow-2xl h-full flex flex-col justify-center"
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="px-2 py-1 bg-blue-600/30 rounded-full text-blue-200 text-xs sm:text-sm font-medium">
            {question.category}
          </span>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{question.title}</h3>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed">{question.description}</p>
      </div>

      <div className="space-y-4">
        <ModernSlider
          value={value}
          min={question.scale_min}
          max={question.scale_max}
          step={1}
          labels={question.scale_labels}
          onChange={onChange}
        />
        
        {/* Scale indicators - clickable dash marks */}
        <div className="flex justify-between">
          {Array.from({ length: question.scale_max - question.scale_min + 1 }, (_, i) => {
            const indicatorValue = i + question.scale_min;
            const isActive = indicatorValue <= value;
            const isCurrentValue = indicatorValue === value;
            return (
              <motion.div
                key={i}
                className={`w-2 h-6 sm:h-8 rounded-full cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? isCurrentValue
                      ? 'bg-purple-400 shadow-lg shadow-purple-500/50' 
                      : 'bg-purple-500' 
                    : 'bg-white/20 hover:bg-white/30 hover:scale-110'
                }`}
                onClick={() => {
                  triggerHaptic('selection');
                  onChange(indicatorValue);
                }}
                animate={
                  isCurrentValue 
                    ? { scaleY: 1.1, scaleX: 1.1 }
                    : { scaleY: 1, scaleX: 1 }
                }
                whileHover={{ scaleY: 1.1, scaleX: 1.1 }}
                whileTap={{ scaleY: 0.9, scaleX: 0.9 }}
                title={`Set value to ${indicatorValue}`}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
