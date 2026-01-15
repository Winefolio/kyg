import { motion } from "framer-motion";
import { Wine, Users, UserPlus, ArrowRight, Sparkles, LogIn, GlassWater, GraduationCap } from "lucide-react";
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

      {/* Hero Section */}
      <motion.div 
        className="text-center mb-6 mt-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
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
          <Wine className="text-white" size={36} />
        </motion.div>
        
        <motion.h1
          className="text-3xl font-bold text-white mb-3 tracking-tight"
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
          className="text-base text-white/80 font-light tracking-wide mb-3"
          variants={itemVariants}
        >
          Premium Wine Tasting Experience
        </motion.p>
        
        <motion.div
          className="w-20 h-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-full mx-auto"
          variants={itemVariants}
        />
      </motion.div>

      {/* Action Cards */}
      <motion.div
        className="space-y-4 w-full max-w-md mx-auto px-4 pt-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Solo Tasting Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
          variants={itemVariants}
          whileHover={{
            scale: 1.02,
            y: -3,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 15px 30px -8px rgba(168, 85, 247, 0.25)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            window.location.href = "/solo";
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                <GlassWater className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-purple-100 transition-colors duration-300">
                  Solo Tasting
                </h3>
                <p className="text-white/70 text-base">
                  Your Personal Wine Journal
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
        </motion.div>

        {/* Learning Journeys Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
          variants={itemVariants}
          whileHover={{
            scale: 1.02,
            y: -3,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 15px 30px -8px rgba(236, 72, 153, 0.25)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            window.location.href = "/journeys";
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-xl shadow-lg">
                <GraduationCap className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-pink-100 transition-colors duration-300">
                  Learning Journeys
                </h3>
                <p className="text-white/70 text-base">
                  Structured Wine Education
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
        </motion.div>

        {/* Join Session Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
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
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                  Join Session
                </h3>
                <p className="text-white/70 text-base">
                  Enter with Session ID
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
        </motion.div>

        {/* Host Session Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
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
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl shadow-lg">
                <UserPlus className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-100 transition-colors duration-300">
                  Host Session
                </h3>
                <p className="text-white/70 text-base">
                  Start with Package Code
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl cursor-pointer overflow-hidden"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.02, 
            y: -3,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            boxShadow: "0 15px 30px -8px rgba(34, 197, 94, 0.25)"
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            triggerHaptic("selection");
            window.location.href = "/login";
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                <LogIn className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-green-100 transition-colors duration-300">
                  Login
                </h3>
                <p className="text-white/70 text-base">
                  Access Your Dashboard
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
              size={20}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
