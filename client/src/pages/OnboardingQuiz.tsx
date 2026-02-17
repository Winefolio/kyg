import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useHaptics } from "@/hooks/useHaptics";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import type { User } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

type QuizStep = "knowledge" | "vibe" | "food";

interface QuizAnswers {
  knowledgeLevel: string | null;
  wineVibe: string | null;
  foodPreferences: string[];
}

interface OptionCard {
  value: string;
  emoji: string;
  title: string;
  description: string;
}

// ============================================================================
// QUIZ DATA
// ============================================================================

const KNOWLEDGE_OPTIONS: OptionCard[] = [
  {
    value: "beginner",
    emoji: "\u{1F331}",
    title: "I'm brand new",
    description: "Never really explored wine",
  },
  {
    value: "casual",
    emoji: "\u{1F377}",
    title: "I know what I like",
    description: "I have favorites but couldn't tell you why",
  },
  {
    value: "enthusiast",
    emoji: "\u{1F4DA}",
    title: "Getting into it",
    description: "I read labels and ask questions at wine shops",
  },
  {
    value: "nerd",
    emoji: "\u{1F9E0}",
    title: "Full wine nerd",
    description: "I could talk terroir all day",
  },
];

const VIBE_OPTIONS: OptionCard[] = [
  {
    value: "bold",
    emoji: "\u{1F525}",
    title: "Bold & Intense",
    description: "Big reds, full body, wow factor",
  },
  {
    value: "light",
    emoji: "\u{1F338}",
    title: "Light & Fresh",
    description: "Crisp whites, delicate ros\u00E9s, easy-drinking",
  },
  {
    value: "sweet",
    emoji: "\u{1F36F}",
    title: "Sweet & Fruity",
    description: "Moscato, Riesling, fruit-forward wines",
  },
  {
    value: "adventurous",
    emoji: "\u{1F3B2}",
    title: "Surprise me",
    description: "I'll try anything once",
  },
];

