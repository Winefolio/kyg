import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useHaptics } from "@/hooks/useHaptics";
import { animations } from "@/lib/animations";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Camera, Keyboard, WifiOff, Wifi } from "lucide-react";
import { QRScanner } from "@/components/QRScanner";

export default function Gateway() {
  const [, setLocation] = useLocation();
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { triggerHaptic } = useHaptics();

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 6);
    if (value !== code) {
      triggerHaptic('selection');
      setCode(value);
    }
    
    // Auto-submit when complete
    if (value.length === 6) {
      triggerHaptic('success');
      handleCodeSubmit(value);
    }
  };

  const handleCodeSubmit = async (packageCode: string) => {
    setIsValidating(true);
    
    try {
      const response = await apiRequest('GET', `/api/packages/${packageCode}`, null);
      const packageData = await response.json();
      triggerHaptic('success');
      setLocation(`/session/${packageCode}`);
    } catch (error) {
      triggerHaptic('error');
      // Handle error - package not found or network issue
    } finally {
      setIsValidating(false);
    }
  };

  const CodeProgress = ({ length }: { length: number }) => (
    <div className="flex justify-center gap-2 mt-4">
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < length ? 'bg-purple-400' : 'bg-white/20'
          }`}
          animate={i < length ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-primary relative overflow-hidden">
      {/* Background wine elements */}
      <div className="absolute inset-0 opacity-5">
        <motion.div
          className="absolute top-10 left-10 text-6xl text-white"
          animate={animations.float}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-16 text-4xl text-white"
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 1 } }}
        >
          <Wine />
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-8 text-5xl text-white"
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 2 } }}
        >
          <Wine />
        </motion.div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        {/* Animated Logo */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-32 h-32 mb-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Wine className="text-6xl text-white" size={48} />
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">KnowYourGrape</h1>
          <p className="text-white/80 text-lg">Premium Wine Tasting Experience</p>
        </motion.div>

        {/* Main Content Area */}
        <div className="w-full max-w-md space-y-8">
          {/* Scanner Mode Toggle */}
          <motion.div
            className="flex bg-white/10 backdrop-blur-xl rounded-2xl p-2 border border-white/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => setScanMode('camera')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                scanMode === 'camera'
                  ? 'bg-gradient-button text-white shadow-lg'
                  : 'bg-transparent text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Camera className="mr-2" size={16} />
              Scan QR
            </Button>
            <Button
              onClick={() => setScanMode('manual')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                scanMode === 'manual'
                  ? 'bg-gradient-button text-white shadow-lg'
                  : 'bg-transparent text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Keyboard className="mr-2" size={16} />
              Enter Code
            </Button>
          </motion.div>

          {/* Content Views */}
          <AnimatePresence mode="wait">
            {scanMode === 'camera' ? (
              <motion.div
                key="scanner"
                {...animations.slideIn}
                className="space-y-6"
              >
                <QRScanner
                  onScan={handleCodeSubmit}
                  onError={() => setScanMode('manual')}
                  className="w-full"
                />

                <Button
                  onClick={() => setScanMode('manual')}
                  variant="outline"
                  className="w-full py-4 px-6 bg-white/20 backdrop-blur-xl border-white/20 text-white/80 hover:bg-white/30 hover:text-white"
                >
                  Having trouble? Enter code manually
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                {...animations.slideIn}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-white mb-2">Enter Package Code</h3>
                  <p className="text-white/70">Find your 6-character code on the tasting card</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type="text"
                      value={code}
                      onChange={handleCodeInput}
                      maxLength={6}
                      placeholder="ABC123"
                      className="w-full py-6 px-6 text-center text-3xl font-bold tracking-[0.5em] bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 uppercase"
                    />
                    <CodeProgress length={code.length} />
                  </div>

                  <Button
                    onClick={() => handleCodeSubmit(code)}
                    disabled={code.length !== 6}
                    className="w-full py-4 px-6 bg-gradient-button rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                  >
                    Continue to Session →
                  </Button>
                </div>

                <Button
                  onClick={() => setScanMode('camera')}
                  variant="ghost"
                  className="w-full py-3 px-6 text-white/60 hover:text-white"
                >
                  <Camera className="mr-2" size={16} />
                  Use QR Scanner instead
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

        {/* Host Access Link */}
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

      <LoadingOverlay isVisible={isValidating} message="Validating package..." />
    </div>
  );
}
