import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import WineEntryForm from "@/components/wine/WineEntryForm";
import SoloTastingSession from "@/pages/SoloTastingSession";
import {
  Wine,
  Plus,
  LogOut,
  User,
  Calendar,
  Star,
  ChevronRight,
  Loader2
} from "lucide-react";
import type { Tasting, User as UserType } from "@shared/schema";

// View states
type ViewState = 'dashboard' | 'login' | 'wine-entry' | 'tasting';

interface WineInfo {
  wineName: string;
  wineRegion?: string;
  wineVintage?: number;
  grapeVariety?: string;
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'orange';
  photoUrl?: string;
}

export default function SoloDashboard() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewState>('dashboard');
  const [email, setEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [currentWine, setCurrentWine] = useState<WineInfo | null>(null);
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const { data: authData, isLoading: authLoading, refetch: refetchAuth } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', null);
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      return response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const isAuthenticated = !!authData?.user;

  // Get user's tastings
  const { data: tastingsData, isLoading: tastingsLoading } = useQuery<{
    tastings: Tasting[];
    total: number;
  }>({
    queryKey: ['/api/solo/tastings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/solo/tastings?limit=10', null);
      return response.json();
    },
    enabled: isAuthenticated
  });

  // Get user's preferences
  const { data: preferencesData } = useQuery<{
    preferences: Record<string, number | null>;
    tastingCount: number;
    summary: string;
  }>({
    queryKey: ['/api/solo/preferences'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/solo/preferences', null);
      return response.json();
    },
    enabled: isAuthenticated
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/auth', { email });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setLoginError('');
      refetchAuth();
      setView('dashboard');
    },
    onError: (error: Error) => {
      setLoginError(error.message);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      queryClient.clear();
      refetchAuth();
    }
  });

  // Set initial view based on auth state
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setView('login');
    } else if (!authLoading && isAuthenticated) {
      setView('dashboard');
    }
  }, [authLoading, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      loginMutation.mutate(email.trim());
    }
  };

  const handleWineSubmit = (wine: WineInfo) => {
    setCurrentWine(wine);
    setView('tasting');
  };

  const handleTastingComplete = () => {
    setCurrentWine(null);
    queryClient.invalidateQueries({ queryKey: ['/api/solo/tastings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/solo/preferences'] });
    setView('dashboard');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Login view
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Wine className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Know Your Grape</h1>
              <p className="text-white/60">Your personal wine tasting journal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 py-3"
                  required
                />
              </div>

              {loginError && (
                <p className="text-red-400 text-sm text-center">{loginError}</p>
              )}

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Continue'
                )}
              </Button>
            </form>

            <p className="text-white/40 text-xs text-center mt-6">
              No password required. We'll create an account if you're new.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Wine entry view
  if (view === 'wine-entry') {
    return (
      <WineEntryForm
        onSubmit={handleWineSubmit}
        onCancel={() => setView('dashboard')}
      />
    );
  }

  // Tasting view
  if (view === 'tasting' && currentWine) {
    return (
      <SoloTastingSession
        wine={currentWine}
        onComplete={handleTastingComplete}
        onCancel={() => {
          setCurrentWine(null);
          setView('dashboard');
        }}
      />
    );
  }

  // Dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wine className="w-6 h-6 text-purple-400" />
            <span className="text-white font-semibold">Know Your Grape</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm hidden sm:block">
              {authData?.user?.email}
            </span>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pb-32">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-white/60">
            {preferencesData?.tastingCount || 0} tastings completed
          </p>
        </div>

        {/* Start Tasting CTA */}
        <motion.button
          onClick={() => setView('wine-entry')}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 mb-8 flex items-center justify-between group hover:from-purple-600 hover:to-pink-600 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold text-lg">Start New Tasting</h3>
              <p className="text-white/70 text-sm">Record your wine experience</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
        </motion.button>

        {/* Preferences Summary */}
        {preferencesData && preferencesData.tastingCount > 0 && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-white/20">
            <h2 className="text-lg font-semibold text-white mb-3">Your Taste Profile</h2>
            <p className="text-white/80">{preferencesData.summary}</p>
          </div>
        )}

        {/* Recent Tastings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Tastings</h2>

          {tastingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : tastingsData?.tastings && tastingsData.tastings.length > 0 ? (
            <div className="space-y-3">
              {tastingsData.tastings.map((tasting) => (
                <motion.div
                  key={tasting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setLocation(`/solo/tasting/${tasting.id}`)}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/20 cursor-pointer hover:bg-white/15 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1">{tasting.wineName}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-white/60">
                        {tasting.wineType && (
                          <span className="bg-white/10 px-2 py-0.5 rounded capitalize">
                            {tasting.wineType}
                          </span>
                        )}
                        {tasting.wineRegion && (
                          <span>{tasting.wineRegion}</span>
                        )}
                        {tasting.wineVintage && (
                          <span>{tasting.wineVintage}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm">
                            {(tasting.responses as any)?.overall?.rating || '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(tasting.tastedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
              <Wine className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No tastings yet</p>
              <Button
                onClick={() => setView('wine-entry')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Start Your First Tasting
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation (placeholder for future) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-t border-white/10 px-6 py-4">
        <div className="container mx-auto flex justify-around max-w-lg">
          <button className="flex flex-col items-center text-purple-400">
            <Wine className="w-6 h-6" />
            <span className="text-xs mt-1">Journal</span>
          </button>
          <button
            onClick={() => setView('wine-entry')}
            className="flex flex-col items-center text-white"
          >
            <div className="w-12 h-12 -mt-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs mt-1">Taste</span>
          </button>
          <button
            onClick={() => setLocation('/solo/profile')}
            className="flex flex-col items-center text-white/60 hover:text-white/80 transition-colors"
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
