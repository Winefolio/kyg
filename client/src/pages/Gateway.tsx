import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useHaptics } from "@/hooks/useHaptics";
import { animations } from "@/lib/animations";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Users, Crown, Camera, QrCode, ArrowRight, Sparkles, WifiOff, Wifi } from "lucide-react";
import { QRScanner } from "@/components/QRScanner";

type UserPath = 'home' | 'join' | 'host';
type JoinMethod = 'qr' | 'manual';

export default function Gateway() {
  const [, setLocation] = useLocation();
  const [currentPath, setCurrentPath] = useState<UserPath>('home');
  const [joinMethod, setJoinMethod] = useState<JoinMethod>('qr');
  const [sessionId, setSessionId] = useState('');
  const [packageCode, setPackageCode] = useState('');
  const [hostName, setHostName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { triggerHaptic } = useHaptics();

  const handleJoinSession = async (id: string) => {
    setIsValidating(true);
    triggerHaptic('success');
    
    try {
      // Navigate to join page with session ID
      setLocation(`/join?sessionId=${id}`);
    } catch (error) {
      triggerHaptic('error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleHostTasting = async (code: string, name: string) => {
    setIsValidating(true);
    
    try {
      // Validate package exists
      const response = await apiRequest('GET', `/api/packages/${code}`, null);
      const packageData = await response.json();
      
      // Create new session for this package
      const sessionResponse = await apiRequest('POST', '/api/sessions', {
        packageId: packageData.id,
        hostName: name
      });
      const sessionData = await sessionResponse.json();
      
      triggerHaptic('success');
      setLocation(`/host/${sessionData.id}`);
    } catch (error) {
      triggerHaptic('error');
      // Handle error - package not found or creation failed
    } finally {
      setIsValidating(false);
    }
  };

  // Join Session Flow Component
  const JoinSessionFlow = ({ joinMethod, setJoinMethod, sessionId, setSessionId, onJoin, onBack }: {
    joinMethod: JoinMethod;
    setJoinMethod: (method: JoinMethod) => void;
    sessionId: string;
    setSessionId: (id: string) => void;
    onJoin: (id: string) => void;
    onBack: () => void;
  }) => (
    <motion.div
      key="join"
      className="w-full max-w-2xl"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.6 }}
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
        <div className="flex items-center mb-8">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-white/60 hover:text-white p-2 mr-4"
          >
            ←
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Join a Tasting</h2>
            <p className="text-white/70">Enter your session ID to join the experience</p>
          </div>
        </div>

        {/* Method Toggle */}
        <div className="flex bg-white/10 rounded-2xl p-2 mb-8">
          <Button
            onClick={() => setJoinMethod('qr')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              joinMethod === 'qr'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-transparent text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <QrCode className="mr-2" size={16} />
            Scan QR
          </Button>
          <Button
            onClick={() => setJoinMethod('manual')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              joinMethod === 'manual'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-transparent text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="mr-2">✍️</span>
            Enter ID
          </Button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {joinMethod === 'qr' ? (
            <motion.div
              key="qr-scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <QRScanner
                onScan={(result) => {
                  const sessionMatch = result.match(/sessionId=([^&]+)/);
                  if (sessionMatch) {
                    onJoin(sessionMatch[1]);
                  } else {
                    onJoin(result);
                  }
                }}
                onError={() => setJoinMethod('manual')}
                className="w-full"
              />
              <Button
                onClick={() => setJoinMethod('manual')}
                variant="outline"
                className="w-full py-3 bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
              >
                Enter Session ID manually instead
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="manual-entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <Input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter Session ID"
                  className="w-full py-4 px-6 text-lg bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20"
                />
                <Button
                  onClick={() => onJoin(sessionId)}
                  disabled={!sessionId.trim()}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                >
                  Join Tasting Session →
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  // Host Session Flow Component
  const HostSessionFlow = ({ packageCode, setPackageCode, hostName, setHostName, onHost, onBack }: {
    packageCode: string;
    setPackageCode: (code: string) => void;
    hostName: string;
    setHostName: (name: string) => void;
    onHost: (code: string, name: string) => void;
    onBack: () => void;
  }) => (
    <motion.div
      key="host"
      className="w-full max-w-2xl"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.6 }}
    >
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
        <div className="flex items-center mb-8">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-white/60 hover:text-white p-2 mr-4"
          >
            ←
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Host a Tasting</h2>
            <p className="text-white/70">Create a new session for participants to join</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Your Name</label>
              <Input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Enter your name"
                className="w-full py-4 px-6 text-lg bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Package Code</label>
              <Input
                type="text"
                value={packageCode}
                onChange={(e) => setPackageCode(e.target.value.toUpperCase())}
                placeholder="WINE01"
                maxLength={6}
                className="w-full py-4 px-6 text-lg font-mono bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 uppercase"
              />
              <p className="text-white/50 text-xs mt-1">Find this code on your tasting package</p>
            </div>

            <Button
              onClick={() => onHost(packageCode, hostName)}
              disabled={!packageCode.trim() || !hostName.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none"
            >
              Create Tasting Session →
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl"></div>
        
        {/* Floating Wine Elements */}
        <motion.div
          className="absolute top-16 left-16 text-purple-300/10"
          animate={animations.float}
        >
          <Wine size={64} />
        </motion.div>
        <motion.div
          className="absolute bottom-32 right-24 text-purple-300/10"
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 1 } }}
        >
          <Wine size={48} />
        </motion.div>
        <motion.div
          className="absolute top-1/3 right-12 text-purple-300/10"
          animate={{ ...animations.float, transition: { ...animations.float.transition, delay: 2 } }}
        >
          <Sparkles size={32} />
        </motion.div>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16 max-w-2xl"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Premium Wine Glass Icon */}
          <motion.div
            className="relative inline-flex items-center justify-center mb-8"
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <div className="absolute inset-0 w-40 h-40 bg-gradient-to-r from-purple-600 to-amber-500 rounded-full blur-2xl opacity-30"></div>
            <div className="relative w-32 h-32 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl">
              <Wine className="text-white" size={64} />
            </div>
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-amber-200 bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            KnowYourGrape
          </motion.h1>
          <motion.p 
            className="text-xl text-white/70 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Premium Wine Tasting Experience
          </motion.p>
          <motion.p 
            className="text-sm text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Discover, taste, and master the art of wine appreciation
          </motion.p>
        </motion.div>

        {/* Main Action Cards */}
        <AnimatePresence mode="wait">
          {currentPath === 'home' ? (
            <motion.div
              key="home"
              className="w-full max-w-4xl grid md:grid-cols-2 gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              {/* Join Session Card */}
              <motion.div
                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-500 cursor-pointer"
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() => setCurrentPath('join')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="text-purple-300" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Join a Tasting</h3>
                  <p className="text-white/70 mb-6 leading-relaxed">
                    Enter a session ID to join an existing wine tasting experience hosted by a sommelier or friend.
                  </p>
                  <div className="flex items-center text-purple-300 group-hover:text-purple-200 transition-colors">
                    <span className="font-medium">Join Now</span>
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                  </div>
                </div>
              </motion.div>

              {/* Host Session Card */}
              <motion.div
                className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-500 cursor-pointer"
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() => setCurrentPath('host')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Crown className="text-amber-300" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Host a Tasting</h3>
                  <p className="text-white/70 mb-6 leading-relaxed">
                    Create a new wine tasting session using a package code and guide participants through the experience.
                  </p>
                  <div className="flex items-center text-amber-300 group-hover:text-amber-200 transition-colors">
                    <span className="font-medium">Start Hosting</span>
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : currentPath === 'join' ? (
            <JoinSessionFlow 
              joinMethod={joinMethod}
              setJoinMethod={setJoinMethod}
              sessionId={sessionId}
              setSessionId={setSessionId}
              onJoin={handleJoinSession}
              onBack={() => setCurrentPath('home')}
            />
          ) : (
            <HostSessionFlow 
              packageCode={packageCode}
              setPackageCode={setPackageCode}
              hostName={hostName}
              setHostName={setHostName}
              onHost={handleHostTasting}
              onBack={() => setCurrentPath('home')}
            />
          )}
        </AnimatePresence>

        {/* Network Status */}
        <motion.div
          className="absolute bottom-6 left-6 flex items-center space-x-2 text-white/40 text-sm"
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

        {/* Sommelier Access */}
        <motion.div
          className="absolute bottom-6 right-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <a
            href="/sommelier"
            className="text-white/30 hover:text-white/60 text-xs transition-colors duration-300 flex items-center space-x-1"
          >
            <Crown size={12} />
            <span>Sommelier Dashboard</span>
          </a>
        </motion.div>
      </div>

      <LoadingOverlay isVisible={isValidating} message="Setting up your tasting experience..." />
    </div>
  );
}
