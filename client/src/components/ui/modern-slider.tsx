import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

interface ModernSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  labels?: [string, string];
  labelClassNames?: [string, string];
  progressPercent?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function ModernSlider({ 
  value, 
  min, 
  max, 
  step = 1, 
  labels,
  labelClassNames,
  progressPercent,
  onChange, 
  className 
}: ModernSliderProps) {
  const { triggerHaptic } = useHaptics();
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoverPosition, setHoverPosition] = React.useState<number | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercentage = (clickX / rect.width) * 100;
    const newValue = Math.round((clickPercentage / 100) * (max - min) + min);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    triggerHaptic('selection');
    onChange(clampedValue);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const hoverPercentage = (hoverX / rect.width) * 100;
    setHoverPosition(Math.max(0, Math.min(100, hoverPercentage)));
  };

  const dashCount = Math.floor((max - min) / step) + 1;
  const dashPositions = Array.from({ length: dashCount }, (_, i) => (i / (dashCount - 1)) * 100);

  return (
    <div className={cn("relative", className)}>
      {/* Slider Track */}
      <div className="relative">
        <motion.div
          ref={trackRef}
          className="relative h-3 bg-white/20 rounded-full cursor-pointer overflow-hidden backdrop-blur-sm"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPosition(null)}
          whileHover={{ scaleY: 1.2 }}
          transition={{ duration: 0.2 }}
        >
          {/* Hover indicator */}
          <AnimatePresence>
            {hoverPosition !== null && !isDragging && (
              <motion.div
                className="absolute top-1/2 w-2 h-8 bg-white/30 rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none"
                style={{ left: `${hoverPosition}%` }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.15 }}
              />
            )}
          </AnimatePresence>

          {/* Progress fill with dynamic glow */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            {/* Dynamic intensity glow effect */}
            <motion.div 
              className="absolute inset-0 rounded-full blur-md"
              style={{ 
                background: 'radial-gradient(circle, rgba(233,168,255,0.7) 0%, rgba(192,132,252,0) 70%)' 
              }}
              animate={{ 
                opacity: (progressPercent || percentage / 100), // Glow opacity increases with value
                scale: 1 + ((progressPercent || percentage / 100) * 0.5) // Glow size increases with value
              }}
              transition={{ duration: 0.2 }}
            />
            {/* Base glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-400/50 to-pink-400/50 rounded-full blur-sm"
              animate={{ opacity: isDragging ? 1 : 0.3 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>

          {/* Energy Hotspot Glow */}
          <motion.div
            className="absolute top-1/2 w-8 h-8 rounded-full pointer-events-none -translate-y-1/2 -translate-x-1/2"
            style={{ 
              background: 'radial-gradient(circle, rgba(233, 168, 255, 0.5) 0%, rgba(192, 132, 252, 0) 65%)' 
            }}
            animate={{ 
              left: `${percentage}%`,
              scale: 1 + (percentage / 100) * 0.5 // Glow gets bigger at higher values
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />

          {/* Dash marks */}
          {dashPositions.map((position, index) => (
            <motion.div
              key={index}
              className="absolute top-1/2 w-0.5 h-6 bg-white/40 rounded-full -translate-y-1/2 -translate-x-1/2 cursor-pointer"
              style={{ left: `${position}%` }}
              whileHover={{ 
                scaleY: 1.5, 
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                transition: { duration: 0.15 }
              }}
              onClick={(e) => {
                e.stopPropagation();
                const dashValue = Math.round((position / 100) * (max - min) + min);
                triggerHaptic('selection');
                onChange(dashValue);
              }}
            />
          ))}
        </motion.div>

        {/* Thumb with dynamic glow */}
        <motion.div
          className="absolute top-1/2 w-6 h-6 bg-white rounded-full shadow-lg cursor-grab -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${percentage}%` }}
          drag="x"
          dragConstraints={trackRef}
          dragElastic={0}
          onDragStart={() => {
            setIsDragging(true);
            triggerHaptic('selection');
          }}
          onDragEnd={() => setIsDragging(false)}
          onDrag={(_, info) => {
            if (!trackRef.current) return;
            
            const rect = trackRef.current.getBoundingClientRect();
            const dragPercentage = ((info.point.x - rect.left) / rect.width) * 100;
            const newValue = Math.round((dragPercentage / 100) * (max - min) + min);
            const clampedValue = Math.max(min, Math.min(max, newValue));
            
            if (clampedValue !== value) {
              onChange(clampedValue);
            }
          }}
          whileHover={{ 
            scale: 1.2,
            boxShadow: "0 0 20px rgba(147, 51, 234, 0.5)"
          }}
          whileDrag={{ 
            scale: 1.3,
            boxShadow: "0 0 30px rgba(147, 51, 234, 0.8)"
          }}
          animate={{
            boxShadow: isDragging 
              ? `0px 0px 15px 5px rgba(192, 132, 252, ${0.5 + ((progressPercent || percentage/100)*0.5)})` 
              : `0px 0px 8px 2px rgba(192, 132, 252, ${0.2 + ((progressPercent || percentage/100)*0.3)})`
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Dynamic intensity thumb glow */}
          <motion.div
            className="absolute inset-0 bg-purple-400/30 rounded-full blur-md"
            animate={{ 
              scale: isDragging ? 2 : 1 + ((progressPercent || percentage/100) * 0.5),
              opacity: isDragging ? 1 : 0.3 + ((progressPercent || percentage/100) * 0.4)
            }}
            transition={{ duration: 0.2 }}
          />
        </motion.div>

        {/* Value display */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm"
              style={{ left: `${percentage}%` }}
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {value}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}