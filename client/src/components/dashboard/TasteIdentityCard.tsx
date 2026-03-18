import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, Loader2, Sparkles, Grape, MapPin, ChevronRight } from "lucide-react";
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
        <CardContent className={`flex items-center justify-center ${compact ? 'py-6' : 'py-12'}`}>
          <Loader2 className="w-6 h-6 text-purple-300 animate-spin" />
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
        <CardContent className={`text-center ${compact ? 'py-5' : 'py-8'} text-purple-200`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-300" />
            <p className="text-sm font-medium">Your Profile is Forming</p>
          </div>
          <p className="text-xs text-purple-200/70">
            Complete a tasting to start building your taste identity.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { traits, styleIdentity, confidence, flavorAffinities, wineTypeDistribution, topRegions, topGrapes, dataSnapshot } = profile;

  // Compact mode: just style sentence + count + link
  if (compact) {
    return (
      <button
        onClick={onViewFull}
        className="w-full bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-left transition-all hover:border-white/30 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white text-sm font-semibold">Your Taste Profile</span>
          </div>
          <div className="flex items-center gap-2">
            {synthesizing && (
              <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
            )}
            <Badge variant="outline" className="text-purple-300 border-purple-500/30 text-[10px]">
              {dataSnapshot.totalTastings} tasting{dataSnapshot.totalTastings !== 1 ? 's' : ''}
            </Badge>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
        </div>
        {confidence !== 'low' && styleIdentity ? (
          <p className="text-purple-200/80 text-xs leading-relaxed line-clamp-2">
            {styleIdentity}
          </p>
        ) : (
          <p className="text-purple-200/60 text-xs">
            Keep tasting to unlock your palate insights
          </p>
        )}
      </button>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border-white/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Your Taste Profile
          </CardTitle>
          <div className="flex items-center gap-2">
            {synthesizing && (
              <span className="flex items-center gap-1 text-xs text-amber-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating
              </span>
            )}
            <Badge variant="outline" className="text-purple-300 border-purple-500/30 text-[10px]">
              {dataSnapshot.totalTastings} tasting{dataSnapshot.totalTastings !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Style Identity Narrative */}
        {confidence !== 'low' && styleIdentity && (
          <p className="text-purple-200/80 text-xs leading-relaxed italic">
            "{styleIdentity}"
          </p>
        )}

        {/* Trait Bars */}
        <div className="space-y-2">
          {(Object.keys(traits) as TraitName[]).map((trait) => {
            const score = traits[trait];
            const barWidth = (score.value / 5) * 100;
            const opacity = 0.3 + score.confidence * 0.7;

            return (
              <div key={trait} className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-purple-200 text-[11px]">{TRAIT_LABELS[trait]}</span>
                  <span className="text-white/50 text-[11px]">
                    {getTraitDescriptor(trait, score.value)}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
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

        {/* Two-column: Wine Types + Regions/Grapes */}
        <div className="grid grid-cols-2 gap-3">
          {/* Wine Type Distribution */}
          {Object.keys(wineTypeDistribution).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-white/60 text-[10px] font-medium uppercase tracking-wide">
                What You Drink
              </h4>
              {Object.entries(wineTypeDistribution)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 3)
                .map(([type, { count }]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-purple-200 text-xs capitalize">{type}</span>
                    <span className="text-purple-400 text-[10px]">{count}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Top Regions or Grapes */}
          {topRegions.length > 0 ? (
            <div className="space-y-1.5">
              <h4 className="text-white/60 text-[10px] font-medium uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> Top Regions
              </h4>
              {topRegions.slice(0, 3).map((r) => (
                <p key={r.name} className="text-purple-200 text-xs truncate">{r.name}</p>
              ))}
            </div>
          ) : topGrapes.length > 0 ? (
            <div className="space-y-1.5">
              <h4 className="text-white/60 text-[10px] font-medium uppercase tracking-wide flex items-center gap-1">
                <Grape className="w-2.5 h-2.5" /> Top Grapes
              </h4>
              {topGrapes.slice(0, 3).map((g) => (
                <p key={g.name} className="text-purple-200 text-xs truncate">{g.name}</p>
              ))}
            </div>
          ) : null}
        </div>

        {/* Flavor Affinities */}
        {flavorAffinities.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-white/60 text-[10px] font-medium uppercase tracking-wide">
              Flavors You Love
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {flavorAffinities.slice(0, 6).map((flavor) => (
                <Badge
                  key={flavor.name}
                  variant="outline"
                  className="text-purple-200 border-purple-500/30 bg-purple-500/10 text-[10px] px-2 py-0"
                >
                  {flavor.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Confidence indicator at bottom */}
        {confidence === 'low' && (
          <p className="text-center text-purple-300/60 text-[10px] pt-2 border-t border-white/5">
            Early profile — keep tasting to unlock deeper insights
          </p>
        )}
      </CardContent>
    </Card>
  );
}
