import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/CodeInput";
import { hapticPatterns } from "@/lib/animations";

interface HostSessionViewProps {
  packageCode: string;
  setPackageCode: (code: string) => void;
  handleHostSession: () => void;
  isCreatingSession: boolean;
  triggerHaptic: (type: keyof typeof hapticPatterns) => void;
}

export function HostSessionView({
  packageCode,
  setPackageCode,
  handleHostSession,
  isCreatingSession,
  triggerHaptic
}: HostSessionViewProps) {
  return (
    <motion.div
      key="host"
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.98 }}
      transition={{
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.1,
      }}
      className="w-full max-w-xl mx-auto px-4"
    >
      <div className="space-y-8 md:space-y-12">
        {/* Page Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Host Session
          </h2>
          <p className="text-white/70 text-lg md:text-xl">
            Start with your package code
          </p>
        </motion.div>

        {/* Main Content Card */}
        <motion.div
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-white/20 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="space-y-8 md:space-y-10">
            <div className="text-center space-y-3">
              <p className="text-white/80 text-lg md:text-xl">
                Enter your 6-character package code
              </p>
              <p className="text-white/60 text-sm md:text-base">
                Find this on your wine tasting card
              </p>
            </div>

            <div className="px-4">
              <CodeInput
                value={packageCode}
                onChange={setPackageCode}
                maxLength={6}
                placeholder="WINE01"
                onComplete={handleHostSession}
                className="mb-2"
              />
            </div>

            {packageCode.length === 6 && !isCreatingSession && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-500/20 border border-green-400/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                  <p className="text-green-400 text-base font-medium">
                    Ready to create session
                  </p>
                </div>
              </motion.div>
            )}

            <Button
              onClick={handleHostSession}
              disabled={packageCode.length !== 6 || isCreatingSession}
              className="w-full py-6 px-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-xl"
            >
              {isCreatingSession ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  Creating Session...
                </div>
              ) : (
                "Create Session"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}