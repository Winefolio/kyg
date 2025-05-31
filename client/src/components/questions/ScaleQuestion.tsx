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

  // Calculate fill percentage for wine glass animation
  const fillPercentage = ((value - question.scale_min) / (question.scale_max - question.scale_min)) * 100;

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

      <div className="space-y-8">
        {/* Animated Wine Glass */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <svg
              viewBox="0 0 120 160"
              className="w-32 h-40"
              style={{ filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.3))' }}
            >
              <defs>
                {/* Wine gradient */}
                <linearGradient id="wine-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#7c3aed', stopOpacity: 0.9 }} />
                  <stop offset="50%" style={{ stopColor: '#a855f7', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 0.7 }} />
                </linearGradient>
                
                {/* Glass reflection gradient */}
                <linearGradient id="glass-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.3)', stopOpacity: 1 }} />
                  <stop offset="50%" style={{ stopColor: 'rgba(255,255,255,0.1)', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'rgba(255,255,255,0.05)', stopOpacity: 1 }} />
                </linearGradient>

                {/* Clipping path for wine fill */}
                <clipPath id="wine-fill-clip">
                  <motion.rect
                    x="25"
                    width="70"
                    height="85"
                    initial={{ y: 85 }}
                    animate={{ 
                      y: 85 - (fillPercentage * 0.85),
                      transition: { 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 20,
                        duration: 0.6
                      }
                    }}
                  />
                </clipPath>
              </defs>

              {/* Wine glass bowl outline */}
              <path
                d="M25 30 Q25 20 35 20 L85 20 Q95 20 95 30 L95 85 Q95 95 85 95 L35 95 Q25 95 25 85 Z"
                fill="url(#glass-gradient)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />

              {/* Wine liquid */}
              <motion.path
                d="M25 30 Q25 20 35 20 L85 20 Q95 20 95 30 L95 85 Q95 95 85 95 L35 95 Q25 95 25 85 Z"
                fill="url(#wine-gradient)"
                clipPath="url(#wine-fill-clip)"
                animate={{
                  opacity: fillPercentage > 0 ? 1 : 0,
                  transition: { duration: 0.3 }
                }}
              />

              {/* Wine glass stem */}
              <rect
                x="57"
                y="95"
                width="6"
                height="35"
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />

              {/* Wine glass base */}
              <ellipse
                cx="60"
                cy="145"
                rx="20"
                ry="8"
                fill="rgba(255,255,255,0.15)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />

              {/* Glass highlight */}
              <path
                d="M30 25 Q30 22 32 22 L40 22 Q42 22 42 25 L42 40 Q40 42 38 42 L34 42 Q32 42 32 40 Z"
                fill="rgba(255,255,255,0.3)"
                opacity="0.6"
              />
            </svg>

            {/* Fill level indicator */}
            <motion.div
              className="absolute -right-12 top-1/2 transform -translate-y-1/2"
              animate={{
                opacity: isDragging ? 1 : 0.7,
                scale: isDragging ? 1.1 : 1
              }}
            >
              <div className="bg-purple-600/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-400/30">
                <div className="text-white font-semibold text-lg">{Math.round(fillPercentage)}%</div>
                <div className="text-purple-200 text-xs">filled</div>
              </div>
            </motion.div>
          </div>
        </div>

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
        
        {/* Enhanced scale indicators with wine theme */}
        <div className="flex justify-between">
          {Array.from({ length: question.scale_max - question.scale_min + 1 }, (_, i) => {
            const stepValue = i + question.scale_min;
            const isActive = stepValue <= value;
            const intensity = isActive ? (stepValue / question.scale_max) : 0;
            
            return (
              <motion.div
                key={i}
                className={`w-3 h-8 rounded-full transition-all duration-500 ${
                  isActive 
                    ? 'bg-gradient-to-t from-purple-600 to-purple-400 shadow-lg shadow-purple-500/30' 
                    : 'bg-white/20'
                }`}
                animate={{
                  scale: isActive && isDragging ? 1.3 : 1,
                  opacity: isActive ? 0.8 + (intensity * 0.2) : 0.4
                }}
                style={{
                  background: isActive 
                    ? `linear-gradient(to top, hsl(${270 + intensity * 20}, 70%, ${50 + intensity * 10}%), hsl(${270 + intensity * 20}, 70%, ${65 + intensity * 10}%))`
                    : undefined
                }}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
