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

  // Enhanced constants for premium circular slider
  const centerX = 150;
  const centerY = 150;
  const radius = 135; // Larger radius for better UX
  const strokeWidth = 8; // Background stroke
  const progressStrokeWidth = 12; // Progress stroke
  const thumbRadius = 16;

  // Calculate angle from value (following Ultimate Prompt specifications)
  const valueToAngle = useCallback((val: number) => {
    const range = question.scale_max - question.scale_min;
    const normalizedValue = (val - question.scale_min) / range;
    // Start from bottom-left (-135 degrees) and go to bottom-right (135 degrees)
    return -135 + (normalizedValue * 270); // 270 degrees total arc
  }, [question.scale_min, question.scale_max]);

  // Calculate value from angle
  const angleToValue = useCallback((angle: number) => {
    // Constrain angle to -135 to 135 degrees
    let constrainedAngle = angle;
    if (constrainedAngle < -135) constrainedAngle = -135;
    if (constrainedAngle > 135) constrainedAngle = 135;
    
    // Normalize angle to 0-1 range
    const normalizedAngle = (constrainedAngle + 135) / 270;
    const range = question.scale_max - question.scale_min;
    return Math.round(question.scale_min + (normalizedAngle * range));
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

  // Calculate progress for the arc (Ultimate Prompt style)
  const progress = (localValue - question.scale_min) / (question.scale_max - question.scale_min);
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - progress * 0.75); // 75% of circle for visual appeal

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
        {/* Premium Circular SVG Slider */}
        <div className="relative">
          <svg
            ref={svgRef}
            width="320"
            height="320"
            viewBox="0 0 300 300"
            className="drop-shadow-2xl"
          >
            {/* Enhanced gradient definitions */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="50%" stopColor="hsl(var(--primary) / 0.8)" />
                <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
              </linearGradient>
              <linearGradient id="thumbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="hsl(var(--primary))" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Background ring */}
            <circle
              className="ring"
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted) / 0.3)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Progress ring with enhanced animation */}
            <motion.circle
              className="progress-ring"
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth={progressStrokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-135 ${centerX} ${centerY})`}
              filter="url(#glow)"
              animate={{
                strokeDashoffset: strokeDashoffset,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
                duration: 0.6
              }}
            />

            {/* Draggable thumb with enhanced styling */}
            <motion.circle
              cx={thumbPosition.x}
              cy={thumbPosition.y}
              r={thumbRadius}
              fill="url(#thumbGradient)"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              className="cursor-grab active:cursor-grabbing"
              drag
              dragConstraints={svgRef}
              dragElastic={0}
              onDrag={handleDrag}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              animate={isDragging ? { scale: 1.3, r: thumbRadius * 1.2 } : { scale: 1, r: thumbRadius }}
              whileHover={{ scale: 1.1, r: thumbRadius * 1.1 }}
              whileTap={{ scale: 1.3 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              filter="url(#glow)"
            />
          </svg>

          {/* Enhanced center value display */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="text-center"
              animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
              <motion.p
                className="text-5xl font-bold text-white mb-2 filter drop-shadow-lg"
                animate={isDragging ? { scale: 1.2 } : { scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
              >
                {Math.round(localValue)}
              </motion.p>
              <span className="text-white/60 text-xs font-medium tracking-wide">
                {question.category.toUpperCase()}
              </span>
            </motion.div>
          </div>

          {/* Min/Max labels positioned around circle */}
          <p 
            className="min-label absolute text-sm text-white/70 font-medium"
            style={{ 
              left: centerX - 110, 
              top: centerY + 5,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {question.scale_labels?.[0]}
          </p>

          <p 
            className="max-label absolute text-sm text-white/70 font-medium"
            style={{ 
              left: centerX + 110, 
              top: centerY + 5,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {question.scale_labels?.[1]}
          </p>
        </div>

        {/* Enhanced value indicators */}
        <div className="flex justify-center space-x-3 mt-4">
          {Array.from({ length: question.scale_max - question.scale_min + 1 }, (_, i) => {
            const indicatorValue = i + question.scale_min;
            const isActive = indicatorValue <= localValue;
            const isCurrent = indicatorValue === localValue;
            return (
              <motion.div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  isCurrent 
                    ? 'w-3 h-8 bg-gradient-to-t from-primary to-primary/60 shadow-lg' 
                    : isActive 
                      ? 'w-2 h-6 bg-primary/60' 
                      : 'w-2 h-4 bg-white/20'
                }`}
                animate={
                  isCurrent && isDragging 
                    ? { scale: 1.3, y: -4 } 
                    : isActive && isDragging 
                      ? { scale: 1.1, y: -1 } 
                      : { scale: 1, y: 0 }
                }
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
