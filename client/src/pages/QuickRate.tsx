import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Sparkles,
  Check,
  Wine,
  Star,
  ChevronRight
} from "lucide-react";

type Step = 'capture' | 'rating' | 'done';

interface WineInfo {
  wineName: string;
  wineRegion?: string;
  grapeVariety?: string;
  wineType?: string;
  photoUrl?: string;
}

export default function QuickRate() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('capture');
  const [wineInfo, setWineInfo] = useState<WineInfo>({ wineName: '' });
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [savedWineName, setSavedWineName] = useState('');
  const [savedRating, setSavedRating] = useState(0);

  // Wine label recognition
  const scanWineMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/solo/wines/recognize', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Recognition failed');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.recognized && data.wine) {
        setWineInfo({
          wineName: data.wine.wineName || '',
          wineRegion: data.wine.wineRegion || undefined,
          grapeVariety: data.wine.grapeVariety || undefined,
          wineType: data.wine.wineType || undefined
        });
        setStep('rating');
      } else {
        toast({
          title: "Couldn't recognize wine",
          description: "Enter the wine name manually below.",
        });
      }
      setIsScanning(false);
    },
    onError: () => {
      toast({
        title: "Scan failed",
        description: "Enter the wine name manually below.",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  });

  // Save quick rate tasting
  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/solo/tastings", {
        wineName: wineInfo.wineName,
        wineRegion: wineInfo.wineRegion || null,
        grapeVariety: wineInfo.grapeVariety || null,
        wineType: wineInfo.wineType || null,
        photoUrl: wineInfo.photoUrl || null,
        tastingMode: 'quick',
        responses: {
          overall: {
            rating,
            notes: note || undefined
          },
          _quickRate: true
        }
      });
    },
    onSuccess: () => {
      setSavedWineName(wineInfo.wineName);
      setSavedRating(rating);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['/api/me/taste-profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/solo/tastings'] });
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file", description: "Please select an image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Too large", description: "Image must be under 10MB.", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    scanWineMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualContinue = () => {
    if (!wineInfo.wineName.trim()) {
      toast({ title: "Wine name required", description: "Please enter the wine name.", variant: "destructive" });
      return;
    }
    setStep('rating');
  };

  const handleSave = () => {
    if (rating === 0) {
      toast({ title: "Rate the wine", description: "Tap a number to rate.", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  if (user === null && !isLoading) {
    setLocation('/solo/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082b] to-[#0d0015] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#16082b] to-[#0d0015]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a0a2e]/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => step === 'capture' ? setLocation('/home') : setStep(step === 'rating' ? 'capture' : 'rating')}
            className="p-2 -ml-2 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold text-white">Quick Rate</h1>
          <div className="w-9" />
        </div>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-3">
          {(['capture', 'rating', 'done'] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? 'w-8 bg-amber-400' :
                (['capture', 'rating', 'done'].indexOf(s) < ['capture', 'rating', 'done'].indexOf(step))
                  ? 'w-4 bg-amber-400/50' : 'w-4 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Capture */}
        {step === 'capture' && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-8 max-w-md mx-auto"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">What are you drinking?</h2>
              <p className="text-white/60">Snap a photo or type the wine name</p>
            </div>

            {/* Scan button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="w-full flex items-center justify-center gap-3 py-5 px-6 bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 border border-amber-500/30 rounded-2xl text-white transition-all disabled:opacity-50 mb-4"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing label...</span>
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  <span className="text-lg font-medium">Scan Wine Label</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#16082b] text-white/40">or type it</span>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Wine name"
                value={wineInfo.wineName}
                onChange={(e) => setWineInfo(prev => ({ ...prev, wineName: e.target.value }))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 text-lg"
              />
              <Button
                onClick={handleManualContinue}
                disabled={!wineInfo.wineName.trim()}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-12 text-lg rounded-xl"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Rating */}
        {step === 'rating' && (
          <motion.div
            key="rating"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-4 py-6 max-w-md mx-auto"
          >
            {/* Wine name (editable) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Wine className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-white/50">Wine</span>
              </div>
              <Input
                value={wineInfo.wineName}
                onChange={(e) => setWineInfo(prev => ({ ...prev, wineName: e.target.value }))}
                className="bg-white/5 border-white/10 text-white text-lg font-medium h-12"
              />
              {wineInfo.wineRegion && (
                <p className="text-sm text-white/40 mt-1">{wineInfo.wineRegion}</p>
              )}
            </div>

            {/* Rating selector */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-white/50">Your Rating</span>
              </div>

              {/* Large number display */}
              <div className="text-center mb-6">
                <span className={`text-7xl font-bold transition-colors ${rating > 0 ? 'text-amber-400' : 'text-white/20'}`}>
                  {rating > 0 ? rating : '?'}
                </span>
                <span className="text-2xl text-white/30 ml-1">/10</span>
              </div>

              {/* Tap-to-rate grid */}
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`aspect-square rounded-xl text-lg font-bold transition-all ${
                      n === rating
                        ? 'bg-amber-500 text-black scale-110 shadow-lg shadow-amber-500/30'
                        : n <= rating
                          ? 'bg-amber-500/30 text-amber-300'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional note */}
            <div className="mb-8">
              <Textarea
                placeholder="Quick note? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={rating === 0 || saveMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-14 text-lg rounded-xl"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Rating'
              )}
            </Button>
          </motion.div>
        )}

        {/* Step 3: Done + Nudge */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-4 py-12 max-w-md mx-auto text-center"
          >
            {/* Success animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-10 h-10 text-green-400" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2">Saved!</h2>
            <p className="text-white/60 mb-8">
              You rated <span className="text-amber-400 font-medium">{savedWineName}</span>{' '}
              <span className="text-amber-400 font-bold">{savedRating}/10</span>
            </p>

            {/* Nudge CTA */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Want personalized recommendations?</h3>
                  <p className="text-white/50 text-sm">
                    Do a full tasting next time — it takes 3-5 min and unlocks AI wine suggestions tailored to your palate.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => setLocation(`/tasting/new?wineName=${encodeURIComponent(savedWineName)}`)}
                variant="outline"
                className="w-full h-12 border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
              >
                <Wine className="w-4 h-4 mr-2" />
                Start Full Tasting
              </Button>
              <Button
                onClick={() => setLocation('/home')}
                className="w-full h-12 bg-white/10 hover:bg-white/15 text-white"
              >
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
