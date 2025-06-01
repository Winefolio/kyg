import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useHaptics } from "@/hooks/useHaptics";
import { animations } from "@/lib/animations";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Camera, Users, UserPlus, QrCode, WifiOff, Wifi, ArrowRight, Sparkles } from "lucide-react";
import { QRScanner } from "@/components/QRScanner";
import { CodeInput } from "@/components/CodeInput";
import { SessionIdInput } from "@/components/SessionIdInput";

type UserMode = 'selection' | 'join' | 'host';

export default function Gateway() {
  const [, setLocation] = useLocation();
  const [userMode, setUserMode] = useState<UserMode>('selection');
  const [sessionId, setSessionId] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const { triggerHaptic } = useHaptics();

  // Mutation for creating a new session (host flow)
  const createSessionMutation = useMutation({
    mutationFn: async (packageCode: string) => {
      const sessionResponse = await apiRequest('POST', '/api/sessions', {
        packageCode,
        hostName: 'Host',
        createHost: true // Flag to create host participant
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }
      
      return sessionResponse.json();
    },
    onSuccess: (sessionData) => {
      triggerHaptic('success');
      setLocation(`/host/${sessionData.session.id}/${sessionData.hostParticipantId}`);
    },
    onError: () => {
      triggerHaptic('error');
    }
  });

  const handleJoinSession = () => {
    if (sessionId.trim().length >= 4) {
      triggerHaptic('success');
      setLocation(`/join?sessionId=${encodeURIComponent(sessionId.trim().toUpperCase())}`);
    }
  };

  const handleHostSession = () => {
    if (packageCode.trim().length === 6) {
      triggerHaptic('success');
      createSessionMutation.mutate(packageCode.trim().toUpperCase());
    }
  };

  const handleQRScan = (scannedData: string) => {
    if (userMode === 'join') {
      setSessionId(scannedData);
      setShowQRScanner(false);
      handleJoinSession();
    }
    // Note: QR scanning removed from host flow - hosts only use package codes
  };

  return (
    <div className="min-h-screen bg-gradient-primary relative overflow-hidden font-sans">
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
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 1.5 } }}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-12 text-5xl text-white"
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 3 } }}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute top-1/2 left-8 text-3xl text-white"
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 2 } }}
        >
          <Sparkles />
        </motion.div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 md:py-8 relative z-10">
        {/* Enhanced Animated Logo - Only visible in selection mode */}
        <AnimatePresence>
          {userMode === 'selection' && (
            <motion.div
              className="text-center mb-16 md:mb-24"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="inline-flex items-center justify-center w-32 h-32 md:w-44 md:h-44 mb-8 md:mb-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
                animate={{ 
                  rotate: [0, 3, -3, 0], 
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    "0 30px 60px -12px rgba(139, 92, 246, 0.3)",
                    "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                  ]
                }}
                transition={{ duration: 6, repeat: Infinity }}
              >
                <Wine className="text-white" size={56} />
              </motion.div>
              <motion.h1 
                className="text-5xl md:text-6xl font-bold text-white mb-4 md:mb-5 tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                KnowYourGrape
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-white/80 font-light tracking-wide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Premium Wine Tasting Experience
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className={`w-full ${userMode === 'selection' ? 'max-w-lg' : 'max-w-xl'}`}>
          <AnimatePresence mode="wait">
            {userMode === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-6 md:space-y-8"
              >
                {/* Join Session Card */}
                <motion.div
                  className="group bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-500 cursor-pointer"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('selection');
                    setUserMode('join');
                  }}
                >
                  <div className="flex items-center justify-between mb-4 md:mb-5">
                    <div className="flex items-center space-x-4 md:space-x-5">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 md:p-4 rounded-2xl shadow-lg">
                        <Users className="text-white" size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Join Session</h3>
                        <p className="text-white/70 text-sm md:text-base">Enter with Session ID</p>
                      </div>
                    </div>
                    <ArrowRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" size={20} />
                  </div>
                  <p className="text-white/80 leading-relaxed text-sm md:text-base">
                    Join an ongoing wine tasting session with your unique session identifier.
                  </p>
                </motion.div>

                {/* Host Session Card */}
                <motion.div
                  className="group bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-500 cursor-pointer"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('selection');
                    setUserMode('host');
                  }}
                >
                  <div className="flex items-center justify-between mb-4 md:mb-5">
                    <div className="flex items-center space-x-4 md:space-x-5">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 md:p-4 rounded-2xl shadow-lg">
                        <UserPlus className="text-white" size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Host Session</h3>
                        <p className="text-white/70 text-sm md:text-base">Start with Package Code</p>
                      </div>
                    </div>
                    <ArrowRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" size={20} />
                  </div>
                  <p className="text-white/80 leading-relaxed text-sm md:text-base">
                    Create a new tasting experience and invite participants to join.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {userMode === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="min-h-[80vh] flex flex-col justify-center"
              >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
                  {/* Header with Back Button */}
                  <div className="flex items-center mb-8 md:mb-10">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        triggerHaptic('navigation');
                        setUserMode('selection');
                        setSessionId('');
                      }}
                      className="text-white/60 hover:text-white p-2 mr-4 rounded-xl hover:bg-white/10 transition-all duration-300"
                    >
                      ← Back
                    </Button>
                    <div className="text-center flex-1">
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Join Session</h2>
                      <p className="text-white/70 text-base md:text-lg">Enter your session identifier</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-8 md:space-y-10">
                    <div className="text-center">
                      <p className="text-white/80 text-lg md:text-xl mb-3">Enter session ID or package code</p>
                      <p className="text-white/60 text-sm md:text-base">Example: WINE01 or ABC123</p>
                    </div>

                    <div className="px-2">
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
                        className="flex-1 py-5 md:py-6 px-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-lg md:text-xl"
                      >
                        Join Session
                      </Button>
                      <Button
                        onClick={() => setShowQRScanner(true)}
                        variant="outline"
                        className="py-5 md:py-6 px-6 bg-white/20 backdrop-blur-xl border-white/20 text-white hover:bg-white/30 rounded-2xl flex items-center justify-center min-w-[140px] transition-all duration-300"
                      >
                        <QrCode size={20} />
                        <span className="ml-2">Scan QR</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {userMode === 'host' && (
              <motion.div
                key="host"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="min-h-[80vh] flex flex-col justify-center"
              >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
                  {/* Header with Back Button */}
                  <div className="flex items-center mb-8 md:mb-10">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        triggerHaptic('navigation');
                        setUserMode('selection');
                        setPackageCode('');
                      }}
                      className="text-white/60 hover:text-white p-2 mr-4 rounded-xl hover:bg-white/10 transition-all duration-300"
                    >
                      ← Back
                    </Button>
                    <div className="text-center flex-1">
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Host Session</h2>
                      <p className="text-white/70 text-base md:text-lg">Start with your package code</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-8 md:space-y-10">
                    <div className="text-center">
                      <p className="text-white/80 text-lg md:text-xl mb-3">Enter your 6-character package code</p>
                      <p className="text-white/60 text-sm md:text-base">Find this on your wine tasting card</p>
                    </div>

                    <div className="px-2">
                      <CodeInput
                        value={packageCode}
                        onChange={setPackageCode}
                        maxLength={6}
                        placeholder="WINE01"
                        onComplete={handleHostSession}
                        className="mb-2"
                      />
                    </div>

                    {packageCode.length === 6 && !createSessionMutation.isPending && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                      >
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
                          <p className="text-green-400 text-sm md:text-base font-medium">
                            Ready to create session
                          </p>
                        </div>
                      </motion.div>
                    )}

                    <Button
                      onClick={handleHostSession}
                      disabled={packageCode.length !== 6 || createSessionMutation.isPending}
                      className="w-full py-5 md:py-6 px-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-lg md:text-xl"
                    >
                      {createSessionMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                          Creating...
                        </div>
                      ) : (
                        'Create Session'
                      )}
                    </Button>
                  </div>
                </div>
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
                className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 md:p-6 border border-white/20 max-w-sm md:max-w-md w-full max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-white">Scan QR Code</h3>
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
