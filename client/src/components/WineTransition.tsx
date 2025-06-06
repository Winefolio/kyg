import { motion } from "framer-motion";
import { Wine, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

export function WineTransition({ currentWine, nextWine, onContinue, isComplete }: WineTransitionProps) {
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Wine Icon */}
        <motion.div
          className="mx-auto w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        >
          <Wine className="w-10 h-10 text-white" />
        </motion.div>

        {/* Current Wine Info */}
        <motion.div
          className="space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {currentWine.wineImageUrl && (
            <div className="mx-auto w-32 h-48 rounded-lg overflow-hidden shadow-2xl">
              <img 
                src={currentWine.wineImageUrl} 
                alt={currentWine.wineName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <h1 className="text-2xl font-bold text-white">
            {isComplete ? "Tasting Complete!" : `Wine ${currentWine.position} Complete`}
          </h1>
          
          <h2 className="text-xl text-white/90 font-medium">
            {currentWine.wineName}
          </h2>
          
          {currentWine.wineDescription && (
            <p className="text-white/70 text-sm">
              {currentWine.wineDescription}
            </p>
          )}
        </motion.div>

        {/* Next Wine Preview or Completion */}
        {nextWine ? (
          <motion.div
            className="space-y-4 pt-6 border-t border-white/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center space-x-2 text-white/60">
              <span className="text-sm">Next</span>
              <ArrowRight className="w-4 h-4" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">
                Wine {nextWine.position}: {nextWine.wineName}
              </h3>
              {nextWine.wineDescription && (
                <p className="text-white/60 text-sm">
                  {nextWine.wineDescription}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-2 pt-6 border-t border-white/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-white/70">
              Thank you for participating in this wine tasting experience!
            </p>
          </motion.div>
        )}

        {/* Continue Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-sm transition-all duration-300"
          >
            {nextWine ? `Continue to ${nextWine.wineName}` : "View Results"}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}