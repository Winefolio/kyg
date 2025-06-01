import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BubbleCodeInput } from "@/components/ui/BubbleCodeInput";
import { QRScanner } from "@/components/QRScanner";
import { useHaptics } from "@/hooks/useHaptics";
import { animations } from "@/lib/animations";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Users, QrCode, ArrowLeft, Sparkles } from "lucide-react";

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
      setLocation(`/session/${sessionId.trim()}`);
    }
  };

  const handleHostSession = () => {
    if (packageCode.trim().length === 6) {
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

  const resetToSelection = () => {
    triggerHaptic('navigation');
    setUserMode('selection');
    setSessionId('');
    setPackageCode('');
    setShowQRScanner(false);
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
        
        {/* Main Logo - Only visible in selection mode */}
        <AnimatePresence>
          {userMode === 'selection' && (
            <motion.div
              className="text-center mb-12 md:mb-16"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 mb-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
                animate={{ 
                  rotate: [0, 3, -3, 0], 
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    "0 25px 50px -12px rgba(147, 51, 234, 0.3)",
                    "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                  ]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Wine className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </motion.div>
              
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                  Know<span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Your</span>Grape
                </h1>
                <p className="text-base md:text-lg text-white/80 font-light tracking-wide">
                  Premium Wine Tasting Experience
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area with Mode-Specific Views */}
        <div className="w-full max-w-md mx-auto">
          <AnimatePresence mode="wait">
            
            {/* Selection Mode */}
            {userMode === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <motion.div
                  className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl cursor-pointer group"
                  onClick={() => {
                    triggerHaptic('selection');
                    setUserMode('join');
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">Join Session</h3>
                      <p className="text-white/70 text-sm">Enter a session code to participate</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl cursor-pointer group"
                  onClick={() => {
                    triggerHaptic('selection');
                    setUserMode('host');
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                        <Wine className="w-6 h-6 text-amber-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">Host Session</h3>
                      <p className="text-white/70 text-sm">Start a new wine tasting experience</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Join Mode */}
            {userMode === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                {/* Header with Back Button */}
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={resetToSelection}
                    className="text-white/60 hover:text-white p-3 rounded-xl hover:bg-white/10"
                    size="sm"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Join Session</h2>
                    <p className="text-white/70 text-sm">Enter your session identifier</p>
                  </div>
                </div>

                {/* Input Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
                  <BubbleCodeInput
                    value={sessionId}
                    onChange={setSessionId}
                    maxLength={20}
                    onComplete={handleJoinSession}
                    label="Session ID or Package Code"
                    description="Example: WINE01 or ABC123"
                  />

                  <div className="mt-8 space-y-4">
                    <Button
                      onClick={handleJoinSession}
                      disabled={!sessionId.trim() || sessionId.length < 4}
                      className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-lg"
                    >
                      Join Session
                    </Button>
                    
                    <Button
                      onClick={() => setShowQRScanner(true)}
                      variant="outline"
                      className="w-full py-4 px-6 bg-white/20 backdrop-blur-xl border-white/20 text-white hover:bg-white/30 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <QrCode size={20} />
                      Scan QR Code
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Host Mode */}
            {userMode === 'host' && (
              <motion.div
                key="host"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                {/* Header with Back Button */}
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={resetToSelection}
                    className="text-white/60 hover:text-white p-3 rounded-xl hover:bg-white/10"
                    size="sm"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Host Session</h2>
                    <p className="text-white/70 text-sm">Start with your package code</p>
                  </div>
                </div>

                {/* Input Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 shadow-2xl">
                  <BubbleCodeInput
                    value={packageCode}
                    onChange={setPackageCode}
                    maxLength={6}
                    onComplete={handleHostSession}
                    label="6-Character Package Code"
                    description="Find this on your wine tasting card"
                    placeholder="WINE01"
                  />

                  <div className="mt-8">
                    <Button
                      onClick={handleHostSession}
                      disabled={packageCode.length !== 6 || createSessionMutation.isPending}
                      className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:transform-none text-lg"
                    >
                      {createSessionMutation.isPending ? 'Creating Session...' : 'Create Session'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl w-full max-w-sm"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowQRScanner(false)}
                  className="text-white/60 hover:text-white p-2"
                  size="sm"
                >
                  ×
                </Button>
              </div>
              
              <QRScanner
                onScan={handleQRScan}
                onError={() => setShowQRScanner(false)}
                className="w-full aspect-square rounded-2xl overflow-hidden"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}