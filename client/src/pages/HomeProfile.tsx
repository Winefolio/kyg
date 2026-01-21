import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useHomeUser } from "@/contexts/HomeUserContext";
import {
  User as UserIcon,
  Wine,
  Calendar,
  LogOut,
  Loader2,
  Star,
  MapPin,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Grid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PreferencesData {
  preferences: Record<string, number | null>;
  tastingCount: number;
  summary: string;
}

interface TasteProfile {
  redWineProfile: {
    stylePreference: string;
    preferredVarieties: Array<{ grape: string; averageScore: number; count: number }>;
    favoriteRegions: Array<{ region: string; count: number }>;
    commonFlavorNotes: string[];
    summary?: string;
  };
  whiteWineProfile: {
    stylePreference: string;
    preferredVarieties: Array<{ grape: string; averageScore: number; count: number }>;
    favoriteRegions: Array<{ region: string; count: number }>;
    commonFlavorNotes: string[];
    summary?: string;
  };
  overallStats: {
    totalWines: number;
    averageRating: number;
    topRegion: { name: string; count: number; percentage: number };
    topGrape: { name: string; count: number; percentage: number };
  };
}

interface SommelierTips {
  preferenceProfile: string;
  redDescription: string;
  whiteDescription: string;
  questions: string[];
  priceGuidance: string;
}

interface WineScore {
  wineId: string;
  wineName: string;
  wineDescription: string;
  wineImageUrl: string;
  producer?: string;
  region?: string;
  vintage?: number;
  wineType?: string;
  grapeVarietals?: string[];
  averageScore: number;
  totalRatings: number;
  source?: "solo" | "group";
}

export default function HomeProfile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const user = useHomeUser();

  // Get preferences
  const { data: preferencesData } = useQuery<PreferencesData>({
    queryKey: ["/api/solo/preferences"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/solo/preferences", null);
      return response.json();
    },
  });

  // Get taste profile
  const { data: tasteProfile } = useQuery<TasteProfile>({
    queryKey: ["/api/dashboard", user.email, "taste-profile"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/dashboard/${encodeURIComponent(user.email)}/taste-profile`,
        null
      );
      if (!response.ok) throw new Error("Failed to fetch taste profile");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get sommelier tips
  const { data: sommelierTips, isLoading: tipsLoading } = useQuery<SommelierTips>({
    queryKey: ["/api/dashboard", user.email, "sommelier-tips"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/dashboard/${encodeURIComponent(user.email)}/sommelier-tips`,
        null
      );
      if (!response.ok) throw new Error("Failed to fetch sommelier tips");
      return response.json();
    },
    enabled: (preferencesData?.tastingCount || 0) >= 3,
    staleTime: 10 * 60 * 1000,
  });

  // Get wine collection
  const { data: wineCollection, isLoading: collectionLoading } = useQuery<{
    wines: WineScore[];
    total: number;
  }>({
    queryKey: ["/api/dashboard", user.email, "collection"],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/dashboard/${encodeURIComponent(user.email)}/collection?limit=50`,
        null
      );
      if (!response.ok) throw new Error("Failed to fetch wine collection");
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <UserIcon className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-semibold text-white">Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white truncate">{user.email}</h2>
              <div className="flex items-center gap-1 text-white/60 text-sm mt-1">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/10">
            <StatItem icon={Wine} label="Tastings" value={preferencesData?.tastingCount || 0} />
            <StatItem
              icon={Star}
              label="Avg Rating"
              value={tasteProfile?.overallStats?.averageRating?.toFixed(1) || "-"}
            />
            <StatItem
              icon={MapPin}
              label="Regions"
              value={tasteProfile?.redWineProfile?.favoriteRegions?.length || 0}
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 w-full">
            <TabsTrigger
              value="overview"
              className="flex-1 text-white/70 data-[state=active]:text-white data-[state=active]:bg-purple-500/20"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="collection"
              className="flex-1 text-white/70 data-[state=active]:text-white data-[state=active]:bg-purple-500/20"
            >
              Collection
            </TabsTrigger>
            <TabsTrigger
              value="tips"
              className="flex-1 text-white/70 data-[state=active]:text-white data-[state=active]:bg-purple-500/20"
            >
              Tips
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Taste Profile Summary */}
            {preferencesData && preferencesData.tastingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20"
              >
                <h3 className="text-lg font-semibold text-white mb-3">Your Taste Profile</h3>
                {preferencesData.summary && (
                  <p className="text-white/80 text-sm mb-4">{preferencesData.summary}</p>
                )}

                {/* Preference Bars */}
                <div className="space-y-4">
                  {preferencesData.preferences.sweetness !== null && (
                    <PreferenceBar
                      label="Sweetness"
                      value={preferencesData.preferences.sweetness}
                      leftLabel="Dry"
                      rightLabel="Sweet"
                    />
                  )}
                  {preferencesData.preferences.acidity !== null && (
                    <PreferenceBar
                      label="Acidity"
                      value={preferencesData.preferences.acidity}
                      leftLabel="Soft"
                      rightLabel="Crisp"
                    />
                  )}
                  {preferencesData.preferences.tannins !== null && (
                    <PreferenceBar
                      label="Tannins"
                      value={preferencesData.preferences.tannins}
                      leftLabel="Silky"
                      rightLabel="Grippy"
                    />
                  )}
                  {preferencesData.preferences.body !== null && (
                    <PreferenceBar
                      label="Body"
                      value={preferencesData.preferences.body}
                      leftLabel="Light"
                      rightLabel="Full"
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* Red vs White Profiles */}
            {tasteProfile && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Red Wine Profile */}
                {tasteProfile.redWineProfile?.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-red-500/10 to-red-900/10 backdrop-blur-xl rounded-2xl p-5 border border-red-500/20"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🍷</span>
                      <h3 className="text-lg font-semibold text-white">Red Wines</h3>
                    </div>
                    <p className="text-white/70 text-sm">{tasteProfile.redWineProfile.summary}</p>
                    {tasteProfile.redWineProfile.preferredVarieties?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tasteProfile.redWineProfile.preferredVarieties.slice(0, 3).map((v) => (
                          <span
                            key={v.grape}
                            className="px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs"
                          >
                            {v.grape}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* White Wine Profile */}
                {tasteProfile.whiteWineProfile?.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-yellow-500/10 to-amber-900/10 backdrop-blur-xl rounded-2xl p-5 border border-yellow-500/20"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">🥂</span>
                      <h3 className="text-lg font-semibold text-white">White Wines</h3>
                    </div>
                    <p className="text-white/70 text-sm">{tasteProfile.whiteWineProfile.summary}</p>
                    {tasteProfile.whiteWineProfile.preferredVarieties?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tasteProfile.whiteWineProfile.preferredVarieties.slice(0, 3).map((v) => (
                          <span
                            key={v.grape}
                            className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs"
                          >
                            {v.grape}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* Empty state */}
            {(!preferencesData || preferencesData.tastingCount === 0) && (
              <EmptyProfileCard onStartTasting={() => setLocation("/tasting/new")} />
            )}
          </TabsContent>

          {/* Collection Tab */}
          <TabsContent value="collection" className="mt-4">
            {collectionLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : wineCollection?.wines && wineCollection.wines.length > 0 ? (
              <div className="space-y-4">
                {/* View Toggle */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "list" ? "bg-purple-500/20 text-purple-400" : "text-white/50 hover:text-white/70"
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${
                      viewMode === "grid" ? "bg-purple-500/20 text-purple-400" : "text-white/50 hover:text-white/70"
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                </div>

                {/* Wine List/Grid */}
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 md:grid-cols-3 gap-4"
                      : "space-y-3"
                  }
                >
                  {wineCollection.wines.map((wine) => (
                    <WineCard key={wine.wineId} wine={wine} viewMode={viewMode} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyCollectionCard onStartTasting={() => setLocation("/tasting/new")} />
            )}
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="mt-4">
            {tipsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : sommelierTips ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Profile Description */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Your Wine Profile</h3>
                  </div>
                  <p className="text-white/80 text-sm">{sommelierTips.preferenceProfile}</p>
                </div>

                {/* Questions to Ask */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    What to Ask the Sommelier
                  </h3>
                  <ul className="space-y-3">
                    {sommelierTips.questions.map((question, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-white/80 text-sm">
                        <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Price Guidance */}
                {sommelierTips.priceGuidance && (
                  <div className="bg-gradient-to-br from-green-500/10 to-green-900/10 backdrop-blur-xl rounded-2xl p-5 border border-green-500/20">
                    <h3 className="text-lg font-semibold text-white mb-2">Price Guidance</h3>
                    <p className="text-white/80 text-sm">{sommelierTips.priceGuidance}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <MessageSquare className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Not Enough Data</h3>
                <p className="text-purple-300/70 text-sm">
                  Complete at least 3 tastings to unlock personalized sommelier tips.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            Sign Out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// Stat Item Component
function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wine;
  label: string;
  value: number | string;
}) {
  return (
    <div className="text-center">
      <Icon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

// Preference Bar Component
function PreferenceBar({
  label,
  value,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const percentage = ((value - 1) / 4) * 100; // Scale from 1-5 to 0-100

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">{value.toFixed(1)}/5</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
        />
      </div>
      <div className="flex justify-between text-xs text-white/40">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

// Wine Card Component
function WineCard({ wine, viewMode }: { wine: WineScore; viewMode: "grid" | "list" }) {
  if (viewMode === "grid") {
    return (
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden">
        {wine.wineImageUrl ? (
          <img src={wine.wineImageUrl} alt={wine.wineName} className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 bg-purple-900/30 flex items-center justify-center">
            <Wine className="w-8 h-8 text-purple-400/50" />
          </div>
        )}
        <div className="p-3">
          <h4 className="text-sm font-medium text-white truncate">{wine.wineName}</h4>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-white/50">{wine.wineType || "Wine"}</span>
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs">{wine.averageScore?.toFixed(1) || "-"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/20 flex items-center gap-4">
      {wine.wineImageUrl ? (
        <img
          src={wine.wineImageUrl}
          alt={wine.wineName}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-purple-900/30 flex items-center justify-center flex-shrink-0">
          <Wine className="w-6 h-6 text-purple-400/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium truncate">{wine.wineName}</h4>
        <div className="flex items-center gap-2 text-sm text-white/50 mt-1">
          {wine.wineType && <span className="capitalize">{wine.wineType}</span>}
          {wine.region && (
            <>
              <span>•</span>
              <span className="truncate">{wine.region}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-yellow-400">
        <Star className="w-4 h-4 fill-current" />
        <span className="text-sm">{wine.averageScore?.toFixed(1) || "-"}</span>
      </div>
    </div>
  );
}

// Empty States
function EmptyProfileCard({ onStartTasting }: { onStartTasting: () => void }) {
  return (
    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
      <BarChart3 className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">No Taste Profile Yet</h3>
      <p className="text-purple-300/70 text-sm mb-4">
        Complete some tastings to build your personalized taste profile.
      </p>
      <Button
        onClick={onStartTasting}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        Start Tasting
      </Button>
    </div>
  );
}

function EmptyCollectionCard({ onStartTasting }: { onStartTasting: () => void }) {
  return (
    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
      <Wine className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">No Wines Yet</h3>
      <p className="text-purple-300/70 text-sm mb-4">
        Start tasting wines to build your collection.
      </p>
      <Button
        onClick={onStartTasting}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        Start Tasting
      </Button>
    </div>
  );
}
