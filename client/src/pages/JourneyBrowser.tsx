import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Wine,
  BookOpen,
  Clock,
  Target,
  ChevronRight,
  Sparkles,
  GraduationCap,
  MapPin,
  ArrowLeft,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Journey {
  id: number;
  title: string;
  description: string | null;
  difficultyLevel: string;
  estimatedDuration: string | null;
  wineType: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  totalChapters: number;
  createdAt: string;
}

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  intermediate: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30" },
  advanced: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" }
};

const wineTypeIcons: Record<string, string> = {
  red: "🍷",
  white: "🥂",
  rosé: "🌸",
  sparkling: "✨",
  mixed: "🍇"
};

export default function JourneyBrowser() {
  const [, setLocation] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedWineType, setSelectedWineType] = useState<string | null>(null);

  const { data: journeysData, isLoading } = useQuery({
    queryKey: ["journeys", selectedDifficulty, selectedWineType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDifficulty) params.append("difficulty", selectedDifficulty);
      if (selectedWineType) params.append("wineType", selectedWineType);

      const response = await fetch(`/api/journeys?${params}`);
      if (!response.ok) throw new Error("Failed to fetch journeys");
      return response.json();
    }
  });

  const journeys: Journey[] = journeysData?.journeys || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0015]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation("/home")}
              className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-semibold text-white">Learning Journeys</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <GraduationCap className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Your Wine Education Awaits
          </h2>
          <p className="text-purple-200/80 max-w-xl mx-auto">
            Follow structured learning paths to develop your palate and become a more confident wine enthusiast.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-8 justify-center"
        >
          <div className="flex items-center gap-2 text-purple-300 mr-4">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter:</span>
          </div>

          {/* Difficulty Filter */}
          <div className="flex gap-2">
            {["beginner", "intermediate", "advanced"].map((level) => {
              const colors = difficultyColors[level];
              const isSelected = selectedDifficulty === level;
              return (
                <button
                  key={level}
                  onClick={() => setSelectedDifficulty(isSelected ? null : level)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? `${colors.bg} ${colors.text} border ${colors.border}`
                      : "bg-white/5 text-purple-300 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Wine Type Filter */}
          <div className="flex gap-2 ml-4">
            {["red", "white", "mixed"].map((type) => {
              const isSelected = selectedWineType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedWineType(isSelected ? null : type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-purple-500/30 text-purple-200 border border-purple-500/40"
                      : "bg-white/5 text-purple-300 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <span>{wineTypeIcons[type]}</span>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Journey Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : journeys.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
              <BookOpen className="w-8 h-8 text-purple-400/50" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No Journeys Available</h3>
            <p className="text-purple-300/70">
              {selectedDifficulty || selectedWineType
                ? "No journeys match your filters. Try adjusting them."
                : "Check back soon for new learning journeys!"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journeys.map((journey, index) => {
              const colors = difficultyColors[journey.difficultyLevel] || difficultyColors.beginner;
              return (
                <motion.div
                  key={journey.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div
                    onClick={() => setLocation(`/journeys/${journey.id}`)}
                    className="cursor-pointer bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                  >
                    {/* Cover Image */}
                    <div className="relative h-40 bg-gradient-to-br from-purple-900/50 to-purple-800/30 overflow-hidden">
                      {journey.coverImageUrl ? (
                        <img
                          src={journey.coverImageUrl}
                          alt={journey.title}
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Wine className="w-16 h-16 text-purple-500/30" />
                        </div>
                      )}

                      {/* Wine Type Badge */}
                      {journey.wineType && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-full text-sm flex items-center gap-1">
                          <span>{wineTypeIcons[journey.wineType] || "🍇"}</span>
                          <span className="text-white/90 capitalize">{journey.wineType}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Difficulty Badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} mb-3`}>
                        <Target className="w-3 h-3" />
                        {journey.difficultyLevel.charAt(0).toUpperCase() + journey.difficultyLevel.slice(1)}
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-200 transition-colors">
                        {journey.title}
                      </h3>

                      {journey.description && (
                        <p className="text-sm text-purple-300/70 mb-4 line-clamp-2">
                          {journey.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-purple-300/60">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          <span>{journey.totalChapters} chapters</span>
                        </div>
                        {journey.estimatedDuration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>{journey.estimatedDuration}</span>
                          </div>
                        )}
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <span className="text-sm text-purple-400">Start Learning</span>
                        <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Coming Soon Section */}
        {journeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">More journeys coming soon</span>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
