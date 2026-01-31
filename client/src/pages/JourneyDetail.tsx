import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wine,
  BookOpen,
  Clock,
  Target,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Check,
  Lock,
  Play,
  Camera,
  MapPin,
  GraduationCap,
  Star,
  DollarSign,
  MessageCircle,
  ShoppingBag,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { WineOptionsList } from "@/components/WineOptionCard";
import type { WineOption } from "@shared/schema";

interface Chapter {
  id: number;
  journeyId: number;
  chapterNumber: number;
  title: string;
  description: string | null;
  wineRequirements: {
    wineType?: string;
    region?: string;
    grapeVariety?: string;
    anyWine?: boolean;
  } | null;
  learningObjectives: string[] | null;
  tastingPrompts: Array<{ question: string; category?: string }> | null;
  completionCriteria: {
    requirePhoto?: boolean;
    requireAllPrompts?: boolean;
    minRating?: number;
  } | null;
  // Shopping guide fields
  shoppingTips: string | null;
  priceRange: { min: number; max: number; currency?: string } | null;
  alternatives: Array<{ name: string; criteria?: { wineType?: string; region?: string; grapeVariety?: string } }> | null;
  askFor: string | null;
  // Wine options for flexible pricing (Sprint 5)
  wineOptions: WineOption[] | null;
}

interface Journey {
  id: number;
  title: string;
  description: string | null;
  difficultyLevel: string;
  estimatedDuration: string | null;
  wineType: string | null;
  coverImageUrl: string | null;
  totalChapters: number;
}

interface UserProgress {
  id: number;
  currentChapter: number;
  completedChapters: Array<{
    chapterId: number;
    completedAt: string;
    tastingId: number;
  }>;
  startedAt: string;
  completedAt: string | null;
}

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
  intermediate: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30" },
  advanced: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" }
};

