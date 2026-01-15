import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { SessionIdInput } from "@/components/SessionIdInput";
import { hapticPatterns } from "@/lib/animations";

interface JoinSessionViewProps {
  sessionId: string;
  setSessionId: (id: string) => void;
  handleJoinSession: () => void;
  setShowQRScanner: (show: boolean) => void;
  triggerHaptic: (type: keyof typeof hapticPatterns) => void;
  isValidating?: boolean;
  validationError?: string | null;
}

export function JoinSessionView({
  sessionId,
  setSessionId,
  handleJoinSession,
  setShowQRScanner,
  triggerHaptic,
  isValidating = false,
  validationError = null
}: JoinSessionViewProps) {
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
          Join Session
        </h2>
        <p className="text-white/70 text-lg md:text-xl">
          Enter session ID or package code
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
              Enter your session identifier
            </p>
            <p className="text-white/60 text-sm md:text-base">
              Example: WINE01 or ABC123DEF
            </p>
          </div>

          <div className="px-4">
            <SessionIdInput
              value={sessionId}
              onChange={setSessionId}
              onComplete={handleJoinSession}
              maxLength={20}
              className="flex-wrap"
            />
          </div>

          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mx-4"
            >
              <p className="text-red-200 text-sm text-center">{validationError}</p>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleJoinSession}
              disabled={!sessionId.trim() || sessionId.length < 4 || isValidating}
              className="flex-1 py-6 px-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-xl"
            >
              {isValidating ? "Validating..." : "Join Session"}
            </Button>
            <Button
              onClick={() => setShowQRScanner(true)}
              variant="outline"
              className="py-6 px-8 bg-white/20 backdrop-blur-xl border-white/20 text-white hover:bg-white/30 rounded-2xl flex items-center justify-center min-w-[160px] transition-all duration-300"
            >
              <QrCode size={20} />
              <span className="ml-2">Scan QR</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}