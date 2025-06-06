import { useState } from "react";
import { motion } from "framer-motion";
import { WineTermText } from "@/components/WineTastingTooltip";
import { HelpCircle } from "lucide-react";

interface EnhancedScaleQuestionProps {
  question: {
    title: string;
    description?: string;
    category?: string;
    scale_min: number;
    scale_max: number;
    scale_labels?: string[];
  };
  value: number;
  onChange: (value: number) => void;
}

export function EnhancedScaleQuestion({ question, value, onChange }: EnhancedScaleQuestionProps) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  
  const scaleRange = question.scale_max - question.scale_min;
  const tickMarks = Array.from({ length: scaleRange + 1 }, (_, i) => question.scale_min + i);
  
  const handleTickClick = (tickValue: number) => {
    onChange(tickValue);
  };
  
  const getValueDescription = (val: number) => {
    if (question.scale_labels && question.scale_labels.length >= 2) {
      if (val === question.scale_min) return question.scale_labels[0];
      if (val === question.scale_max) return question.scale_labels[1];
      
      // Interpolate description for middle values
      const ratio = (val - question.scale_min) / scaleRange;
      if (ratio < 0.3) return `Closer to ${question.scale_labels[0]}`;
      if (ratio > 0.7) return `Closer to ${question.scale_labels[1]}`;
      return "Moderate";
    }
    return `Value: ${val}`;
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl">
      {/* Question Header */}
      <div className="space-y-3 text-center">
        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
          <WineTermText>{question.title}</WineTermText>
        </h3>
        
        {question.description && (
          <div className="space-y-2">
            <p className="text-white/70 text-sm md:text-base leading-relaxed">
              <WineTermText>{question.description}</WineTermText>
            </p>
            <div className="text-xs text-white/50 bg-white/5 rounded-lg p-2">
              <strong>Scale Guide:</strong> {question.scale_min} = {question.scale_labels?.[0] || "Minimum"}, {question.scale_max} = {question.scale_labels?.[1] || "Maximum"}
            </div>
          </div>
        )}
        
        {question.category && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-full border border-purple-300/30">
            <span className="text-purple-200 text-sm font-medium">
              {question.category}
            </span>
          </div>
        )}
      </div>
      
      {/* Current Selection Display */}
      <div className="text-center bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="text-3xl font-bold text-white mb-1">
          {hoveredValue !== null ? hoveredValue : value}
        </div>
        <div className="text-sm text-white/70">
          {getValueDescription(hoveredValue !== null ? hoveredValue : value)}
        </div>
      </div>
      
      {/* Interactive Scale */}
      <div className="space-y-4">
        {/* Scale Labels */}
        <div className="flex justify-between items-center px-2">
          <div className="text-center">
            <div className="text-sm font-medium text-white">{question.scale_labels?.[0] || "Min"}</div>
            <div className="text-xs text-white/60">{question.scale_min}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-white">{question.scale_labels?.[1] || "Max"}</div>
            <div className="text-xs text-white/60">{question.scale_max}</div>
          </div>
        </div>
        
        {/* Clickable Scale Track */}
        <div className="relative h-16 flex items-center">
          {/* Background Track */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-white/10 rounded-full" />
          
          {/* Progress Track */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{
              left: '0%',
              width: `${((value - question.scale_min) / scaleRange) * 100}%`
            }}
          />
          
          {/* Tick Marks */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between">
            {tickMarks.map((tick) => {
              const isSelected = tick === value;
              const isHovered = tick === hoveredValue;
              const isActive = isSelected || isHovered;
              
              return (
                <motion.button
                  key={tick}
                  onClick={() => handleTickClick(tick)}
                  onMouseEnter={() => setHoveredValue(tick)}
                  onMouseLeave={() => setHoveredValue(null)}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all duration-200 cursor-pointer hover:scale-125 ${
                    isActive
                      ? 'bg-white border-white shadow-lg'
                      : 'bg-white/20 border-white/40 hover:bg-white/30 hover:border-white/60'
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Tick Value Label */}
                  <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium transition-all duration-200 ${
                    isActive ? 'text-white scale-110' : 'text-white/60'
                  }`}>
                    {tick}
                  </div>
                  
                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
        
        {/* Helper Text */}
        <div className="text-center text-xs text-white/50 mt-6">
          Click on any number or drag to select your rating
        </div>
      </div>
      
      {/* Context Help */}
      {question.category === "Intensity" && (
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-200">
              <strong>Intensity Tips:</strong> Consider how pronounced the aromas are. Very light = barely noticeable, Very intense = overwhelming and powerful.
            </div>
          </div>
        </div>
      )}
      
      {question.category === "Body" && (
        <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-200">
              <strong>Body Guide:</strong> Think of the wine's weight in your mouth. Light = like water, Medium = like milk, Full = like cream.
            </div>
          </div>
        </div>
      )}
      
      {question.category === "Overall" && (
        <div className="bg-purple-500/10 border border-purple-400/20 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-purple-300 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-purple-200">
              <strong>Overall Rating:</strong> Consider all aspects - aroma, taste, balance, and your personal enjoyment of this wine.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}