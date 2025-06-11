import { motion, AnimatePresence } from "framer-motion";
import { Clock, Eye, Target, CheckCircle, ArrowRight } from "lucide-react";

interface SectionTransitionProps {
  isVisible: boolean;
  fromSection: string;
  toSection: string;
  wineName: string;
  onComplete: () => void;
  duration?: number;
}

export function SectionTransition({
  isVisible,
  fromSection,
  toSection,
  wineName,
  onComplete,
  duration = 5,
}: SectionTransitionProps) {
  const getSectionInfo = (section: string) => {
    switch (section) {
      case "intro":
      case "Introduction":
        return {
          icon: Eye,
          title: "Introduction",
          subtitle: "Visual & Aroma Assessment",
          color: "from-blue-500 to-cyan-400",
          bgColor: "bg-blue-500/10",
          description: "Exploring the wine's appearance and initial aromas",
        };
      case "deep_dive":
      case "tasting":
      case "Deep Dive":
        return {
          icon: Target,
          title: "Deep Dive",
          subtitle: "Taste & Structure Analysis",
          color: "from-purple-500 to-pink-400",
          bgColor: "bg-purple-500/10",
          description: "Analyzing flavors, body, tannins, and complexity",
        };
      case "ending":
      case "conclusion":
      case "Final Thoughts":
        return {
          icon: CheckCircle,
          title: "Final Thoughts",
          subtitle: "Finish & Overall Rating",
          color: "from-emerald-500 to-green-400",
          bgColor: "bg-emerald-500/10",
          description: "Evaluating the finish and final impressions",
        };
      default:
        return {
          icon: Clock,
          title: section,
          subtitle: "",
          color: "from-gray-500 to-gray-400",
          bgColor: "bg-gray-500/10",
          description: "",
        };
    }
  };

  const fromInfo = getSectionInfo(fromSection);
  const toInfo = getSectionInfo(toSection);
  const FromIcon = fromInfo.icon;
  const ToIcon = toInfo.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-primary flex items-center justify-center"
          onAnimationComplete={() => {
            setTimeout(onComplete, duration);
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 animate-pulse"></div>
          </div>

          <div className="relative z-10 text-center text-white max-w-2xl mx-auto px-8">
            {/* Wine Name */}
            <motion.h1
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-3xl md:text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200"
            >
              {wineName}
            </motion.h1>

            {/* Transition Flow */}
            <div className="flex items-center justify-center space-x-8 mb-12">
              {/* From Section */}
              <motion.div
                initial={{ x: -50, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-center"
              >
                <div
                  className={`w-20 h-20 mx-auto mb-4 rounded-full ${fromInfo.bgColor} border border-white/20 flex items-center justify-center backdrop-blur-sm`}
                >
                  <FromIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white/90">
                  {fromInfo.title}
                </h3>
                <p className="text-sm text-white/60">{fromInfo.subtitle}</p>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="h-1 bg-gradient-to-r from-white/40 to-transparent rounded-full mt-2"
                />
              </motion.div>

              {/* Arrow */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="relative"
              >
                <motion.div
                  animate={{ x: [0, 10, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                >
                  <ArrowRight className="w-8 h-8 text-white/80" />
                </motion.div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 1 }}
                  className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent origin-left"
                />
              </motion.div>

              {/* To Section */}
              <motion.div
                initial={{ x: 50, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-center"
              >
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ delay: 1.2, duration: 1, ease: "easeInOut" }}
                  className={`w-20 h-20 mx-auto mb-4 rounded-full ${toInfo.bgColor} border-2 border-white/30 flex items-center justify-center backdrop-blur-sm shadow-2xl`}
                >
                  <ToIcon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white">
                  {toInfo.title}
                </h3>
                <p className="text-sm text-white/70">{toInfo.subtitle}</p>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                  className={`h-1 bg-gradient-to-r ${toInfo.color} rounded-full mt-2 shadow-lg`}
                />
              </motion.div>
            </div>

            {/* Description */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.6 }}
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <p className="text-white/80 text-lg leading-relaxed">
                {toInfo.description}
              </p>
            </motion.div>

            {/* Progress Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.4 }}
              className="mt-8 flex justify-center"
            >
              <div className="flex space-x-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2 + i * 0.1, duration: 0.3 }}
                    className={`w-2 h-2 rounded-full ${
                      i === 0
                        ? "bg-blue-400"
                        : i === 1
                          ? "bg-purple-400"
                          : "bg-emerald-400"
                    } ${i === ["intro", "deep dive", "ending"].indexOf(toSection) ? "ring-2 ring-white/40" : "opacity-40"}`}
                  />
                ))}
              </div>
            </motion.div>

            {/* Subtle loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.4 }}
              className="mt-4 text-white/40 text-sm"
            >
              Preparing next section...
            </motion.div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-purple-500/10 blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
