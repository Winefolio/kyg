import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MultipleChoiceQuestion } from "@/components/questions/MultipleChoiceQuestion";
import { ScaleQuestion } from "@/components/questions/ScaleQuestion";
import { TextQuestion } from "@/components/questions/TextQuestion";
import { BooleanQuestion } from "@/components/questions/BooleanQuestion";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Wine,
  Droplets,
  Grape,
  Star,
  CheckCircle
} from "lucide-react";
import type { TastingResponses } from "@shared/schema";

// Wine data passed from the entry form
interface WineInfo {
  wineName: string;
  wineRegion?: string;
  wineVintage?: number;
  grapeVariety?: string;
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'orange';
  photoUrl?: string;
}

interface ChapterContext {
  chapterNumber: number;
  title: string;
  tastingPrompts: Array<{ question: string; category?: string }>;
  learningObjectives: string[];
}

// AI-generated question format from Sprint 5
interface AIQuestion {
  id: string;
  category: 'appearance' | 'aroma' | 'taste' | 'structure' | 'overall';
  questionType: 'multiple_choice' | 'scale' | 'text';
  title: string;
  description?: string;
  options?: Array<{ id: string; text: string; description?: string }>;
  allowMultiple?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: [string, string];
  wineContext?: string;
}

interface SoloTastingSessionProps {
  wine: WineInfo;
  onComplete: () => void;
  onCancel: () => void;
  chapterContext?: ChapterContext;
  aiQuestions?: AIQuestion[];
}

// Question definition type
interface TastingQuestion {
  id: string;
  section: 'aroma' | 'taste' | 'overall' | 'chapter';
  type: 'scale' | 'multiple_choice' | 'text' | 'boolean';
  config: {
    title: string;
    description?: string;
    // Scale specific
    scaleMin?: number;
    scaleMax?: number;
    scaleLabels?: [string, string];
    // Multiple choice specific
    options?: Array<{ id: string; text: string; value: string }>;
    allowMultiple?: boolean;
    // Text specific
    placeholder?: string;
    rows?: number;
  };
}

// Preference-focused tasting questions (10 questions total)
// Goal: Learn what the user likes, not test their wine knowledge
const TASTING_QUESTIONS: TastingQuestion[] = [
  // AROMA SECTION (2 questions) - What smells do you notice/enjoy?
  {
    id: 'aroma_notes',
    section: 'aroma',
    type: 'multiple_choice',
    config: {
      title: 'What aromas do you notice?',
      description: 'Swirl the glass and take a sniff. Select all that apply.',
      options: [
        { id: 'citrus', text: 'Citrus & Fresh Fruit', value: 'citrus' },
        { id: 'tropical', text: 'Tropical & Stone Fruit', value: 'tropical' },
        { id: 'berry', text: 'Berries & Dark Fruit', value: 'berry' },
        { id: 'floral', text: 'Floral & Herbal', value: 'floral' },
        { id: 'oak', text: 'Oak, Vanilla & Spice', value: 'oak' },
        { id: 'earth', text: 'Earthy & Mineral', value: 'earth' }
      ],
      allowMultiple: true
    }
  },
  {
    id: 'aroma_appeal',
    section: 'aroma',
    type: 'scale',
    config: {
      title: 'How appealing is the aroma?',
      description: 'Do you like what you smell?',
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: ['Not my style', 'Love it']
    }
  },

  // TASTE SECTION (5 questions) - Core preference sliders
  {
    id: 'taste_sweetness',
    section: 'taste',
    type: 'scale',
    config: {
      title: 'How do you like the sweetness?',
      description: 'Rate where this wine lands for you.',
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: ['Bone Dry', 'Sweet']
    }
  },
  {
    id: 'taste_acidity',
    section: 'taste',
    type: 'scale',
    config: {
      title: 'How do you like the acidity?',
      description: 'That refreshing, mouth-watering quality.',
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: ['Soft', 'Crisp & Zesty']
    }
  },
  {
    id: 'taste_tannins',
    section: 'taste',
    type: 'scale',
    config: {
      title: 'How do you like the tannins?',
      description: 'The drying, grippy sensation (mainly in reds).',
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: ['Silky Smooth', 'Bold & Grippy']
    }
  },
  {
    id: 'taste_body',
    section: 'taste',
    type: 'scale',
    config: {
      title: 'How do you like the body?',
      description: 'The weight and richness in your mouth.',
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: ['Light & Delicate', 'Full & Rich']
    }
  },
  {
    id: 'taste_flavors',
    section: 'taste',
    type: 'multiple_choice',
    config: {
      title: 'What flavors stand out?',
      description: 'Select all that you taste.',
      options: [
        { id: 'fruit', text: 'Fruity', value: 'fruit' },
        { id: 'spice', text: 'Spicy', value: 'spice' },
        { id: 'oak', text: 'Oaky/Toasty', value: 'oak' },
        { id: 'mineral', text: 'Mineral/Chalky', value: 'mineral' },
        { id: 'herbal', text: 'Herbal/Green', value: 'herbal' },
        { id: 'earthy', text: 'Earthy', value: 'earthy' }
      ],
      allowMultiple: true
    }
  },

  // OVERALL SECTION (3 questions) - Summary and preference
  {
    id: 'overall_rating',
    section: 'overall',
    type: 'scale',
    config: {
      title: 'How would you rate this wine?',
      description: 'Your overall impression.',
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: ['Not for me', 'Excellent']
    }
  },
  {
    id: 'overall_buy_again',
    section: 'overall',
    type: 'boolean',
    config: {
      title: 'Would you buy this wine again?',
      description: 'Would you pick this up at the store?'
    }
  },
  {
    id: 'overall_notes',
    section: 'overall',
    type: 'text',
    config: {
      title: 'Any final thoughts?',
      description: 'Optional: jot down what you liked or didn\'t like.',
      placeholder: 'e.g., "Great with the steak!", "Too tannic for me", "Perfect summer wine"',
      rows: 3
    }
  }
];

