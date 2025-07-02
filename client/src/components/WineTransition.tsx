import { motion, AnimatePresence } from "framer-motion";
import { Wine, ArrowRight, Sparkles, ChevronRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface WineTransitionProps {
  currentWine: {
    wineName: string;
    wineDescription?: string;
    wineImageUrl?: string;
    position: number;
  };
  nextWine?: {
    wineName: string;
    wineDescription?: string;
    wineImageUrl?: string;
    position: number;
  };
  onContinue: () => void;
  isComplete?: boolean;
  sectionType?: string;
}

export function WineTransition({ currentWine, nextWine, onContinue, isComplete, sectionType }: WineTransitionProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const getSectionDisplayName = (section?: string) => {
    switch (section) {
      case 'intro': return 'Introduction';
      case 'deep_dive': return 'Deep Dive';
      case 'ending': return 'Final Thoughts';
      default: return 'Deep Dive';
    }
  };

  return (
    <div className="h-[100dvh] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800">
        {/* Orange overlay removed for better mobile visibility */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Simplified floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeOut",
            }}
            style={{
              left: `${(i * 10) + Math.random() * 10}%`,
              top: `${100 + Math.random() * 20}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 h-full flex items-center justify-center p-6">
        <motion.div
          className="max-w-2xl w-full"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Completion Badge */}
          <motion.div
            className="text-center mb-8"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-xl rounded-full px-6 py-3 border border-white/20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-amber-300" />
              </motion.div>
              <span className="text-white font-medium">
                {isComplete ? "Tasting Experience Complete!" : 
                 currentWine.position === 0 ? "Package Introduction Complete" : 
                 `Wine ${currentWine.position} - ${getSectionDisplayName(sectionType)} Complete`}
              </span>
            </div>
          </motion.div>

          {/* Wine Showcase */}
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 mb-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Wine Image */}
              <motion.div
                className="flex-shrink-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {currentWine.wineImageUrl ? (
                  <div className="relative">
                    <div className="w-48 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
                      <img 
                        src={currentWine.wineImageUrl} 
                        alt={currentWine.wineName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl -z-10" />
                  </div>
                ) : (
                  <div className="w-48 h-64 rounded-2xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center border-4 border-white/10">
                    <Wine className="w-16 h-16 text-white/60" />
                  </div>
                )}
              </motion.div>

              {/* Wine Details */}
              <div className="flex-1 text-center lg:text-left space-y-4">
                <motion.h1
                  className="text-4xl lg:text-5xl font-bold text-white leading-tight"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  {currentWine.wineName}
                </motion.h1>
                
                <AnimatePresence>
                  {showDetails && currentWine.wineDescription && (
                    <motion.p
                      className="text-lg text-white/80 leading-relaxed max-w-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      {currentWine.wineDescription}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div
                  className="flex flex-wrap gap-2 justify-center lg:justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                >
                  {currentWine.position > 0 && (
                    <div className="px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm font-medium border border-white/20">
                      Wine {currentWine.position}
                    </div>
                  )}
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-white/90 text-sm font-medium border border-purple-400/20">
                    {getSectionDisplayName(sectionType)}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Next Wine Preview or Completion */}
          {nextWine ? (
            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                  <ChevronRight className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">Up Next</h3>
              </div>
              
              <div className="flex items-center space-x-4">
                {nextWine.wineImageUrl && (
                  <div className="w-16 h-20 rounded-lg overflow-hidden border-2 border-white/10">
                    <img 
                      src={nextWine.wineImageUrl} 
                      alt={nextWine.wineName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-xl font-medium text-white mb-1">
                    {nextWine.wineName}
                  </h4>
                  {nextWine.position > 0 && <p className="text-white/60 text-sm">Wine {nextWine.position}</p>}
                  {nextWine.wineDescription && (
                    <p className="text-white/70 text-sm mt-2 line-clamp-2">
                      {nextWine.wineDescription}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Experience Complete!</h3>
                <p className="text-white/70 text-lg">
                  Thank you for this wonderful wine tasting journey. 
                  Your responses help create a richer experience for everyone.
                </p>
              </div>
            </motion.div>
          )}

          {/* Continue Button */}
          <motion.div
            className="text-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              onClick={onContinue}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-2xl px-8 py-4 text-lg font-medium rounded-2xl transition-all duration-300 transform hover:scale-105"
            >
              <PlayCircle className="w-6 h-6 mr-3" />
              {nextWine ? `Continue to ${nextWine.wineName}` : "View Your Results"}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}