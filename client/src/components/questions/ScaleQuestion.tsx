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
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced constants for premium circular slider
  const centerX = 150;
  const centerY = 150;
  const radius = 135;
  const strokeWidth = 6;
  const progressStrokeWidth = 10;
  const thumbRadius = 14;

  // Calculate angle from value (270-degree arc from -135 to +135 degrees)
  const valueToAngle = useCallback((val: number) => {
    const range = question.scale_max - question.scale_min;
    const normalizedValue = (val - question.scale_min) / range;
    // Start from bottom-left (-135 degrees) and go to bottom-right (135 degrees)
    return -135 + (normalizedValue * 270);
  }, [question.scale_min, question.scale_max]);

  // Calculate value from angle
  const angleToValue = useCallback((angle: number) => {
    // Constrain angle to -135 to 135 degrees
    let constrainedAngle = Math.max(-135, Math.min(135, angle));
    
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

  // Handle mouse/touch interaction anywhere in the container
  const handlePointerMove = useCallback((event: any) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerXPage = rect.left + rect.width / 2;
    const centerYPage = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const deltaX = clientX - centerXPage;
    const deltaY = clientY - centerYPage;
    
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    const newValue = angleToValue(angle);
    
    if (newValue !== localValue && newValue >= question.scale_min && newValue <= question.scale_max) {
      setLocalValue(newValue);
      triggerHaptic('selection');
    }
  }, [localValue, angleToValue, triggerHaptic, question.scale_min, question.scale_max]);

  const handlePointerStart = useCallback((event: any) => {
    setIsDragging(true);
    triggerHaptic('selection');
    handlePointerMove(event);
  }, [triggerHaptic, handlePointerMove]);

  const handlePointerEnd = useCallback(() => {
    setIsDragging(false);
    onChange(localValue);
    triggerHaptic('success');
  }, [localValue, onChange, triggerHaptic]);

  // Calculate progress for the arc (corrected for proper visual alignment)
  const progress = (localValue - question.scale_min) / (question.scale_max - question.scale_min);
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees = 75% of full circle
  const strokeDasharray = `${arcLength} ${circumference}`;
  // Corrected: start from full arc length and reduce by progress
  const strokeDashoffset = arcLength - (arcLength * progress);

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
        <div 
          ref={containerRef}
          className="relative cursor-pointer select-none"
          onMouseDown={handlePointerStart}
          onMouseMove={isDragging ? handlePointerMove : undefined}
          onMouseUp={handlePointerEnd}
          onMouseLeave={handlePointerEnd}
          onTouchStart={handlePointerStart}
          onTouchMove={isDragging ? handlePointerMove : undefined}
          onTouchEnd={handlePointerEnd}
        >
          <svg
            width="320"
            height="320"
            viewBox="0 0 300 300"
            className="drop-shadow-2xl pointer-events-none"
          >
            {/* Premium gradient definitions */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="30%" stopColor="#A855F7" />
                <stop offset="70%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#DDD6FE" />
              </linearGradient>
              <radialGradient id="thumbGradient" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#F3F4F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </radialGradient>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="thumbShadow" x="-100%" y="-100%" width="300%" height="300%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.3"/>
              </filter>
            </defs>

            {/* Background ring */}
            <circle
              className="ring"
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              transform={`rotate(-135 ${centerX} ${centerY})`}
            />

            {/* Progress ring with enhanced visuals */}
            <motion.circle
              className="progress-ring"
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth={progressStrokeWidth}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-135 ${centerX} ${centerY})`}
              filter="url(#softGlow)"
              animate={{
                strokeDashoffset: strokeDashoffset,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 35,
                duration: 0.5
              }}
            />

            {/* Premium thumb with shadow */}
            <motion.circle
              cx={thumbPosition.x}
              cy={thumbPosition.y}
              r={thumbRadius}
              fill="url(#thumbGradient)"
              stroke="#ffffff"
              strokeWidth="2"
              className="pointer-events-none"
              animate={{
                cx: thumbPosition.x,
                cy: thumbPosition.y,
                r: isDragging ? thumbRadius * 1.2 : thumbRadius,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
              filter="url(#thumbShadow)"
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

          {/* Min/Max labels positioned at arc endpoints */}
          <p 
            className="min-label absolute text-sm text-white/70 font-medium"
            style={{ 
              left: centerX - 95, 
              top: centerY + 95,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {question.scale_labels?.[0]}
          </p>

          <p 
            className="max-label absolute text-sm text-white/70 font-medium"
            style={{ 
              left: centerX + 95, 
              top: centerY + 95,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {question.scale_labels?.[1]}
          </p>
        </div>
      </div>
    </motion.div>
  );
}