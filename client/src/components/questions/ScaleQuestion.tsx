import { useState } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
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
  const [isDragging, setIsDragging] = useState(false);

  const handleValueChange = (newValue: number[]) => {
    const val = newValue[0];
    if (val !== value) {
      triggerHaptic('selection');
      onChange(val);
    }
  };

  const handlePointerDown = () => {
    setIsDragging(true);
    triggerHaptic('selection');
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 bg-blue-600/30 rounded-full text-blue-200 text-sm font-medium">
            {question.category}
          </span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-3">{question.title}</h3>
        <p className="text-white/70">{question.description}</p>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Slider
            value={[value]}
            onValueChange={handleValueChange}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            min={question.scale_min}
            max={question.scale_max}
            step={1}
            className="slider"
          />
          <div className="flex justify-between text-white/60 text-sm mt-2">
            <span>{question.scale_labels[0]}</span>
            <motion.span 
              className="text-xl font-semibold text-white"
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            >
              {value}
            </motion.span>
            <span>{question.scale_labels[1]}</span>
          </div>
        </div>
        
        {/* Scale indicators */}
        <div className="flex justify-between">
          {Array.from({ length: question.scale_max - question.scale_min + 1 }, (_, i) => {
            const isActive = i + question.scale_min <= value;
            return (
              <motion.div
                key={i}
                className={`w-2 h-8 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-purple-500' : 'bg-white/20'
                }`}
                animate={isActive && isDragging ? { scale: 1.2 } : { scale: 1 }}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
