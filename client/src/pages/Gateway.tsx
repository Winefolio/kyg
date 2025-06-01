import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useHaptics } from "@/hooks/useHaptics";
import { apiRequest } from "@/lib/queryClient";
import {
  Wine,
  WifiOff,
  Wifi,
  ArrowLeft,
} from "lucide-react";
import { QRScanner } from "@/components/QRScanner";
import { SelectionView } from "@/components/gateway/SelectionView";
import { JoinSessionView } from "@/components/gateway/JoinSessionView";
import { HostSessionView } from "@/components/gateway/HostSessionView";

type UserMode = "selection" | "join" | "host";

export default function Gateway() {
  const [, setLocation] = useLocation();
  const [userMode, setUserMode] = useState<UserMode>("selection");
  const [sessionId, setSessionId] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { triggerHaptic } = useHaptics();

  // Mutation for creating a new session (host flow)
  const createSessionMutation = useMutation({
    mutationFn: async (packageCode: string) => {
      const sessionResponse = await apiRequest("POST", "/api/sessions", {
        packageCode,
        hostName: "Host",
        createHost: true, // Flag to create host participant
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create session");
      }

      return sessionResponse.json();
    },
    onSuccess: (sessionData) => {
      triggerHaptic("success");
      setLocation(
        `/host/${sessionData.session.id}/${sessionData.hostParticipantId}`,
      );
    },
    onError: () => {
      triggerHaptic("error");
    },
  });

  const handleJoinSession = () => {
    if (sessionId.trim().length >= 4) {
      triggerHaptic("success");
      setLocation(
        `/join?sessionId=${encodeURIComponent(sessionId.trim().toUpperCase())}`,
      );
    }
  };

  const handleHostSession = () => {
    if (packageCode.trim().length === 6) {
      triggerHaptic("success");
      createSessionMutation.mutate(packageCode.trim().toUpperCase());
    }
  };

  const handleQRScan = (scannedData: string) => {
    if (userMode === "join") {
      setSessionId(scannedData);
      setShowQRScanner(false);
      handleJoinSession();
    }
  };

  const handleBack = () => {
    triggerHaptic("navigation");
    setUserMode("selection");
    setSessionId("");
    setPackageCode("");
  };

  return (
    <div className="min-h-screen bg-gradient-primary relative overflow-hidden font-sans">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
        {/* Top Navigation - Only show back button when not in selection mode */}
        <AnimatePresence>
          {userMode !== "selection" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-2xl flex justify-start mb-8 absolute top-8 left-4 right-4 z-20"
            >
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-white/70 hover:text-white hover:bg-white/10 p-3 rounded-2xl transition-all duration-300 flex items-center space-x-2 group"
              >
                <ArrowLeft
                  size={20}
                  className="group-hover:-translate-x-1 transition-transform duration-300"
                />
                <span className="font-medium">Back</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area - Centered and responsive */}
        <div className="w-full h-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {userMode === "selection" && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.98 }}
                transition={{
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="w-full"
              >
                <SelectionView 
                  setUserMode={setUserMode} 
                  triggerHaptic={triggerHaptic} 
                />
              </motion.div>
            )}
            
            {userMode === "join" && (
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
                className="w-full max-w-2xl flex flex-col items-center justify-center flex-grow"
              >
                <JoinSessionView
                  sessionId={sessionId}
                  setSessionId={setSessionId}
                  handleJoinSession={handleJoinSession}
                  setShowQRScanner={setShowQRScanner}
                  triggerHaptic={triggerHaptic}
                />
              </motion.div>
            )}
            
            {userMode === "host" && (
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
                className="w-full max-w-2xl flex flex-col items-center justify-center flex-grow"
              >
                <HostSessionView
                  packageCode={packageCode}
                  setPackageCode={setPackageCode}
                  handleHostSession={handleHostSession}
                  isCreatingSession={createSessionMutation.isPending}
                  triggerHaptic={triggerHaptic}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* QR Scanner Modal */}
        <AnimatePresence>
          {showQRScanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowQRScanner(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 50 }}
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 max-w-md w-full max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
                  <Button
                    variant="ghost"
                    onClick={() => setShowQRScanner(false)}
                    className="text-white/60 hover:text-white p-2 rounded-xl"
                  >
                    ✕
                  </Button>
                </div>
                <div className="relative">
                  <QRScanner
                    onScan={handleQRScan}
                    onError={() => setShowQRScanner(false)}
                    className="w-full rounded-2xl overflow-hidden aspect-square"
                  />
                  <div className="absolute inset-0 border-2 border-white/30 rounded-2xl pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-xl pointer-events-none"></div>
                </div>
                <p className="text-center text-white/70 text-sm mt-4">
                  Align the QR code within the frame
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Network Status Indicator */}
        <motion.div
          className="absolute bottom-6 left-6 flex items-center space-x-2 text-white/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {navigator.onLine ? (
            <>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <Wifi size={16} />
              <span>Online</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <WifiOff size={16} />
              <span>Offline</span>
            </>
          )}
        </motion.div>

        {/* Sommelier Access Link */}
        <motion.div
          className="absolute bottom-6 right-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <a
            href="/sommelier"
            className="text-white/30 hover:text-white/70 text-xs transition-colors duration-300"
          >
            Sommelier
          </a>
        </motion.div>
      </div>

      <LoadingOverlay
        isVisible={createSessionMutation.isPending}
        message="Creating session..."
      />
    </div>
  );
}
