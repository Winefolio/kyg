import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useHaptics } from "@/hooks/useHaptics";
import { animations } from "@/lib/animations";
import { apiRequest } from "@/lib/queryClient";
import { Wine, Users, Crown, Camera, QrCode, ArrowRight, Sparkles, WifiOff, Wifi, Star, Grape } from "lucide-react";
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
      const response = await apiRequest('GET', `/api/packages/${code}`, null);
      const packageData = await response.json();

      const sessionResponse = await apiRequest('POST', '/api/sessions', {
        packageId: packageData.id,
        hostName: name
      });
      const sessionData = await sessionResponse.json();

      triggerHaptic('success');
      setLocation(`/host/${sessionData.id}`);
    } catch (error) {
      triggerHaptic('error');
    } finally {
      setIsValidating(false);
    }
  };

  // Floating Background Elements
  const FloatingElements = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated Wine Bottles */}
      <motion.div
        className="absolute top-20 left-[10%] opacity-5"
        animate={{ 
          y: [-20, 20, -20],
          rotate: [0, 5, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Wine size={120} className="text-purple-300" />
      </motion.div>

      <motion.div
        className="absolute bottom-32 right-[15%] opacity-5"
        animate={{ 
          y: [20, -20, 20],
          rotate: [0, -3, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      >
        <Wine size={80} className="text-amber-300" />
      </motion.div>

      {/* Floating Grapes */}
      <motion.div
        className="absolute top-[30%] right-[8%] opacity-10"
        animate={{ 
          y: [-15, 15, -15],
          x: [-5, 5, -5],
          rotate: [0, 10, 0]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <Grape size={60} className="text-purple-400" />
      </motion.div>

      {/* Sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute opacity-20"
          style={{
            top: `${20 + (i * 15)}%`,
            left: `${10 + (i * 15)}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 4 + (i * 0.5),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8
          }}
        >
          <Sparkles size={16} className="text-amber-300" />
        </motion.div>
      ))}
    </div>
  );

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
      <div className="relative group">
        {/* Glass Card with Enhanced Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl blur-xl"></div>
        <div className="relative bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10 p-3 mr-4 rounded-2xl transition-all duration-300"
            >
              ←
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 font-serif">Join a Tasting</h2>
              <p className="text-white/70">Enter your session ID to join the experience</p>
            </div>
          </div>

          {/* Method Toggle */}
          <div className="flex bg-black/20 rounded-2xl p-1 mb-8 backdrop-blur-xl border border-white/10">
            <Button
              onClick={() => setJoinMethod('qr')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                joinMethod === 'qr'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transform scale-[1.02]'
                  : 'bg-transparent text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <QrCode className="mr-2" size={18} />
              Scan QR Code
            </Button>
            <Button
              onClick={() => setJoinMethod('manual')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                joinMethod === 'manual'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg transform scale-[1.02]'
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
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent rounded-2xl"></div>
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
                    className="w-full relative z-10"
                  />
                </div>
                <Button
                  onClick={() => setJoinMethod('manual')}
                  variant="outline"
                  className="w-full py-4 bg-white/5 border-white/20 text-white/80 hover:bg-white/10 hover:border-white/30 rounded-2xl font-medium transition-all duration-300"
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
                  <div className="relative">
                    <Input
                      type="text"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                      placeholder="Enter Session ID"
                      className="w-full py-5 px-6 text-lg bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-purple-400 focus:ring-4 focus:ring-purple-400/20 transition-all duration-300 font-mono tracking-wider"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  <Button
                    onClick={() => onJoin(sessionId)}
                    disabled={!sessionId.trim()}
                    className="w-full py-5 px-6 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 rounded-2xl text-white font-semibold text-lg shadow-2xl hover:shadow-purple-500/25 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                  >
                    <Users className="mr-2" size={20} />
                    Join Tasting Session
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
      <div className="relative group">
        {/* Glass Card with Enhanced Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/5 rounded-3xl blur-xl"></div>
        <div className="relative bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10 p-3 mr-4 rounded-2xl transition-all duration-300"
            >
              ←
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 font-serif">Host a Tasting</h2>
              <p className="text-white/70">Create a new session for participants to join</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-5">
              <div className="relative">
                <label className="block text-white/90 text-sm font-semibold mb-3 tracking-wide">Your Name</label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full py-5 px-6 text-lg bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all duration-300"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              <div className="relative">
                <label className="block text-white/90 text-sm font-semibold mb-3 tracking-wide">Package Code</label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={packageCode}
                    onChange={(e) => setPackageCode(e.target.value.toUpperCase())}
                    placeholder="WINE01"
                    maxLength={6}
                    className="w-full py-5 px-6 text-xl font-mono bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-2xl text-white placeholder-white/40 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 uppercase tracking-widest transition-all duration-300"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
                <p className="text-white/50 text-xs mt-2 ml-1">Find this code on your tasting package</p>
              </div>

              <Button
                onClick={() => onHost(packageCode, hostName)}
                disabled={!packageCode.trim() || !hostName.trim()}
                className="w-full py-5 px-6 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 rounded-2xl text-white font-semibold text-lg shadow-2xl hover:shadow-amber-500/25 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                <Crown className="mr-2" size={20} />
                Create Tasting Session
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/80 to-slate-900 relative overflow-hidden">
      {/* Enhanced Background with Multiple Layers */}
      <div className="absolute inset-0">
        {/* Primary Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-purple-900/60 to-slate-900/90"></div>

        {/* Animated Gradient Orbs */}
        <motion.div 
          className="absolute top-10 left-10 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-10 right-10 w-[30rem] h-[30rem] bg-amber-500/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      {/* Floating Background Elements */}
      <FloatingElements />

      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative z-10">
        {/* Enhanced Hero Section */}
        <motion.div
          className="text-center mb-20 max-w-3xl"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {/* Premium Wine Glass Icon */}
          <motion.div
            className="relative inline-flex items-center justify-center mb-10"
            animate={{ 
              rotate: [0, 3, -3, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Outer Glow */}
            <div className="absolute inset-0 w-48 h-48 bg-gradient-to-r from-purple-600/40 via-amber-500/30 to-purple-600/40 rounded-full blur-3xl animate-pulse"></div>

            {/* Middle Ring */}
            <div className="absolute inset-4 w-40 h-40 bg-gradient-to-r from-white/10 to-white/5 rounded-full blur-xl"></div>

            {/* Main Container */}
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-2xl border-2 border-white/30 flex items-center justify-center shadow-2xl">
              <Wine className="text-white drop-shadow-lg" size={72} />

              {/* Stars around the wine glass */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-amber-300"
                  style={{
                    top: i === 0 ? '-10px' : i === 1 ? '50%' : i === 2 ? 'calc(100% + 10px)' : '50%',
                    left: i === 0 ? '50%' : i === 1 ? 'calc(100% + 10px)' : i === 2 ? '50%' : '-10px',
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5
                  }}
                >
                  <Star size={12} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Enhanced Typography */}
          <motion.h1 
            className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-amber-200 bg-clip-text text-transparent mb-6 font-serif tracking-tight"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            KnowYourGrape
          </motion.h1>

          <motion.p 
            className="text-2xl text-white/80 mb-4 font-light tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Premium Wine Tasting Experience
          </motion.p>

          <motion.p 
            className="text-base text-white/60 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            Discover, taste, and master the art of wine appreciation
          </motion.p>
        </motion.div>

        {/* Enhanced Main Action Cards */}
        <AnimatePresence mode="wait">
          {currentPath === 'home' ? (
            <motion.div
              key="home"
              className="w-full max-w-5xl grid md:grid-cols-2 gap-10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Enhanced Join Session Card */}
              <motion.div
                className="group relative cursor-pointer"
                whileHover={{ scale: 1.03, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPath('join')}
              >
                {/* Outer Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/50 to-purple-800/50 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                {/* Main Card */}
                <div className="relative bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600/30 to-purple-700/20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-xl">
                      <Users className="text-purple-300 drop-shadow-lg" size={36} />
                    </div>

                    {/* Content */}
                    <h3 className="text-3xl font-bold text-white mb-4 font-serif">Join a Tasting</h3>
                    <p className="text-white/70 mb-8 leading-relaxed text-lg">
                      Enter a session ID to join an existing wine tasting experience hosted by a sommelier or friend.
                    </p>

                    {/* CTA */}
                    <div className="flex items-center text-purple-300 group-hover:text-purple-200 transition-colors font-semibold">
                      <span className="mr-3">Join Now</span>
                      <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" size={20} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Host Session Card */}
              <motion.div
                className="group relative cursor-pointer"
                whileHover={{ scale: 1.03, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCurrentPath('host')}
              >
                {/* Outer Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/50 to-amber-700/50 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                {/* Main Card */}
                <div className="relative bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500/30 to-amber-600/20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-xl">
                      <Crown className="text-amber-300 drop-shadow-lg" size={36} />
                    </div>

                    {/* Content */}
                    <h3 className="text-3xl font-bold text-white mb-4 font-serif">Host a Tasting</h3>
                    <p className="text-white/70 mb-8 leading-relaxed text-lg">
                      Create a new wine tasting session using a package code and guide participants through the experience.
                    </p>

                    {/* CTA */}
                    <div className="flex items-center text-amber-300 group-hover:text-amber-200 transition-colors font-semibold">
                      <span className="mr-3">Start Hosting</span>
                      <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" size={20} />
                    </div>
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

        {/* Enhanced Network Status */}
        <motion.div
          className="absolute bottom-8 left-8 flex items-center space-x-3 text-white/50 text-sm bg-black/20 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          {navigator.onLine ? (
            <>
              <motion.div 
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <Wifi size={16} />
              <span className="font-medium">Online</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <WifiOff size={16} />
              <span className="font-medium">Offline</span>
            </>
          )}
        </motion.div>

        {/* Enhanced Sommelier Access */}
        <motion.div
          className="absolute bottom-8 right-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          <a
            href="/sommelier"
            className="text-white/40 hover:text-white/80 text-sm transition-all duration-300 flex items-center space-x-2 bg-black/20 backdrop-blur-xl rounded-2xl px-4 py-2 border border-white/10 hover:border-white/20 group"
          >
            <Crown size={14} className="group-hover:text-amber-300 transition-colors" />
            <span className="font-medium">Sommelier Dashboard</span>
          </a>
        </motion.div>
      </div>

      <LoadingOverlay isVisible={isValidating} message="Setting up your tasting experience..." />
    </div>
  );
}