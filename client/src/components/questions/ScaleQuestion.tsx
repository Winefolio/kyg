import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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
  const [localValue, setLocalValue] = useState(value);
  const svgRef = useRef<SVGSVGElement>(null);

  // Constants for the circular slider
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const strokeWidth = 12;
  const thumbRadius = 16;

  // Calculate angle from value
  const valueToAngle = useCallback((val: number) => {
    const range = question.scale_max - question.scale_min;
    const normalizedValue = (val - question.scale_min) / range;
    // Start from top (-90 degrees) and go clockwise
    return -90 + (normalizedValue * 270); // 270 degrees total arc
  }, [question.scale_min, question.scale_max]);

  // Calculate value from angle
  const angleToValue = useCallback((angle: number) => {
    // Normalize angle to 0-270 range
    let normalizedAngle = angle + 90;
    if (normalizedAngle < 0) normalizedAngle += 360;
    if (normalizedAngle > 270) normalizedAngle = 270;
    if (normalizedAngle < 0) normalizedAngle = 0;
    
    const range = question.scale_max - question.scale_min;
    const normalizedValue = normalizedAngle / 270;
    return Math.round(question.scale_min + (normalizedValue * range));
  }, [question.scale_min, question.scale_max]);

  // Calculate thumb position
  const getThumbPosition = useCallback((val: number) => {
    const angle = valueToAngle(val);
    const angleRad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleRad),
      y: centerY + radius * Math.sin(angleRad)
    };
  }, [valueToAngle]);

  // Handle drag
  const handleDrag = useCallback((event: any, info: any) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const centerXPage = rect.left + centerX;
    const centerYPage = rect.top + centerY;
    
    const deltaX = info.point.x - centerXPage;
    const deltaY = info.point.y - centerYPage;
    
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    const newValue = angleToValue(angle);
    
    if (newValue !== localValue) {
      setLocalValue(newValue);
      triggerHaptic('selection');
    }
  }, [localValue, angleToValue, triggerHaptic]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    triggerHaptic('selection');
  }, [triggerHaptic]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onChange(localValue);
    triggerHaptic('success');
  }, [localValue, onChange, triggerHaptic]);

  // Calculate progress for the arc
  const progress = (localValue - question.scale_min) / (question.scale_max - question.scale_min);
  const progressArcLength = 270 * progress; // 270 degrees total arc
  const circumference = 2 * Math.PI * radius * (270 / 360); // Partial circumference for 270 degrees

  const thumbPosition = getThumbPosition(localValue);

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

      <div className="flex flex-col items-center space-y-6">
        {/* Circular Slider */}
        <div className="relative">
          <svg
            ref={svgRef}
            width="300"
            height="300"
            viewBox="0 0 300 300"
            className="drop-shadow-lg"
          >
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
              <linearGradient id="thumbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Background track */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
              strokeDashoffset={0}
              transform={`rotate(-135 ${centerX} ${centerY})`}
              strokeLinecap="round"
            />

            {/* Progress track */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${2 * Math.PI * radius}`}
              strokeDashoffset={circumference - (progressArcLength / 270) * circumference}
              transform={`rotate(-135 ${centerX} ${centerY})`}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />

            {/* Draggable thumb */}
            <motion.circle
              cx={thumbPosition.x}
              cy={thumbPosition.y}
              r={thumbRadius}
              fill="url(#thumbGradient)"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              className="cursor-grab"
              drag
              dragConstraints={svgRef}
              dragElastic={0}
              onDrag={handleDrag}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              animate={isDragging ? { scale: 1.2 } : { scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 1.2 }}
            />
          </svg>

          {/* Center value display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-center"
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            >
              <motion.span 
                className="text-4xl font-bold text-white block"
                animate={isDragging ? { scale: 1.2 } : { scale: 1 }}
              >
                {localValue}
              </motion.span>
              <span className="text-white/60 text-sm">
                {question.scale_labels[0]} - {question.scale_labels[1]}
              </span>
            </motion.div>
          </div>
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between w-full max-w-xs text-white/70 text-sm">
          <span className="font-medium">{question.scale_labels[0]}</span>
          <span className="font-medium">{question.scale_labels[1]}</span>
        </div>

        {/* Value indicators */}
        <div className="flex justify-center space-x-2">
          {Array.from({ length: question.scale_max - question.scale_min + 1 }, (_, i) => {
            const indicatorValue = i + question.scale_min;
            const isActive = indicatorValue <= localValue;
            return (
              <motion.div
                key={i}
                className={`w-2 h-6 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-purple-400' : 'bg-white/20'
                }`}
                animate={isActive && isDragging ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
