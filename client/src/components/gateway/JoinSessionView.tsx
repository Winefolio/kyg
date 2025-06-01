import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import { SessionIdInput } from "@/components/SessionIdInput";

interface JoinSessionViewProps {
  sessionId: string;
  setSessionId: (id: string) => void;
  handleJoinSession: () => void;
  setShowQRScanner: (show: boolean) => void;
  triggerHaptic: (type: string) => void;
}

export function JoinSessionView({
  sessionId,
  setSessionId,
  handleJoinSession,
  setShowQRScanner,
  triggerHaptic
}: JoinSessionViewProps) {
  return (
    <motion.div
      key="join"
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
            Join Session
          </h2>
          <p className="text-white/70 text-lg md:text-xl">
            Enter your session identifier
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
                Enter session ID or package code
              </p>
              <p className="text-white/60 text-sm md:text-base">
                Example: WINE01 or ABC123
              </p>
            </div>

            <div className="px-4">
              <SessionIdInput
                value={sessionId}
                onChange={setSessionId}
                onComplete={handleJoinSession}
                maxLength={20}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleJoinSession}
                disabled={!sessionId.trim() || sessionId.length < 4}
                className="flex-1 py-6 px-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-xl"
              >
                Join Session
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
    </motion.div>
  );
}