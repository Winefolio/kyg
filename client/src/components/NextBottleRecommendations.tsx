import { motion } from "framer-motion";
import { Wine, ArrowRight, Sparkles, TrendingUp, Compass, DollarSign, MessageCircle } from "lucide-react";
import type { TastingRecommendation } from "@shared/schema";

interface NextBottleRecommendationsProps {
  recommendations: TastingRecommendation[];
  wineName: string;
}

const typeConfig = {
  similar: {
    icon: Wine,
    label: "Similar Style",
    description: "Another wine you'll likely enjoy for the same reasons",
    color: "from-purple-500 to-pink-500"
  },
  step_up: {
    icon: TrendingUp,
    label: "Step Up",
    description: "A more interesting or complex version of what you liked",
    color: "from-blue-500 to-purple-500"
  },
  exploration: {
    icon: Compass,
    label: "Exploration",
    description: "Something different that might expand your palate",
    color: "from-amber-500 to-orange-500"
  }
};

interface RecommendationCardProps {
  recommendation: TastingRecommendation;
  index: number;
}

function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const config = typeConfig[recommendation.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10"
    >
      {/* Type badge */}
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.color} text-white text-sm font-medium`}>
          <Icon className="w-4 h-4" />
          {config.label}
        </div>
        <div className="flex items-center gap-1 text-white/60 text-sm">
          <DollarSign className="w-3 h-3" />
          <span className="font-mono">
            ${recommendation.priceRange.min}-${recommendation.priceRange.max}
          </span>
        </div>
      </div>

      {/* Wine name */}
      <h4 className="text-white font-semibold text-lg mb-2">
        {recommendation.wineName}
      </h4>

      {/* Reason */}
      <p className="text-white/70 text-sm mb-4">
        {recommendation.reason}
      </p>

      {/* What to ask for */}
      <div className="bg-white/5 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-white/50 mb-1">At the wine shop, ask for:</p>
            <p className="text-sm text-white/90">{recommendation.askFor}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function NextBottleRecommendations({ recommendations, wineName }: NextBottleRecommendationsProps) {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 mb-4">
          <Sparkles className="w-5 h-5" />
          Based on your {wineName} tasting
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Your Next Bottles
        </h2>
        <p className="text-white/60">
          Here are three wines to try based on what you liked (and didn't like) about your tasting.
        </p>
      </motion.div>

      {/* Recommendations grid */}
      <div className="grid gap-4">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={`${rec.type}-${index}`}
            recommendation={rec}
            index={index}
          />
        ))}
      </div>

      {/* Footer tip */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-white/50 text-sm"
      >
        Save these recommendations to your dashboard for easy reference when shopping.
      </motion.p>
    </div>
  );
}
