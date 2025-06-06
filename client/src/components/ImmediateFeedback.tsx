import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, TrendingUp, Heart, Award, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface TastingProfile {
  preferences: {
    body: "light" | "medium" | "full";
    fruitProfile: "red" | "dark" | "stone" | "tropical";
    tannins: "soft" | "medium" | "firm";
    acidity: "low" | "medium" | "high";
    complexity: "simple" | "moderate" | "complex";
  };
  confidence: number;
  recommendations: string[];
  personalityType: string;
}

interface ImmediateFeedbackProps {
  responses: Record<string, any>;
  currentWine: {
    wineName: string;
    wineType: string;
    vintage?: number;
    region?: string;
  };
  onViewRecommendations: () => void;
}

export function ImmediateFeedback({ responses, currentWine, onViewRecommendations }: ImmediateFeedbackProps) {
  const [profile, setProfile] = useState<TastingProfile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    // Simulate analysis delay for better UX
    const timer = setTimeout(() => {
      setProfile(analyzeResponses(responses));
      setIsAnalyzing(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [responses]);

  const analyzeResponses = (responses: Record<string, any>): TastingProfile => {
    // Analyze user responses to build taste profile
    const bodyScores = Object.values(responses).filter(r => 
      r.category === "Body" && typeof r.value === "number"
    );
    const aromaSelections = Object.values(responses).filter(r => 
      r.category === "Aroma" && Array.isArray(r.selected)
    );
    const tasteSelections = Object.values(responses).filter(r => 
      r.category === "Taste" && Array.isArray(r.selected)
    );
    const overallRatings = Object.values(responses).filter(r => 
      r.category === "Overall" && typeof r.value === "number"
    );

    // Determine body preference
    const avgBody = bodyScores.length > 0 
      ? bodyScores.reduce((sum: number, r: any) => sum + r.value, 0) / bodyScores.length 
      : 3;
    const bodyPref = avgBody <= 2 ? "light" : avgBody <= 4 ? "medium" : "full";

    // Analyze fruit preferences
    const allFruitSelections = aromaSelections.concat(tasteSelections)
      .flatMap((r: any) => r.selected || []);
    
    const fruitCounts = {
      red: 0,
      dark: 0,
      stone: 0,
      tropical: 0
    };

    allFruitSelections.forEach((selection: string) => {
      const lower = selection.toLowerCase();
      if (lower.includes("cherry") || lower.includes("strawberry") || lower.includes("raspberry")) {
        fruitCounts.red++;
      } else if (lower.includes("blackberry") || lower.includes("plum") || lower.includes("blackcurrant")) {
        fruitCounts.dark++;
      } else if (lower.includes("peach") || lower.includes("apricot") || lower.includes("stone")) {
        fruitCounts.stone++;
      } else if (lower.includes("tropical") || lower.includes("pineapple") || lower.includes("mango")) {
        fruitCounts.tropical++;
      }
    });

    const dominantFruit = Object.entries(fruitCounts).reduce((a, b) => 
      fruitCounts[a[0] as keyof typeof fruitCounts] > fruitCounts[b[0] as keyof typeof fruitCounts] ? a : b
    )[0] as keyof typeof fruitCounts;

    // Calculate confidence based on response consistency
    const responseCount = Object.keys(responses).length;
    const confidence = Math.min(95, Math.max(60, responseCount * 15));

    // Generate personality type
    const personalityTypes = [
      "The Fruit Explorer - You gravitate toward bright, fruit-forward wines",
      "The Complexity Seeker - You appreciate layered, nuanced wines", 
      "The Bold Adventurer - You enjoy full-bodied, intense wines",
      "The Elegant Minimalist - You prefer refined, subtle wines"
    ];

    const personalityType = bodyPref === "full" ? personalityTypes[2] :
                           dominantFruit === "stone" ? personalityTypes[0] :
                           confidence > 80 ? personalityTypes[1] : personalityTypes[3];

    // Generate recommendations
    const recommendations = generateRecommendations(bodyPref, dominantFruit, currentWine);

    return {
      preferences: {
        body: bodyPref,
        fruitProfile: dominantFruit,
        tannins: "medium", // Simplified for demo
        acidity: "medium",
        complexity: confidence > 80 ? "complex" : "moderate"
      },
      confidence,
      recommendations,
      personalityType
    };
  };

  const generateRecommendations = (body: string, fruit: string, wine: any): string[] => {
    const baseRecommendations = [
      `${wine.wineName} (the wine you just tasted)`,
      "2019 Château Margaux - Similar elegance and complexity",
      "2020 Opus One - Bold California expression"
    ];

    if (body === "light") {
      return [
        "Pinot Noir from Burgundy - Light, elegant reds",
        "Beaujolais Cru - Fruit-forward and approachable",
        "Loire Valley Cabernet Franc - Herbal and refined"
      ];
    }

    if (body === "full") {
      return [
        "Napa Valley Cabernet Sauvignon - Rich and powerful",
        "Barolo from Piedmont - Structured Italian classics",
        "Rhône Valley Syrah - Spicy and full-bodied"
      ];
    }

    return baseRecommendations;
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-card backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 mx-auto mb-4"
        >
          <Wine className="w-full h-full text-purple-300" />
        </motion.div>
        <h3 className="text-lg font-semibold text-white mb-2">Analyzing Your Taste Profile</h3>
        <p className="text-white/70 text-sm">Processing your responses to build personalized recommendations...</p>
        <Progress value={85} className="mt-4 h-2" />
      </motion.div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center"
        >
          <Award className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">Your Taste Profile</h2>
        <p className="text-white/70 text-sm">Based on your responses to {currentWine.wineName}</p>
      </div>

      {/* Confidence Score */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-medium">Profile Confidence</span>
          <span className="text-white text-lg font-bold">{profile.confidence}%</span>
        </div>
        <Progress value={profile.confidence} className="h-2" />
        <p className="text-white/60 text-xs mt-2">
          {profile.confidence > 85 ? "Highly accurate profile" : 
           profile.confidence > 70 ? "Good profile accuracy" : "Building your profile"}
        </p>
      </div>

      {/* Personality Type */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-amber-200 font-medium mb-1">Wine Personality</h3>
            <p className="text-amber-100 text-sm">{profile.personalityType}</p>
          </div>
        </div>
      </div>

      {/* Taste Preferences */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Body Preference</div>
          <div className="text-white font-medium capitalize">{profile.preferences.body}-bodied</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Fruit Profile</div>
          <div className="text-white font-medium capitalize">{profile.preferences.fruitProfile} fruits</div>
        </div>
      </div>

      {/* Quick Recommendations */}
      <div className="space-y-3">
        <h3 className="text-white font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-300" />
          Wines You Might Love
        </h3>
        <div className="space-y-2">
          {profile.recommendations.slice(0, 3).map((wine, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
            >
              <span className="text-white text-sm">{wine}</span>
              <ChevronRight className="w-4 h-4 text-white/40" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={onViewRecommendations}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl"
      >
        View Full Recommendations & Profile
      </Button>

      <div className="text-center text-xs text-white/50">
        Continue tasting to refine your profile further
      </div>
    </motion.div>
  );
}