// Section info for headers (simplified - only sections we use)
const SECTIONS: Record<string, { name: string; icon: any; color: string }> = {
  aroma: { name: 'Aroma', icon: Droplets, color: 'from-purple-500 to-pink-500' },
  taste: { name: 'Taste', icon: Grape, color: 'from-red-500 to-orange-500' },
  overall: { name: 'Overall', icon: Star, color: 'from-emerald-500 to-teal-500' },
  chapter: { name: 'Chapter Focus', icon: Wine, color: 'from-amber-500 to-yellow-500' }
};

// Convert chapter prompts to TastingQuestion format
function convertChapterPrompts(prompts: Array<{ question: string; category?: string }>): TastingQuestion[] {
  return prompts.map((prompt, index) => ({
    id: `chapter_prompt_${index}`,
    section: 'chapter' as const,
    type: 'text' as const,
    config: {
      title: prompt.question,
      description: 'Take your time to reflect on this.',
      placeholder: 'Share your observations...',
      rows: 2
    }
  }));
}

// Convert AI-generated questions to TastingQuestion format
function convertAIQuestions(questions: AIQuestion[]): TastingQuestion[] {
  // Map AI category to section
  const categoryToSection: Record<string, 'aroma' | 'taste' | 'overall'> = {
    'appearance': 'aroma', // Group appearance with aroma for display
    'aroma': 'aroma',
    'taste': 'taste',
    'structure': 'taste',
    'overall': 'overall'
  };

  return questions.map((q) => ({
    id: q.id,
    section: categoryToSection[q.category] || 'taste',
    type: q.questionType === 'multiple_choice' ? 'multiple_choice' :
          q.questionType === 'scale' ? 'scale' : 'text',
    config: {
      title: q.title,
      description: q.description || q.wineContext,
      // Scale config
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleLabels: q.scaleLabels,
      // Multiple choice config
      options: q.options?.map(opt => ({
        id: opt.id,
        text: opt.text,
        value: opt.id
      })),
      allowMultiple: q.allowMultiple,
      // Text config
      placeholder: q.questionType === 'text' ? 'Share your observations...' : undefined,
      rows: q.questionType === 'text' ? 3 : undefined
    }
  }));
}

