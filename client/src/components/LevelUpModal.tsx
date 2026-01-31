import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Sparkles, ArrowUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TastingLevel } from "@shared/schema";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: TastingLevel;
  nextLevel: TastingLevel;
  tastingsCompleted: number;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}

const levelDetails: Record<TastingLevel, { name: string; description: string; color: string }> = {
  intro: {
    name: "Intro",
    description: "Simple, approachable questions using everyday language",
    color: "from-green-400 to-emerald-500"
  },
  intermediate: {
    name: "Intermediate",
    description: "More wine terminology, specific flavor notes, regional characteristics",
    color: "from-blue-400 to-purple-500"
  },
  advanced: {
    name: "Advanced",
    description: "Deep dives into terroir, winemaking, vintage nuances",
    color: "from-purple-500 to-pink-500"
  }
};

export function LevelUpModal({
  isOpen,
  onClose,
  currentLevel,
  nextLevel,
  tastingsCompleted,
  onAccept,
  onDecline
}: LevelUpModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      await onDecline();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const nextLevelInfo = levelDetails[nextLevel];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-slate-800 border-white/10 text-white max-w-md">
        <DialogHeader className="space-y-4">
          {/* Celebration icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto"
          >
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${nextLevelInfo.color} flex items-center justify-center shadow-lg`}>
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          <DialogTitle className="text-2xl font-bold text-center">
            Ready to Level Up?
          </DialogTitle>

          <DialogDescription className="text-center text-white/80 space-y-2">
            <p className="text-lg">
              Nice! You've completed <span className="font-bold text-white">{tastingsCompleted} tastings</span>!
            </p>
            <p>
              We think you're ready for more detailed questions.
            </p>
          </DialogDescription>
        </DialogHeader>

        {/* Level upgrade visualization */}
        <div className="py-6">
          <div className="flex items-center justify-center gap-4">
            {/* Current level */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${levelDetails[currentLevel].color} flex items-center justify-center shadow-md opacity-50`}>
                <span className="text-2xl font-bold">{currentLevel[0].toUpperCase()}</span>
              </div>
              <p className="mt-2 text-sm text-white/60">{levelDetails[currentLevel].name}</p>
            </div>

            {/* Arrow */}
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowUp className="w-8 h-8 text-white/60 rotate-90" />
            </motion.div>

            {/* Next level */}
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-16 h-16 rounded-full bg-gradient-to-br ${nextLevelInfo.color} flex items-center justify-center shadow-lg`}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <p className="mt-2 text-sm font-medium text-white">{nextLevelInfo.name}</p>
            </div>
          </div>

          {/* Next level description */}
          <p className="text-center text-sm text-white/70 mt-4">
            {nextLevelInfo.description}
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className={`w-full bg-gradient-to-r ${nextLevelInfo.color} hover:opacity-90 text-white py-6 text-lg rounded-xl`}
          >
            {isLoading ? "Upgrading..." : "Yes, level up!"}
          </Button>
          <Button
            onClick={handleDecline}
            disabled={isLoading}
            variant="ghost"
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            Not yet, ask me later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
