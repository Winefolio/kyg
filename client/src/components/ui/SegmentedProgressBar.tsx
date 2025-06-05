import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Section {
  name: string;
  progress: number;
  isActive: boolean;
  isCompleted: boolean;
}

interface SegmentedProgressBarProps {
  sections: Section[];
  currentWineName?: string;
  currentOverallProgressInfo?: string;
}

export function SegmentedProgressBar({ 
  sections, 
  currentWineName, 
  currentOverallProgressInfo 
}: SegmentedProgressBarProps) {
  return (
    <div className="space-y-2">
      {/* Wine Name & Overall Progress */}
      <div className="flex items-center justify-between">
        {currentWineName && (
          <h3 className="text-white font-medium text-sm truncate">
            {currentWineName}
          </h3>
        )}
        {currentOverallProgressInfo && (
          <span className="text-white/60 text-xs">
            {currentOverallProgressInfo}
          </span>
        )}
      </div>

      {/* Segmented Progress */}
      <div className="grid grid-cols-3 gap-2">
        {sections.map((section, index) => (
          <motion.div
            key={section.name}
            className="space-y-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Section Name */}
            <div className="flex items-center justify-between">
              <span 
                className={`text-xs font-medium transition-colors duration-300 ${
                  section.isActive 
                    ? 'text-white' 
                    : section.isCompleted 
                      ? 'text-green-300' 
                      : 'text-white/50'
                }`}
              >
                {section.name}
              </span>
              {section.isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 bg-green-400 rounded-full flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </motion.div>
              )}
              {section.isActive && !section.isCompleted && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                />
              )}
            </div>
            
            {/* Progress Bar */}
            <motion.div
              className={`transition-all duration-300 ${
                section.isActive ? 'scale-105' : 'scale-100'
              }`}
            >
              <Progress 
                value={section.progress} 
                className={`h-1.5 transition-all duration-300 ${
                  section.isActive 
                    ? 'bg-white/30' 
                    : section.isCompleted 
                      ? 'bg-green-500/20' 
                      : 'bg-white/10'
                }`}
                style={{
                  '--progress-foreground': section.isActive 
                    ? 'hsl(var(--primary))' 
                    : section.isCompleted 
                      ? 'hsl(142, 76%, 36%)' 
                      : 'hsl(var(--muted-foreground))'
                } as React.CSSProperties}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}