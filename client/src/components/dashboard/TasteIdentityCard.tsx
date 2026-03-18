import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, Loader2, Sparkles, Grape, MapPin } from "lucide-react";
import type { TasteProfile, TraitName } from "@shared/schema";

interface TasteProfileResponse {
  profile: TasteProfile | null;
  synthesizing: boolean;
}

const TRAIT_LABELS: Record<TraitName, string> = {
  sweetness: 'Sweetness',
  acidity: 'Acidity',
  tannins: 'Tannins',
  body: 'Body',
};

const TRAIT_DESCRIPTORS: Record<TraitName, Record<string, string>> = {
  sweetness: { low: 'Dry', medium: 'Off-dry', high: 'Sweet' },
  acidity: { low: 'Soft', medium: 'Balanced', high: 'Crisp' },
  tannins: { low: 'Silky', medium: 'Moderate', high: 'Bold' },
  body: { low: 'Light', medium: 'Medium', high: 'Full' },
};

function getTraitDescriptor(trait: TraitName, value: number): string {
  const level = value < 2.3 ? 'low' : value < 3.7 ? 'medium' : 'high';
  return TRAIT_DESCRIPTORS[trait][level];
}

interface TasteIdentityCardProps {
  compact?: boolean;
  onViewFull?: () => void;
}

export function TasteIdentityCard({ compact = false, onViewFull }: TasteIdentityCardProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<TasteProfileResponse>({
    queryKey: ['/api/me/taste-profile'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/me/taste-profile', {
        credentials: 'include',
        signal,
      });
      if (!res.ok) throw new Error('Failed to load profile');
      return res.json();
    },
    refetchInterval: (query) => {
      return query.state.data?.synthesizing ? 3000 : false;
    },
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000,
  });

  const profile = data?.profile;
  const synthesizing = data?.synthesizing ?? false;

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border-white/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Error or not authenticated
  if (error) {
    return null;
  }

  // No profile yet
  if (!profile) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-300" />
            Your Taste Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-purple-200">
          <Wine className="w-12 h-12 mx-auto mb-4 text-purple-400/50" />
          <p className="text-lg font-medium mb-2">Your Profile is Forming</p>
          <p className="text-sm text-purple-200/70">
            Complete a tasting to start building your personalized taste identity.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { traits, styleIdentity, confidence, flavorAffinities, wineTypeDistribution, topRegions, topGrapes, dataSnapshot } = profile;

  // Compact mode: just style identity + tasting count, tappable
  if (compact) {
    return (
      <Card
        className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border-white/20 cursor-pointer hover:bg-purple-900/50 transition-colors"
        onClick={onViewFull}
      >
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {styleIdentity && confidence !== 'low' ? (
                <p className="text-purple-100 text-sm leading-relaxed line-clamp-2 italic">
                  "{styleIdentity}"
                </p>
              ) : (
                <p className="text-purple-200 text-sm">Your taste profile is forming...</p>
              )}
              <p className="text-purple-300/60 text-xs mt-1">
                {dataSnapshot.totalTastings} tasting{dataSnapshot.totalTastings !== 1 ? 's' : ''}
                {onViewFull && ' · Tap to view full profile'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border-white/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Your Taste Profile
          </CardTitle>
          <div className="flex items-center gap-2">
            {synthesizing && (
              <span className="flex items-center gap-1 text-xs text-amber-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating
              </span>
            )}
            <Badge variant="outline" className="text-purple-300 border-purple-500/30 text-xs">
              {dataSnapshot.totalTastings} tasting{dataSnapshot.totalTastings !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Style Identity Narrative */}
        {confidence !== 'low' && styleIdentity && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-3"
          >
            <p className="text-purple-100 text-sm leading-relaxed max-w-md mx-auto italic">
              "{styleIdentity}"
            </p>
          </motion.div>
        )}

        {/* Trait Bars */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h4 className="text-white/80 text-sm font-medium uppercase tracking-wide">
            Your Palate
          </h4>

          <div className="space-y-2.5">
            {(Object.keys(traits) as TraitName[]).map((trait) => {
              const score = traits[trait];
              const barWidth = (score.value / 5) * 100;
              const opacity = 0.3 + score.confidence * 0.7;

              return (
                <div key={trait} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-purple-200 text-xs">{TRAIT_LABELS[trait]}</span>
                    <span className="text-white/60 text-xs">
                      {getTraitDescriptor(trait, score.value)}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ opacity }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Flavor Affinities */}
        {flavorAffinities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h4 className="text-white/80 text-sm font-medium uppercase tracking-wide">
              Flavors You Love
            </h4>
            <div className="flex flex-wrap gap-2">
              {flavorAffinities.slice(0, 8).map((flavor) => (
                <Badge
                  key={flavor.name}
                  variant="outline"
                  className="text-purple-200 border-purple-500/30 bg-purple-500/10"
                >
                  {flavor.name}
                  {flavor.count > 1 && (
                    <span className="ml-1 text-purple-400 text-[10px]">x{flavor.count}</span>
                  )}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Wine Type Distribution */}
        {Object.keys(wineTypeDistribution).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h4 className="text-white/80 text-sm font-medium uppercase tracking-wide">
              What You Drink
            </h4>
            <div className="flex gap-3">
              {Object.entries(wineTypeDistribution)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 4)
                .map(([type, { count, avgRating }]) => (
                  <div key={type} className="flex-1 bg-white/5 rounded-lg p-2.5 text-center">
                    <p className="text-white text-sm font-medium capitalize">{type}</p>
                    <p className="text-purple-300 text-xs">{count} wine{count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Top Regions & Grapes */}
        {(topRegions.length > 0 || topGrapes.length > 0) && confidence !== 'low' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-3"
          >
            {topRegions.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-white/60 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Top Regions
                </h4>
                {topRegions.slice(0, 3).map((r) => (
                  <p key={r.name} className="text-purple-200 text-xs truncate">{r.name}</p>
                ))}
              </div>
            )}
            {topGrapes.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-white/60 text-xs flex items-center gap-1">
                  <Grape className="w-3 h-3" /> Top Grapes
                </h4>
                {topGrapes.slice(0, 3).map((g) => (
                  <p key={g.name} className="text-purple-200 text-xs truncate">{g.name}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Confidence indicator at bottom */}
        {confidence === 'low' && (
          <p className="text-center text-purple-300/60 text-xs pt-2 border-t border-white/5">
            Early profile — keep tasting to unlock deeper insights
          </p>
        )}
      </CardContent>
    </Card>
  );
}
