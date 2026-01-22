import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useHomeUser } from "@/contexts/HomeUserContext";
import {
  Wine,
  Plus,
  ChevronRight,
  Loader2,
  Calendar,
  Star,
  Users,
  User as UserIcon,
  Sparkles,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tasting } from "@shared/schema";

interface TastingStats {
  total: number;
  solo: number;
  group: number;
}

interface PreferencesData {
  preferences: Record<string, number | null>;
  tastingCount: number;
  summary: string;
}

interface DashboardData {
  user: {
    email: string;
    displayName: string;
  };
  topPreferences?: {
    topRegion: { name: string; count: number; avgRating: number };
    topGrape: { name: string; count: number; avgRating: number };
    averageRating: { score: number; totalWines: number };
  };
  unifiedTastingStats?: TastingStats;
}

export default function HomeTastings() {
  const [, setLocation] = useLocation();
  const user = useHomeUser();
  const queryClient = useQueryClient();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", null);
      localStorage.removeItem("kyg_user_email");
      queryClient.clear();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Get dashboard data with unified stats
  const { data: dashboardData } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", user.email],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/dashboard/${encodeURIComponent(user.email)}`, null);
      if (!response.ok) throw new Error("Failed to fetch dashboard");
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Get solo tastings
  const { data: tastingsData, isLoading: tastingsLoading } = useQuery<{
    tastings: Tasting[];
    total: number;
  }>({
    queryKey: ["/api/solo/tastings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/solo/tastings?limit=10", null);
      return response.json();
    },
  });

  // Get preferences
  const { data: preferencesData } = useQuery<PreferencesData>({
    queryKey: ["/api/solo/preferences"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/solo/preferences", null);
      return response.json();
    },
  });

  const stats = dashboardData?.unifiedTastingStats || {
    total: preferencesData?.tastingCount || 0,
    solo: preferencesData?.tastingCount || 0,
    group: 0,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src="/logo-cata-horizontal.svg"
            alt="Cata"
            className="h-8 w-auto"
          />
          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors text-sm"
            >
              <span className="hidden sm:block truncate max-w-[150px]">
                {user.email}
              </span>
              <UserIcon className="w-5 h-5 sm:hidden" />
              <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white/40 text-xs">Signed in as</p>
                    <p className="text-white text-sm truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white mb-1">Welcome Back!</h1>
          <p className="text-white/60">
            {stats.total} tasting{stats.total !== 1 ? "s" : ""} completed
          </p>
        </motion.div>

        {/* Quick Stats */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-3"
          >
            <StatCard
              icon={Wine}
              label="Total"
              value={stats.total}
              color="purple"
            />
            <StatCard
              icon={UserIcon}
              label="Solo"
              value={stats.solo}
              color="blue"
            />
            <StatCard
              icon={Users}
              label="Group"
              value={stats.group}
              color="pink"
            />
          </motion.div>
        )}

        {/* Start Tasting CTA */}
        <motion.button
          onClick={() => setLocation("/tasting/new")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 flex items-center justify-between group hover:from-purple-600 hover:to-pink-600 transition-all"
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

        {/* Taste Profile Summary */}
        {preferencesData && preferencesData.tastingCount > 0 && preferencesData.summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Your Taste Profile</h2>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{preferencesData.summary}</p>

            {/* Top Preferences Pills */}
            {dashboardData?.topPreferences && (
              <div className="flex flex-wrap gap-2 mt-4">
                {dashboardData.topPreferences.topRegion?.name && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    {dashboardData.topPreferences.topRegion.name}
                  </span>
                )}
                {dashboardData.topPreferences.topGrape?.name && (
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-full text-xs">
                    {dashboardData.topPreferences.topGrape.name}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Recent Tastings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Recent Tastings</h2>

          {tastingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : tastingsData?.tastings && tastingsData.tastings.length > 0 ? (
            <div className="space-y-3">
              {tastingsData.tastings.map((tasting, index) => (
                <motion.div
                  key={tasting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  onClick={() => setLocation(`/solo/tasting/${tasting.id}`)}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/15 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">{tasting.wineName}</h3>
                        {/* Source badge */}
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[10px] font-medium flex-shrink-0">
                          Solo
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-white/60">
                        {tasting.wineType && (
                          <span className="bg-white/10 px-2 py-0.5 rounded capitalize">
                            {tasting.wineType}
                          </span>
                        )}
                        {tasting.wineRegion && (
                          <span className="truncate">{tasting.wineRegion}</span>
                        )}
                        {tasting.wineVintage && <span>{tasting.wineVintage}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm">
                            {(tasting.responses as Record<string, any>)?.overall?.rating || "-"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(tasting.tastedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyTastingsCard onStartTasting={() => setLocation("/tasting/new")} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Wine;
  label: string;
  value: number;
  color: "purple" | "blue" | "pink";
}) {
  const colorClasses = {
    purple: "bg-purple-500/20 text-purple-400",
    blue: "bg-blue-500/20 text-blue-400",
    pink: "bg-pink-500/20 text-pink-400",
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

// Empty State Card
function EmptyTastingsCard({ onStartTasting }: { onStartTasting: () => void }) {
  return (
    <div className="text-center py-12 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl border border-white/10">
      <Wine className="w-12 h-12 text-white/30 mx-auto mb-4" />
      <p className="text-white/60 mb-4">No tastings yet</p>
      <Button
        onClick={onStartTasting}
        variant="outline"
        className="border-white/10 text-white hover:bg-white/10"
      >
        Start Your First Tasting
      </Button>
    </div>
  );
}