export default function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showShoppingList, setShowShoppingList] = useState(false);

  const journeyId = parseInt(id || "0");

  // Fetch journey with chapters
  const { data: journeyData, isLoading } = useQuery({
    queryKey: ["journey", journeyId],
    queryFn: async () => {
      const response = await fetch(`/api/journeys/${journeyId}`);
      if (!response.ok) throw new Error("Failed to fetch journey");
      return response.json();
    },
    enabled: journeyId > 0
  });

  // Fetch user progress
  const { data: progressData } = useQuery({
    queryKey: ["journey-progress", journeyId, user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const response = await fetch(`/api/journeys/${journeyId}/progress/${encodeURIComponent(user.email)}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: journeyId > 0 && !!user?.email
  });

  // Start journey mutation
  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("Must be logged in");
      const response = await fetch(`/api/journeys/${journeyId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      if (!response.ok) throw new Error("Failed to start journey");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey-progress", journeyId] });
    }
  });

  const journey: Journey | null = journeyData?.journey?.journey || null;
  const chapters: Chapter[] = journeyData?.journey?.chapters || [];
  const progress: UserProgress | null = progressData?.progress || null;

  const getChapterStatus = (chapter: Chapter): "completed" | "current" | "locked" => {
    if (!progress) return chapter.chapterNumber === 1 ? "current" : "locked";

    const isCompleted = progress.completedChapters.some(c => c.chapterId === chapter.id);
    if (isCompleted) return "completed";

    if (chapter.chapterNumber === progress.currentChapter) return "current";

    return "locked";
  };

  const handleStartChapter = (chapter: Chapter) => {
    // Navigate to solo tasting with journey context
    setLocation(`/solo/new?journeyId=${journeyId}&chapterId=${chapter.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0015] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-white mb-2">Journey Not Found</h2>
          <Button variant="ghost" onClick={() => setLocation("/journeys")}>
            Back to Journeys
          </Button>
        </div>
      </div>
    );
  }

  const colors = difficultyColors[journey.difficultyLevel] || difficultyColors.beginner;
  const completedCount = progress?.completedChapters.length || 0;
  const progressPercentage = journey.totalChapters > 0 ? (completedCount / journey.totalChapters) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0015]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation("/journeys")}
              className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>All Journeys</span>
            </button>
            <h1 className="text-lg font-medium text-white truncate max-w-[50%]">{journey.title}</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Journey Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Cover Image */}
          <div className="relative h-48 rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-purple-900/50 to-purple-800/30">
            {journey.coverImageUrl ? (
              <img
                src={journey.coverImageUrl}
                alt={journey.title}
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <GraduationCap className="w-20 h-20 text-purple-500/30" />
              </div>
            )}

            {/* Difficulty Badge */}
            <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border} backdrop-blur-sm`}>
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                {journey.difficultyLevel.charAt(0).toUpperCase() + journey.difficultyLevel.slice(1)}
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">{journey.title}</h2>

          {journey.description && (
            <p className="text-purple-200/80 mb-4">{journey.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-purple-300/70 mb-6">
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

          {/* Progress Bar (if enrolled) */}
          {progress && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-300">Your Progress</span>
                <span className="text-sm font-medium text-white">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>
              <p className="text-xs text-purple-300/60 mt-2">
                {completedCount} of {journey.totalChapters} chapters completed
              </p>
            </div>
          )}

          {/* Start Button (if not enrolled) */}
          {!progress && user && (
            <Button
              onClick={() => startJourneyMutation.mutate()}
              disabled={startJourneyMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
            >
              {startJourneyMutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start This Journey
                </>
              )}
            </Button>
          )}

          {/* Login prompt */}
          {!user && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
              <p className="text-purple-200/80 mb-3">Sign in to track your progress</p>
              <Button
                onClick={() => setLocation(`/login?redirect=${encodeURIComponent(`/journeys/${journeyId}`)}`)}
                variant="outline"
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Sign In
              </Button>
            </div>
          )}
        </motion.div>

        {/* Shopping List - Collapsible view of all wines needed */}
        {chapters.some(c => c.shoppingTips || c.askFor || c.priceRange) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <button
              onClick={() => setShowShoppingList(!showShoppingList)}
              className="w-full flex items-center justify-between bg-gradient-to-r from-purple-900/40 to-pink-900/30 rounded-xl p-4 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <List className="w-5 h-5 text-purple-300" />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-medium">Shopping List</h3>
                  <p className="text-xs text-purple-300/70">All wines you'll need for this journey</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-purple-300 transition-transform ${showShoppingList ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showShoppingList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-black/20 rounded-b-xl border border-t-0 border-purple-500/20 divide-y divide-purple-500/10">
                    {chapters.filter(c => !c.wineRequirements?.anyWine).map((chapter) => (
                      <div key={chapter.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-300 font-medium">
                            {chapter.chapterNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white mb-1">{chapter.title}</p>

                            {/* Wine requirements */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {chapter.wineRequirements?.wineType && (
                                <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">
                                  {chapter.wineRequirements.wineType}
                                </span>
                              )}
                              {chapter.wineRequirements?.region && (
                                <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">
                                  {chapter.wineRequirements.region}
                                </span>
                              )}
                              {chapter.wineRequirements?.grapeVariety && (
                                <span className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">
                                  {chapter.wineRequirements.grapeVariety}
                                </span>
                              )}
                            </div>

                            {/* What to ask */}
                            {chapter.askFor && (
                              <p className="text-xs text-purple-200/70 italic mb-1">
                                "{chapter.askFor}"
                              </p>
                            )}

                            {/* Price range */}
                            {chapter.priceRange && (
                              <p className="text-xs text-purple-300/60">
                                ${chapter.priceRange.min} – ${chapter.priceRange.max}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Tip for "any wine" chapters */}
                    {chapters.some(c => c.wineRequirements?.anyWine) && (
                      <div className="p-4 bg-purple-500/5">
                        <p className="text-xs text-purple-300/70">
                          <span className="font-medium">Tip:</span> Some chapters work with any wine you have at home - no purchase needed!
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Chapters List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Chapters</h3>

          {chapters.map((chapter, index) => {
            const status = getChapterStatus(chapter);
            const isCompleted = status === "completed";
            const isCurrent = status === "current";
            const isLocked = status === "locked";

            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-white/5 rounded-xl border overflow-hidden transition-all ${
                  isCompleted
                    ? "border-green-500/30 bg-green-500/5"
                    : isCurrent
                    ? "border-purple-500/40 bg-purple-500/10"
                    : "border-white/10 opacity-60"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Chapter Number / Status Icon */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500/20 text-green-400"
                          : isCurrent
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <span className="font-semibold">{chapter.chapterNumber}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{chapter.title}</h4>

                      {chapter.description && (
                        <p className="text-sm text-purple-300/70 mb-3">{chapter.description}</p>
                      )}

                      {/* Wine Requirements - shown as suggestions */}
                      {chapter.wineRequirements && !chapter.wineRequirements.anyWine && (
                        <div className="mb-3">
                          <p className="text-xs text-purple-400/70 mb-1.5">Find a wine like:</p>
                          <div className="flex flex-wrap gap-2">
                            {chapter.wineRequirements.wineType && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full text-xs text-purple-300">
                                <Wine className="w-3 h-3" />
                                {chapter.wineRequirements.wineType}
                              </span>
                            )}
                            {chapter.wineRequirements.region && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full text-xs text-purple-300">
                                <MapPin className="w-3 h-3" />
                                {chapter.wineRequirements.region}
                              </span>
                            )}
                            {chapter.wineRequirements.grapeVariety && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full text-xs text-purple-300">
                                🍇 {chapter.wineRequirements.grapeVariety}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {chapter.wineRequirements?.anyWine && (
                        <div className="flex items-center gap-1 text-xs text-purple-300/60 mb-3">
                          <Wine className="w-3 h-3" />
                          Use any wine you have
                        </div>
                      )}

                      {/* Wine Options - Multiple price points (Sprint 5) */}
                      {isCurrent && chapter.wineOptions && chapter.wineOptions.length > 0 && (
                        <div className="mb-3">
                          <WineOptionsList options={chapter.wineOptions} />
                        </div>
                      )}

                      {/* Shopping Guide - shown for current chapter (fallback when no wine options) */}
                      {isCurrent && !chapter.wineOptions?.length && (chapter.shoppingTips || chapter.askFor || chapter.priceRange || chapter.alternatives) && (
                        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 rounded-lg p-3 mb-3 border border-purple-500/20">
                          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium mb-2">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            At the wine shop:
                          </div>

                          {/* What to ask */}
                          {chapter.askFor && (
                            <div className="mb-2">
                              <p className="text-xs text-purple-300/70 mb-1 flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                Say this:
                              </p>
                              <p className="text-sm text-white italic bg-black/20 rounded px-2 py-1.5">
                                "{chapter.askFor}"
                              </p>
                            </div>
                          )}

                          {/* Shopping tips */}
                          {chapter.shoppingTips && (
                            <p className="text-xs text-purple-200/80 mb-2">{chapter.shoppingTips}</p>
                          )}

                          {/* Price range */}
                          {chapter.priceRange && (
                            <div className="flex items-center gap-1 text-xs text-purple-300/70 mb-2">
                              <DollarSign className="w-3 h-3" />
                              Budget: ${chapter.priceRange.min} – ${chapter.priceRange.max}
                            </div>
                          )}

                          {/* Alternatives */}
                          {chapter.alternatives && chapter.alternatives.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-purple-500/20">
                              <p className="text-xs text-purple-400/70 mb-1.5">If you can't find it, try:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {chapter.alternatives.map((alt, i) => (
                                  <span key={i} className="text-xs bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">
                                    {alt.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Learning Objectives */}
                      {chapter.learningObjectives && chapter.learningObjectives.length > 0 && isCurrent && (
                        <div className="bg-black/20 rounded-lg p-3 mb-3">
                          <p className="text-xs text-purple-400 font-medium mb-2">You'll learn:</p>
                          <ul className="space-y-1">
                            {chapter.learningObjectives.slice(0, 3).map((obj, i) => (
                              <li key={i} className="text-xs text-purple-200/80 flex items-start gap-2">
                                <Star className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Completion Requirements */}
                      {chapter.completionCriteria?.requirePhoto && isCurrent && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-300/60">
                          <Camera className="w-3 h-3" />
                          Photo required
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    {isCurrent && progress && (
                      <Button
                        onClick={() => handleStartChapter(chapter)}
                        size="sm"
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
