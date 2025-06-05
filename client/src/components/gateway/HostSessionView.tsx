import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeInput } from "@/components/CodeInput";
import { hapticPatterns } from "@/lib/animations";

interface HostSessionViewProps {
  packageCode: string;
  setPackageCode: (code: string) => void;
  hostDisplayName: string;
  setHostDisplayName: (name: string) => void;
  handleHostSession: () => void;
  isCreatingSession: boolean;
  triggerHaptic: (type: keyof typeof hapticPatterns) => void;
}

export function HostSessionView({
  packageCode,
  setPackageCode,
  hostDisplayName,
  setHostDisplayName,
  handleHostSession,
  isCreatingSession,
  triggerHaptic
}: HostSessionViewProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-4 space-y-8">
      {/* Page Header - Outside the card */}
      <motion.div
        className="text-center space-y-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white">
          Host Session
        </h2>
        <p className="text-white/70 text-lg md:text-xl">
          Create your wine tasting experience
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
          {/* Display Name Input */}
          <div className="space-y-3">
            <label className="block text-white/80 text-lg md:text-xl font-medium">
              Your Display Name
            </label>
            <Input
              type="text"
              value={hostDisplayName}
              onChange={(e) => {
                setHostDisplayName(e.target.value);
                triggerHaptic('selection');
              }}
              placeholder="Enter your name"
              className="w-full py-4 px-6 bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 transition-all duration-300 text-lg"
              maxLength={50}
            />
            <p className="text-white/60 text-sm">
              This will be displayed to participants during the session
            </p>
          </div>



          {/* Package Code Section */}
          <div className="space-y-3">
            <label className="block text-white/80 text-lg md:text-xl font-medium">
              Package Code
            </label>
            <p className="text-white/60 text-sm md:text-base">
              Enter your 6-character code from the wine tasting card
            </p>
            
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
          </div>

          {packageCode.length === 6 && hostDisplayName.trim() && !isCreatingSession && (
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
            disabled={packageCode.length !== 6 || !hostDisplayName.trim() || isCreatingSession}
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
  );
}