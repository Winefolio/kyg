import { motion } from "framer-motion";
import { Wine, Users, UserPlus, ArrowRight, Sparkles } from "lucide-react";
import { animations } from "@/lib/animations";

import { hapticPatterns } from "@/lib/animations";

interface SelectionViewProps {
  setUserMode: (mode: "selection" | "join" | "host") => void;
  triggerHaptic: (type: keyof typeof hapticPatterns) => void;
}

export function SelectionView({
  setUserMode,
  triggerHaptic,
}: SelectionViewProps) {
  return (
    <div className="w-full relative">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <motion.div
          className="absolute top-16 left-12 text-6xl text-white"
          animate={animations.float}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-16 text-4xl text-white"
          animate={{
            ...animations.float,
            transition: { ...animations.float.transition, delay: 1.5 },
          }}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-12 text-5xl text-white"
          animate={{
            ...animations.float,
            transition: { ...animations.float.transition, delay: 3 },
          }}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-8 text-3xl text-white"
          animate={{
            ...animations.float,
            transition: { ...animations.float.transition, delay: 2 },
          }}
        >
          <Sparkles />
        </motion.div>
      </div>

      {/* Logo Section */}
      <div className="text-center mb-8 md:mb-16 mt-2 md:mt-6">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-32 h-32 md:w-44 md:h-44 mb-8 md:mb-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
            animate={{
              rotate: [0, 3, -3, 0],
              scale: [1, 1.02, 1],
              boxShadow: [
                "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                "0 30px 60px -12px rgba(139, 92, 246, 0.3)",
                "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <Wine className="text-white" size={56} />
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-white mb-3 md:mb-4 tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            KnowYourGrape
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-white/80 font-light tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Premium Wine Tasting Experience
          </motion.p>
        </motion.div>
      </div>

      {/* Selection Cards */}
      <div className="space-y-6 md:space-y-8 w-full max-w-2xl mx-auto px-4 pt-12 md:pt-16">
        {/* Join Session Card */}
        <motion.div
          className="group bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-500 cursor-pointer"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            setUserMode("join");
          }}
        >
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div className="flex items-center space-x-4 md:space-x-5">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 md:p-4 rounded-2xl shadow-lg">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                  Join Session
                </h3>
                <p className="text-white/70 text-sm md:text-base">
                  Enter with Session ID
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
          <p className="text-white/80 leading-relaxed text-sm md:text-base">
            Join an ongoing wine tasting session with your unique session
            identifier.
          </p>
        </motion.div>

        {/* Host Session Card */}
        <motion.div
          className="group bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-500 cursor-pointer"
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            setUserMode("host");
          }}
        >
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div className="flex items-center space-x-4 md:space-x-5">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 md:p-4 rounded-2xl shadow-lg">
                <UserPlus className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                  Host Session
                </h3>
                <p className="text-white/70 text-sm md:text-base">
                  Start with Package Code
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
          <p className="text-white/80 leading-relaxed text-sm md:text-base">
            Create a new tasting experience and invite participants to join.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
