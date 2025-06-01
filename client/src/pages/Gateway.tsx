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
    if (sessionId.trim()) {
      triggerHaptic('success');
      setLocation(`/join?sessionId=${sessionId.trim()}`);
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
    } else if (userMode === 'host') {
      setPackageCode(scannedData);
      setShowQRScanner(false);
      handleHostSession();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary relative overflow-hidden">
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

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
        {/* Enhanced Animated Logo */}
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-28 h-28 md:w-40 md:h-40 mb-6 md:mb-8 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
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
            <Wine className="text-white" size={userMode === 'selection' ? 56 : 40} />
          </motion.div>
          <motion.h1 
            className={`font-bold text-white mb-2 md:mb-3 tracking-tight ${
              userMode === 'selection' ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            KnowYourGrape
          </motion.h1>
          <motion.p 
            className={`text-white/80 font-light tracking-wide ${
              userMode === 'selection' ? 'text-lg md:text-xl' : 'text-base md:text-lg'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Premium Wine Tasting Experience
          </motion.p>
        </motion.div>

        {/* Main Content Area */}
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {userMode === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                {/* Join Session Card */}
                <motion.div
                  className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-500"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('selection');
                    setUserMode('join');
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                        <Users className="text-white" size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Join Session</h3>
                        <p className="text-white/70 text-sm">Enter with Session ID</p>
                      </div>
                    </div>
                    <ArrowRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" size={24} />
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    Join an ongoing wine tasting session with your unique session identifier.
                  </p>
                </motion.div>

                {/* Host Session Card */}
                <motion.div
                  className="group bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-500"
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('selection');
                    setUserMode('host');
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg">
                        <UserPlus className="text-white" size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Host Session</h3>
                        <p className="text-white/70 text-sm">Start with Package Code</p>
                      </div>
                    </div>
                    <ArrowRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" size={24} />
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    Create a new tasting experience and invite participants to join.
                  </p>
                </motion.div>
              </motion.div>
            )}

            {userMode === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      triggerHaptic('navigation');
                      setUserMode('selection');
                      setSessionId('');
                    }}
                    className="text-white/60 hover:text-white p-2 mr-4 rounded-xl"
                  >
                    ← Back
                  </Button>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Join Session</h2>
                    <p className="text-white/70 mt-1">Enter your session identifier</p>
                  </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                  <div className="text-center">
                    <p className="text-white/80 text-base md:text-lg mb-2">Enter the session ID provided by your host</p>
                    <p className="text-white/60 text-sm">Usually 8-12 characters long</p>
                  </div>

                  <SessionIdInput
                    value={sessionId}
                    onChange={setSessionId}
                    onComplete={handleJoinSession}
                  />

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={handleJoinSession}
                      disabled={!sessionId.trim() || sessionId.length < 4}
                      className="flex-1 py-4 md:py-5 px-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-base md:text-lg"
                    >
                      Join Session
                    </Button>
                    <Button
                      onClick={() => setShowQRScanner(true)}
                      variant="outline"
                      className="py-4 md:py-5 px-6 bg-white/20 backdrop-blur-xl border-white/20 text-white hover:bg-white/30 rounded-2xl flex items-center justify-center min-w-[60px]"
                    >
                      <QrCode size={20} />
                      <span className="ml-2 sm:hidden">Scan QR</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {userMode === 'host' && (
              <motion.div
                key="host"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      triggerHaptic('navigation');
                      setUserMode('selection');
                      setPackageCode('');
                    }}
                    className="text-white/60 hover:text-white p-2 mr-4 rounded-xl"
                  >
                    ← Back
                  </Button>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Host Session</h2>
                    <p className="text-white/70 mt-1">Start with your package code</p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6 md:mb-8">
                    <p className="text-white/80 text-base md:text-lg">Enter your 6-character package code</p>
                    <p className="text-white/60 text-sm md:text-base mt-2">Find this on your wine tasting card</p>
                  </div>

                  <div className="space-y-6 md:space-y-8">
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
                        <p className="text-green-400 text-sm md:text-base font-medium">
                          Ready to create session! 🍷
                        </p>
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={handleHostSession}
                        disabled={packageCode.length !== 6 || createSessionMutation.isPending}
                        className="flex-1 py-4 md:py-5 px-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-base md:text-lg"
                      >
                        {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
                      </Button>
                      <Button
                        onClick={() => setShowQRScanner(true)}
                        variant="outline"
                        className="py-4 md:py-5 px-6 bg-white/20 backdrop-blur-xl border-white/20 text-white hover:bg-white/30 rounded-2xl flex items-center justify-center min-w-[60px]"
                      >
                        <QrCode size={20} />
                        <span className="ml-2 sm:hidden">Scan QR</span>
                      </Button>
                    </div>
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
