import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BottomNav from "@/components/solo/BottomNav";
import WineEntryForm from "@/components/wine/WineEntryForm";
import SoloTastingSession from "@/pages/SoloTastingSession";
import {
  Wine,
  TrendingUp,
  Star,
  MapPin,
  Grape,
  Calendar,
  ChevronRight,
  Sparkles,
  BookOpen,
  Loader2
} from "lucide-react";
import type { Tasting, User as UserType } from "@shared/schema";

interface WineInfo {
  wineName: string;
  wineRegion?: string;
  wineVintage?: number;
  grapeVariety?: string;
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'orange';
  photoUrl?: string;
}

type ViewState = 'home' | 'wine-entry' | 'tasting';

export default function SoloHome() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewState>('home');
  const [currentWine, setCurrentWine] = useState<WineInfo | null>(null);

  // Get auth state
  const { data: authData, isLoading: authLoading } = useQuery<{ user: UserType }>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', null);
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false
  });

  // Get user's preferences
  const { data: preferencesData } = useQuery<{
    preferences: Record<string, number | null>;
    tastingCount: number;
    summary: string;
  }>({
    queryKey: ['/api/solo/preferences'],
    enabled: !!authData?.user
  });

  // Get recent tastings for quick stats
  const { data: tastingsData } = useQuery<{
    tastings: Tasting[];
    total: number;
  }>({
    queryKey: ['/api/solo/tastings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/solo/tastings?limit=5', null);
      return response.json();
    },
    enabled: !!authData?.user
  });

  // Get user journeys for progress
  const { data: journeysData } = useQuery<{
    journeys: any[];
  }>({
    queryKey: ['/api/journeys/user'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/journeys/user', null);
      if (!response.ok) return { journeys: [] };
      return response.json();
    },
    enabled: !!authData?.user
  });

  // Get wine recommendations
  const { data: recommendationsData } = useQuery<{
    recommendations: Array<{
      name: string;
      region: string;
      grapeVariety: string;
      wineType: 'red' | 'white' | 'rosé' | 'sparkling';
      reason: string;
    }>;
    basedOnTastings: number;
  }>({
    queryKey: ['/api/solo/recommendations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/solo/recommendations', null);
      return response.json();
    },
    enabled: !!authData?.user
  });

  const handleWineSubmit = (wine: WineInfo) => {
    setCurrentWine(wine);
    setView('tasting');
  };

  const handleTastingComplete = () => {
    setCurrentWine(null);
    setView('home');
  };

  // Redirect to login if not authenticated
  if (!authLoading && !authData?.user) {
    setLocation('/solo/login');
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Wine entry flow
  if (view === 'wine-entry') {
    return (
      <WineEntryForm
        onSubmit={handleWineSubmit}
        onCancel={() => setView('home')}
      />
    );
  }

  // Tasting flow
  if (view === 'tasting' && currentWine) {
    return (
      <SoloTastingSession
        wine={currentWine}
        onComplete={handleTastingComplete}
        onCancel={() => {
          setCurrentWine(null);
          setView('home');
        }}
      />
    );
  }

  const tastingCount = preferencesData?.tastingCount || 0;
  const recentTastings = tastingsData?.tastings || [];
  const activeJourneys = journeysData?.journeys?.filter((j: any) => j.status === 'in_progress') || [];

  // Calculate quick stats
  const thisMonthTastings = recentTastings.filter((t) => {
    const tastedDate = new Date(t.tastedAt);
    const now = new Date();
    return tastedDate.getMonth() === now.getMonth() && tastedDate.getFullYear() === now.getFullYear();
  }).length;

  // Get preferences for visualization
  const prefs = preferencesData?.preferences || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Wine className="w-6 h-6 text-purple-400" />
            <span className="text-white font-semibold">Know Your Grape</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back{authData?.user?.email ? `, ${authData.user.email.split('@')[0]}` : ''}!
          </h1>
          <p className="text-white/60">
            {tastingCount === 0
              ? "Start your wine journey today"
              : `${tastingCount} wines tasted`}
          </p>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <Calendar className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{thisMonthTastings}</p>
            <p className="text-xs text-white/50">This month</p>
          </div>
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <Wine className="w-5 h-5 text-pink-400 mb-2" />
            <p className="text-2xl font-bold text-white">{tastingCount}</p>
            <p className="text-xs text-white/50">Total wines</p>
          </div>
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{activeJourneys.length}</p>
            <p className="text-xs text-white/50">Journeys</p>
          </div>
        </motion.div>

        {/* Taste Profile Card */}
        {tastingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-purple-500/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Your Taste Profile</h2>
            </div>

            {/* Preference Bars */}
            <div className="space-y-3 mb-4">
              {[
                { label: 'Sweetness', value: prefs.sweetness, color: 'from-pink-500 to-rose-500' },
                { label: 'Acidity', value: prefs.acidity, color: 'from-yellow-500 to-orange-500' },
                { label: 'Tannins', value: prefs.tannins, color: 'from-red-500 to-red-700' },
                { label: 'Body', value: prefs.body, color: 'from-purple-500 to-indigo-500' },
              ].map((pref) => (
                <div key={pref.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{pref.label}</span>
                    <span className="text-white/50">{pref.value ? `${pref.value}/5` : '-'}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: pref.value ? `${(pref.value / 5) * 100}%` : '0%' }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className={`h-full bg-gradient-to-r ${pref.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {preferencesData?.summary && (
              <p className="text-white/80 text-sm">{preferencesData.summary}</p>
            )}
          </motion.div>
        )}

        {/* Wine Recommendations */}
        {recommendationsData?.recommendations && recommendationsData.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Wines You Might Like</h2>
            </div>
            <div className="space-y-2">
              {recommendationsData.recommendations.slice(0, 3).map((rec, index) => (
                <motion.div
                  key={rec.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rec.wineType === 'red' ? 'bg-red-500/20' :
                      rec.wineType === 'white' ? 'bg-yellow-500/20' :
                      rec.wineType === 'rosé' ? 'bg-pink-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      {rec.wineType === 'sparkling' ? (
                        <Sparkles className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Wine className={`w-5 h-5 ${
                          rec.wineType === 'red' ? 'text-red-400' :
                          rec.wineType === 'white' ? 'text-yellow-400' :
                          'text-pink-400'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{rec.name}</h3>
                      <div className="flex items-center gap-2 text-white/50 text-sm">
                        <MapPin className="w-3 h-3" />
                        <span>{rec.region}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/50 text-sm mt-0.5">
                        <Grape className="w-3 h-3" />
                        <span>{rec.grapeVariety}</span>
                      </div>
                      <p className="text-white/60 text-xs mt-2">{rec.reason}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Journeys */}
        {activeJourneys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold text-white mb-3">Continue Your Journey</h2>
            <div className="space-y-3">
              {activeJourneys.slice(0, 2).map((journey: any) => (
                <motion.button
                  key={journey.id}
                  onClick={() => setLocation(`/journeys/${journey.journeyId}`)}
                  className="w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/20 flex items-center justify-between hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-left">
                    <h3 className="text-white font-medium">{journey.title || 'Learning Journey'}</h3>
                    <p className="text-white/50 text-sm">
                      Chapter {journey.currentChapter || 1} of {journey.totalChapters || '?'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        {recentTastings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Recent Tastings</h2>
              <button
                onClick={() => setLocation('/solo/journal')}
                className="text-purple-400 text-sm flex items-center gap-1 hover:text-purple-300"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {recentTastings.slice(0, 3).map((tasting) => (
                <motion.button
                  key={tasting.id}
                  onClick={() => setLocation(`/solo/tasting/${tasting.id}`)}
                  className="w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-3 border border-white/10 flex items-center justify-between hover:bg-white/15 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg flex items-center justify-center">
                      <Wine className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-medium text-sm">{tasting.wineName}</h3>
                      <p className="text-white/50 text-xs">
                        {tasting.wineRegion || tasting.wineType || 'Wine'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(tasting.responses as any)?.overall?.rating && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm">{(tasting.responses as any).overall.rating}</span>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State CTA */}
        {tastingCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center">
              <Wine className="w-10 h-10 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Start Your Wine Journey</h2>
            <p className="text-white/60 mb-6 max-w-sm mx-auto">
              Taste wines, build your palate profile, and discover what you love.
            </p>
            <motion.button
              onClick={() => setView('wine-entry')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium px-8 py-3 rounded-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Taste Your First Wine
            </motion.button>
          </motion.div>
        )}
      </main>

      <BottomNav activeTab="home" onTasteClick={() => setView('wine-entry')} userEmail={authData?.user?.email} />
    </div>
  );
}
