import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModernSlider } from "@/components/ui/modern-slider";
import { Label } from "@/components/ui/label";
import { DynamicTextRenderer } from "@/components/ui/DynamicTextRenderer";
import { BookOpen } from "lucide-react";
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
      className="bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-purple-900/80 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-blue-400/30 shadow-2xl shadow-blue-900/50 h-full flex flex-col justify-center"
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600/40 to-blue-500/30 rounded-full text-blue-200 text-xs sm:text-sm font-medium border border-blue-400/20 backdrop-blur-sm">
            {question.category}
          </span>
          <div className="flex items-center text-blue-300/60 text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Hover terms for definitions</span>
            <span className="sm:hidden">Tap terms</span>
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-3 leading-tight">
          <DynamicTextRenderer text={question.title} />
        </h3>
        <p className="text-white/80 text-sm sm:text-base leading-relaxed">
          <DynamicTextRenderer text={question.description} />
        </p>
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