const FOOD_OPTIONS: OptionCard[] = [
  { value: "italian", emoji: "\u{1F35D}", title: "Italian", description: "" },
  { value: "sushi", emoji: "\u{1F363}", title: "Sushi", description: "" },
  { value: "bbq", emoji: "\u{1F525}", title: "BBQ", description: "" },
  { value: "cheese", emoji: "\u{1F9C0}", title: "Cheese", description: "" },
  { value: "spicy", emoji: "\u{1F336}\uFE0F", title: "Spicy", description: "" },
  { value: "seafood", emoji: "\u{1F990}", title: "Seafood", description: "" },
  { value: "steak", emoji: "\u{1F969}", title: "Steak", description: "" },
  { value: "veggie", emoji: "\u{1F957}", title: "Veggie", description: "" },
];

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.3 },
  }),
};

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function StepHeader({
  step,
  totalSteps,
  onBack,
}: {
  step: number;
  totalSteps: number;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1 mb-8">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>
      ) : (
        <div />
      )}
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < step
                ? "w-6 bg-purple-500"
                : i === step
                  ? "w-6 bg-purple-400"
                  : "w-3 bg-white/20"
            }`}
          />
        ))}
      </div>
      <div className="text-white/40 text-sm">
        {step + 1} of {totalSteps}
      </div>
    </div>
  );
}

function SingleSelectStep({
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: OptionCard[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  const { triggerHaptic } = useHaptics();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-white/50 mb-8">{subtitle}</p>
      <div className="space-y-3">
        {options.map((option, i) => (
          <motion.button
            key={option.value}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={() => {
              triggerHaptic("selection");
              onSelect(option.value);
            }}
            className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 ${
              selected === option.value
                ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-900/20"
                : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{option.emoji}</span>
              <div>
                <span className="text-white font-medium block">
                  {option.title}
                </span>
                <span className="text-white/40 text-sm">
                  {option.description}
                </span>
              </div>
              {selected === option.value && (
                <Check className="w-5 h-5 text-purple-400 ml-auto" />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function MultiSelectStep({
  title,
  subtitle,
  options,
  selected,
  onToggle,
}: {
  title: string;
  subtitle: string;
  options: OptionCard[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const { triggerHaptic } = useHaptics();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-white/50 mb-8">{subtitle}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, i) => {
          const isSelected = selected.includes(option.value);
          return (
            <motion.button
              key={option.value}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              onClick={() => {
                triggerHaptic("selection");
                onToggle(option.value);
              }}
              className={`text-center px-4 py-5 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-900/20"
                  : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
              }`}
            >
              <span className="text-3xl block mb-2">{option.emoji}</span>
              <span className="text-white font-medium text-sm">
                {option.title}
              </span>
              {isSelected && (
                <Check className="w-4 h-4 text-purple-400 mx-auto mt-2" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OnboardingQuiz() {
  const [step, setStep] = useState<QuizStep>("knowledge");
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>({
    knowledgeLevel: null,
    wineVibe: null,
    foodPreferences: [],
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Auth check — redirect if already completed onboarding
  const { data: authData, isLoading: authLoading } = useQuery<{
    user: User & { onboardingCompleted: boolean };
  }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (authData?.user?.onboardingCompleted) {
      setLocation("/home");
    }
  }, [authData, setLocation]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authData?.user) {
      setLocation("/home");
    }
  }, [authLoading, authData, setLocation]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: QuizAnswers | { skip: true }) => {
      const res = await apiRequest("POST", "/api/user/onboarding", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/home?pierre=welcome");
    },
    onError: () => {
      setSaveError("Something went wrong. Please try again.");
    },
  });

  // Step navigation
  const steps: QuizStep[] = ["knowledge", "vibe", "food"];
  const currentStepIndex = steps.indexOf(step);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setDirection(1);
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setDirection(-1);
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = () => {
    setSaveError(null);
    saveMutation.mutate(answers);
  };

  const handleSkip = () => {
    setSaveError(null);
    saveMutation.mutate({ skip: true });
  };

  const toggleFood = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      foodPreferences: prev.foodPreferences.includes(value)
        ? prev.foodPreferences.filter((f) => f !== value)
        : [...prev.foodPreferences, value],
    }));
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex flex-col">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-8">
        <StepHeader
          step={currentStepIndex}
          totalSteps={steps.length}
          onBack={currentStepIndex > 0 ? goBack : undefined}
        />

        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === "knowledge" && (
              <motion.div
                key="knowledge"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <SingleSelectStep
                  title="Let's get to know you"
                  subtitle="How much do you know about wine?"
                  options={KNOWLEDGE_OPTIONS}
                  selected={answers.knowledgeLevel}
                  onSelect={(value) => {
                    setAnswers((prev) => ({
                      ...prev,
                      knowledgeLevel: value,
                    }));
                    // Auto-advance after selection with a small delay
                    setTimeout(() => {
                      setDirection(1);
                      setStep("vibe");
                    }, 300);
                  }}
                />
              </motion.div>
            )}

            {step === "vibe" && (
              <motion.div
                key="vibe"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <SingleSelectStep
                  title="What's your style?"
                  subtitle="Pick what sounds most like you"
                  options={VIBE_OPTIONS}
                  selected={answers.wineVibe}
                  onSelect={(value) => {
                    setAnswers((prev) => ({ ...prev, wineVibe: value }));
                    // Auto-advance after selection
                    setTimeout(() => {
                      setDirection(1);
                      setStep("food");
                    }, 300);
                  }}
                />
              </motion.div>
            )}

            {step === "food" && (
              <motion.div
                key="food"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <MultiSelectStep
                  title="What do you love to eat?"
                  subtitle="Pick all that apply — helps us pair wines for you"
                  options={FOOD_OPTIONS}
                  selected={answers.foodPreferences}
                  onToggle={toggleFood}
                />

                {/* Complete button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleComplete}
                  disabled={
                    saveMutation.isPending ||
                    answers.foodPreferences.length === 0
                  }
                  className="w-full mt-8 py-4 rounded-2xl font-semibold text-white transition-all duration-200 disabled:opacity-40 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:scale-[0.98]"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "Let's go!"
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error message */}
        {saveError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mt-4"
          >
            {saveError}
          </motion.p>
        )}

        {/* Skip link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSkip}
          disabled={saveMutation.isPending}
          className="text-white/30 hover:text-white/50 text-sm py-4 transition-colors"
        >
          Skip for now
        </motion.button>
      </div>
    </div>
  );
}
