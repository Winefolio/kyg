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
  onChange: (value: number) => void;
  className?: string;
}

export function ModernSlider({ 
  value, 
  min, 
  max, 
  step = 1, 
  labels,
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
    <div className={cn("space-y-4", className)}>
      {/* Labels */}
      {labels && (
        <div className="flex justify-between text-sm text-white/70">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}

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

          {/* Progress fill */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            style={{ width: `${percentage}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-400/50 to-pink-400/50 rounded-full blur-sm"
              animate={{ opacity: isDragging ? 1 : 0.3 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>

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

        {/* Thumb */}
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
              ? "0 0 25px rgba(147, 51, 234, 0.6)" 
              : "0 4px 12px rgba(0, 0, 0, 0.3)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Thumb glow */}
          <motion.div
            className="absolute inset-0 bg-purple-400/30 rounded-full blur-md"
            animate={{ 
              scale: isDragging ? 2 : 1,
              opacity: isDragging ? 1 : 0
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

      {/* Value range indicators */}
      <div className="flex justify-between text-xs text-white/50">
        <span>{min}</span>
        <span className="font-medium text-white/80">{value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}