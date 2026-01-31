import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useHomeUser } from "@/contexts/HomeUserContext";
import {
  Wine,
  BookOpen,
  Clock,
  Target,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Filter,
  Play,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Journey, Chapter, UserJourney } from "@shared/schema";

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  intermediate: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30" },
  advanced: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
};

const wineTypeIcons: Record<string, string> = {
  red: "🍷",
  white: "🥂",
  rosé: "🌸",
  sparkling: "✨",
  mixed: "🍇",
};

interface JourneyWithProgress {
  userJourney: UserJourney;
  journey: Journey;
  chapters: Chapter[];
  progress: number;
}

interface PublishedJourney {
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

export default function HomeJourneys() {
  const [, setLocation] = useLocation();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedWineType, setSelectedWineType] = useState<string | null>(null);
  const user = useHomeUser();

  // Get user's active journeys
  const { data: activeJourneysData } = useQuery<{ journeys: JourneyWithProgress[] }>({
    queryKey: ["/api/journeys/user", user.email],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/user?email=${encodeURIComponent(user.email)}`);
      if (!response.ok) throw new Error("Failed to fetch user journeys");
      return response.json();
    },
  });

  // Get all published journeys
  const { data: journeysData, isLoading } = useQuery<{ journeys: PublishedJourney[] }>({
    queryKey: ["journeys", selectedDifficulty, selectedWineType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedDifficulty) params.append("difficulty", selectedDifficulty);
      if (selectedWineType) params.append("wineType", selectedWineType);
      const response = await fetch(`/api/journeys?${params}`);
      if (!response.ok) throw new Error("Failed to fetch journeys");
      return response.json();
    },
  });

  const activeJourneys = activeJourneysData?.journeys || [];
  const inProgressJourney = activeJourneys.find(
    (j) => j.progress > 0 && j.progress < 100
  );
  const journeys = journeysData?.journeys || [];

  // Filter out journeys the user has already started from browse list
  const startedJourneyIds = new Set(activeJourneys.map((j) => j.journey.id));
  const availableJourneys = journeys.filter((j) => !startedJourneyIds.has(j.id));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-semibold text-white">Learning Journeys</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-purple-200/80 max-w-xl mx-auto">
            Follow structured learning paths to develop your palate and become a more
            confident wine enthusiast.
          </p>
        </motion.div>

        {/* Continue Journey Card */}
        {inProgressJourney && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => setLocation(`/journeys/${inProgressJourney.journey.id}`)}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-center gap-2 text-purple-300 text-sm mb-2">
              <Play className="w-4 h-4" />
              <span>Continue Learning</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              {inProgressJourney.journey.title}
            </h3>

            {/* Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Progress</span>
                <span className="text-purple-300">{Math.round(inProgressJourney.progress)}%</span>
              </div>
              <Progress value={inProgressJourney.progress} className="h-2 bg-white/10" />
            </div>

            {/* Current Chapter */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                Chapter {inProgressJourney.userJourney.currentChapter} of{" "}
                {inProgressJourney.chapters.length}
              </div>
              <div className="flex items-center gap-2 text-purple-400">
                <span className="text-sm font-medium">Continue</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Started Journeys */}
        {activeJourneys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Your Journeys</h2>
            <div className="space-y-3">
              {activeJourneys.map((jp) => (
                <div
                  key={jp.userJourney.id}
                  onClick={() => setLocation(`/journeys/${jp.journey.id}`)}
                  className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium truncate">{jp.journey.title}</h3>
                        {jp.progress === 100 && (
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                        <span>
                          {Math.round(jp.progress)}% complete
                        </span>
                        <span>•</span>
                        <span>{jp.chapters.length} chapters</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 items-center"
        >
          <div className="flex items-center gap-2 text-purple-300 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter:</span>
          </div>

          {/* Difficulty Filter */}
          {["beginner", "intermediate", "advanced"].map((level) => {
            const colors = difficultyColors[level];
            const isSelected = selectedDifficulty === level;
            return (
              <button
                key={level}
                onClick={() => setSelectedDifficulty(isSelected ? null : level)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : "bg-white/5 text-purple-300 hover:bg-white/10 border border-transparent"
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            );
          })}

          {/* Wine Type Filter */}
          {["red", "white", "mixed"].map((type) => {
            const isSelected = selectedWineType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedWineType(isSelected ? null : type)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
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
        </motion.div>

        {/* Browse Journeys */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-4">Browse Journeys</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : availableJourneys.length === 0 ? (
            <EmptyJourneysCard hasFilters={!!selectedDifficulty || !!selectedWineType} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJourneys.map((journey, index) => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  index={index}
                  onClick={() => setLocation(`/journeys/${journey.id}`)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Coming Soon */}
        {availableJourneys.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center pt-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">More journeys coming soon</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Journey Card Component
function JourneyCard({
  journey,
  index,
  onClick,
}: {
  journey: PublishedJourney;
  index: number;
  onClick: () => void;
}) {
  const colors = difficultyColors[journey.difficultyLevel] || difficultyColors.beginner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="cursor-pointer bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all group"
    >
      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-br from-purple-900/50 to-purple-800/30 overflow-hidden">
        {journey.coverImageUrl ? (
          <img
            src={journey.coverImageUrl}
            alt={journey.title}
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Wine className="w-12 h-12 text-purple-500/30" />
          </div>
        )}

        {/* Wine Type Badge */}
        {journey.wineType && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-sm rounded-full text-xs flex items-center gap-1">
            <span>{wineTypeIcons[journey.wineType] || "🍇"}</span>
            <span className="text-white/90 capitalize">{journey.wineType}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Difficulty Badge */}
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} mb-2`}
        >
          <Target className="w-3 h-3" />
          {journey.difficultyLevel.charAt(0).toUpperCase() + journey.difficultyLevel.slice(1)}
        </div>

        <h3 className="text-base font-semibold text-white mb-1 group-hover:text-purple-200 transition-colors line-clamp-1">
          {journey.title}
        </h3>

        {journey.description && (
          <p className="text-xs text-purple-300/70 mb-3 line-clamp-2">{journey.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-purple-300/60">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{journey.totalChapters} chapters</span>
          </div>
          {journey.estimatedDuration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{journey.estimatedDuration}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Empty State
function EmptyJourneysCard({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
      <BookOpen className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">No Journeys Available</h3>
      <p className="text-purple-300/70 text-sm">
        {hasFilters
          ? "No journeys match your filters. Try adjusting them."
          : "Check back soon for new learning journeys!"}
      </p>
    </div>
  );
}
