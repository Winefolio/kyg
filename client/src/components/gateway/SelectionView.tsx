import { motion } from "framer-motion";
import { Wine, Users, UserPlus, ArrowRight, Sparkles } from "lucide-react";
import { animations } from "@/lib/animations";
import { containerVariants, itemVariants } from "@/lib/micro-animations";
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
      {/* Enhanced Background Elements with Varied Animation */}
      <div className="absolute inset-0 opacity-5">
        <motion.div
          className="absolute top-16 left-12 text-6xl text-white"
          animate={animations.floatSlow}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-16 text-4xl text-white"
          animate={{
            ...animations.floatFast,
            transition: { ...animations.floatFast.transition, delay: 1.5 },
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
            ...animations.floatSlow,
            transition: { ...animations.floatSlow.transition, delay: 2 },
          }}
        >
          <Sparkles />
        </motion.div>
      </div>

      {/* Compact Hero Section */}
      <motion.div 
        className="text-center mb-4 mt-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
          variants={itemVariants}
          animate={{
            rotate: [0, 3, -3, 0],
            scale: [1, 1.02, 1],
            boxShadow: [
              "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              "0 30px 60px -12px rgba(139, 92, 246, 0.4)",
              "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            ],
          }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <Wine className="text-white" size={28} />
        </motion.div>
        
        <motion.h1
          className="text-2xl font-bold text-white mb-2 tracking-tight"
          variants={itemVariants}
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          KnowYourGrape
        </motion.h1>
        
        <motion.p
          className="text-sm text-white/80 font-light tracking-wide mb-2"
          variants={itemVariants}
        >
          Premium Wine Tasting Experience
        </motion.p>
        
        <motion.div
          className="w-16 h-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full mx-auto"
          variants={itemVariants}
        />
      </motion.div>

      {/* Compact Action Cards */}
      <motion.div 
        className="space-y-3 w-full max-w-sm mx-auto px-4 pt-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Join Session Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.02, 
            y: -3,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 15px 30px -8px rgba(59, 130, 246, 0.25)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            setUserMode("join");
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                  Join Session
                </h3>
                <p className="text-white/70 text-sm">
                  Enter with Session ID
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={18}
            />
          </div>
        </motion.div>

        {/* Host Session Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.02, 
            y: -3,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 15px 30px -8px rgba(245, 158, 11, 0.25)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            setUserMode("host");
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg">
                <UserPlus className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-100 transition-colors duration-300">
                  Host Session
                </h3>
                <p className="text-white/70 text-sm">
                  Start with Package Code
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={18}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