export default function SoloTastingSession({ wine, onComplete, onCancel, chapterContext, aiQuestions }: SoloTastingSessionProps) {
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Build the full question list: AI questions (if available) or standard questions + chapter prompts
  const allQuestions = useMemo(() => {
    // If we have AI-generated questions, use them instead of defaults
    if (aiQuestions && aiQuestions.length > 0) {
      return convertAIQuestions(aiQuestions);
    }

    // Fallback to standard questions + chapter prompts
    if (!chapterContext?.tastingPrompts?.length) {
      return TASTING_QUESTIONS;
    }

    // Insert chapter prompts after the taste section (before overall)
    const chapterQuestions = convertChapterPrompts(chapterContext.tastingPrompts);
    const tasteEndIndex = TASTING_QUESTIONS.findIndex(q => q.section === 'overall');

    return [
      ...TASTING_QUESTIONS.slice(0, tasteEndIndex),
      ...chapterQuestions,
      ...TASTING_QUESTIONS.slice(tasteEndIndex)
    ];
  }, [chapterContext, aiQuestions]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;
  const sectionInfo = currentQuestion ? SECTIONS[currentQuestion.section] : null;
  const isChapterQuestion = currentQuestion?.section === 'chapter';

  // Group answers by section for saving
  const formatResponsesForSave = () => {
    const responses: TastingResponses & { chapterPrompts?: Record<string, string> } = {
      visual: {},
      aroma: {},
      taste: {},
      structure: {},
      overall: {}
    };

    // Collect chapter prompt answers separately
    const chapterAnswers: Record<string, string> = {};

    allQuestions.forEach(q => {
      const answer = answers[q.id];
      if (answer !== undefined) {
        if (q.section === 'chapter') {
          // Store chapter prompt answers with the question text as key
          chapterAnswers[q.config.title] = answer;
        } else {
          const section = responses[q.section as keyof TastingResponses];
          if (section) {
            // Map question ID to response field
            const fieldName = q.id.split('_').slice(1).join('_') || q.id;
            (section as any)[fieldName] = answer;
          }
        }
      }
    });

    // Add chapter answers if any
    if (Object.keys(chapterAnswers).length > 0) {
      responses.chapterPrompts = chapterAnswers;
    }

    return responses;
  };

  // Save tasting mutation
  const saveTastingMutation = useMutation({
    mutationFn: async () => {
      const responses = formatResponsesForSave();
      const payload = {
        wineName: wine.wineName,
        wineRegion: wine.wineRegion,
        wineVintage: wine.wineVintage,
        grapeVariety: wine.grapeVariety,
        wineType: wine.wineType,
        photoUrl: wine.photoUrl,
        responses
      };

      const response = await apiRequest('POST', '/api/solo/tastings', payload);
      return response.json();
    },
    onSuccess: () => {
      setIsComplete(true);
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('Failed to save tasting:', error);
      setIsSaving(false);
      // Still mark as complete so user isn't stuck
      setIsComplete(true);
    }
  });

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question - save and complete
      setIsSaving(true);
      saveTastingMutation.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const { id, type, config } = currentQuestion;

    switch (type) {
      case 'scale':
        return (
          <ScaleQuestion
            question={{
              title: config.title,
              description: config.description || '',
              category: sectionInfo?.name || 'Question',
              scale_min: config.scaleMin || 1,
              scale_max: config.scaleMax || 5,
              scale_labels: config.scaleLabels || ['Low', 'High']
            }}
            value={answers[id] ?? Math.ceil((config.scaleMax || 5) / 2)}
            onChange={(value) => handleAnswerChange(id, value)}
          />
        );

      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={{
              title: config.title,
              description: config.description || '',
              category: sectionInfo?.name || 'Question',
              options: config.options || [],
              allow_multiple: config.allowMultiple || false,
              allow_notes: false
            }}
            value={answers[id] || { selected: [], notes: '' }}
            onChange={(value) => handleAnswerChange(id, value)}
            disableNext={false}
            setDisableNext={() => {}}
          />
        );

      case 'text':
        return (
          <TextQuestion
            question={{
              title: config.title,
              description: config.description,
              placeholder: config.placeholder,
              rows: config.rows
            }}
            value={answers[id] || ''}
            onChange={(value) => handleAnswerChange(id, value)}
          />
        );

      case 'boolean':
        return (
          <BooleanQuestion
            question={{
              title: config.title,
              description: config.description,
              trueLabel: 'Yes',
              falseLabel: 'No'
            }}
            value={answers[id] ?? null}
            onChange={(value) => handleAnswerChange(id, value)}
            setDisableNext={() => {}}
          />
        );

      default:
        return null;
    }
  };

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Tasting Complete!</h2>
          <p className="text-white/70 mb-6">
            Your tasting notes for <span className="text-white font-medium">{wine.wineName}</span> have been saved.
          </p>
          <Button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl"
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white flex items-center gap-2 text-sm min-h-[44px] px-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Exit
            </button>
            <div className="flex items-center gap-2">
              <Wine className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium truncate max-w-[200px]">
                {wine.wineName}
              </span>
            </div>
            <span className="text-white/60 text-sm">
              {currentQuestionIndex + 1}/{allQuestions.length}
            </span>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-2" />

          {/* Section indicator */}
          {sectionInfo && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${sectionInfo.color} flex items-center justify-center`}>
                <sectionInfo.icon className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">{sectionInfo.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Question Content */}
      <main className="container mx-auto px-4 py-6 pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderQuestion()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="container mx-auto flex gap-3 max-w-lg">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex-1 border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            {isSaving ? (
              'Saving...'
            ) : currentQuestionIndex === allQuestions.length - 1 ? (
              <>
                Complete
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
