import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCircle,
  AlertCircle,
  RotateCcw
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

// AI-generated question format — 6 core components with three-beat loop
interface AIQuestion {
  id: string;
  category: 'fruit' | 'secondary' | 'tertiary' | 'body' | 'acidity' | 'tannins' | 'overall';
  questionType: 'multiple_choice' | 'scale' | 'text';
  title: string;
  description?: string;
  options?: Array<{ id: string; text: string; description?: string }>;
  allowMultiple?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: [string, string];
  wineContext?: string;
  beatType?: 'notice' | 'rate';
  educationalNote?: string;
  preferenceDirection?: 'more' | 'less';
}

interface SoloTastingSessionProps {
  wine: WineInfo;
  onComplete: (tastingId?: number) => void;
  onCancel: () => void;
  chapterContext?: ChapterContext;
  aiQuestions?: AIQuestion[];
}

// Question definition type - supports both legacy and 6 core components with three-beat loop
interface TastingQuestion {
  id: string;
  section: 'visual' | 'fruit' | 'secondary' | 'tertiary' | 'body' | 'acidity' | 'tannins' | 'sweetness' | 'overall' | 'aroma' | 'taste' | 'structure' | 'chapter';
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
  // Three-beat loop metadata
  beatType?: 'notice' | 'rate';
  educationalNote?: string;
  preferenceDirection?: 'more' | 'less';
}

// Three-beat tasting questions — notice+rate pairs per trait
// Used as fallback when AI questions aren't available
function getTastingQuestions(wineType?: string): TastingQuestion[] {
  const type = wineType?.toLowerCase() || 'red'; // default to red if unknown
  const isRed = type === 'red';
  const isWhite = type === 'white';
  const isRosé = type === 'rosé';
  const isSparkling = type === 'sparkling';
  const hasTannins = isRed || type === 'orange';

  // Wine-type-specific fruit options
  const fruitOptions = isRed ? [
    { id: 'red-berries', text: 'Red berries (cherry, raspberry, strawberry)', value: 'red-berries' },
    { id: 'dark-berries', text: 'Dark berries (blackberry, blueberry, plum)', value: 'dark-berries' },
    { id: 'dried-fruit', text: 'Dried fruit (fig, prune, raisin)', value: 'dried-fruit' },
    { id: 'jammy', text: 'Jammy, cooked fruit', value: 'jammy' }
  ] : isWhite ? [
    { id: 'citrus', text: 'Citrus (lemon, lime, grapefruit)', value: 'citrus' },
    { id: 'stone-fruit', text: 'Stone fruit (peach, apricot, nectarine)', value: 'stone-fruit' },
    { id: 'tropical', text: 'Tropical (pineapple, mango, passion fruit)', value: 'tropical' },
    { id: 'green-fruit', text: 'Green fruit (apple, pear)', value: 'green-fruit' }
  ] : isRosé ? [
    { id: 'red-berries', text: 'Red berries (strawberry, raspberry)', value: 'red-berries' },
    { id: 'stone-fruit', text: 'Stone fruit (peach, nectarine)', value: 'stone-fruit' },
    { id: 'citrus', text: 'Citrus (grapefruit, lemon)', value: 'citrus' },
    { id: 'watermelon', text: 'Watermelon or melon', value: 'watermelon' }
  ] : isSparkling ? [
    { id: 'citrus', text: 'Citrus (lemon, lime)', value: 'citrus' },
    { id: 'green-fruit', text: 'Green apple, pear', value: 'green-fruit' },
    { id: 'stone-fruit', text: 'White peach, nectarine', value: 'stone-fruit' },
    { id: 'brioche', text: 'Brioche, toast, biscuit', value: 'brioche' }
  ] : [
    // dessert, fortified, orange, or unknown
    { id: 'dried-fruit', text: 'Dried fruit (raisin, fig, date)', value: 'dried-fruit' },
    { id: 'citrus', text: 'Citrus peel, marmalade', value: 'citrus' },
    { id: 'honey', text: 'Honey, caramel', value: 'honey' },
    { id: 'tropical', text: 'Tropical or candied fruit', value: 'tropical' }
  ];

  // Wine-type-specific secondary aroma options
  const secondaryOptions = isRed ? [
    { id: 'herbal', text: 'Herbal (mint, eucalyptus, bell pepper)', value: 'herbal' },
    { id: 'earthy', text: 'Earthy (mushroom, soil, leather)', value: 'earthy' },
    { id: 'oaky', text: 'Oaky (vanilla, toast, smoke)', value: 'oaky' },
    { id: 'spice', text: 'Spice (pepper, clove, cinnamon)', value: 'spice' },
    { id: 'none', text: 'Not really noticing any', value: 'none' }
  ] : isWhite ? [
    { id: 'floral', text: 'Floral (honeysuckle, jasmine, blossom)', value: 'floral' },
    { id: 'herbal', text: 'Herbal (grass, herbs, green notes)', value: 'herbal' },
    { id: 'mineral', text: 'Mineral (wet stone, chalk, flint)', value: 'mineral' },
    { id: 'oaky', text: 'Oaky (vanilla, butter, toast)', value: 'oaky' },
    { id: 'none', text: 'Not really noticing any', value: 'none' }
  ] : [
    { id: 'floral', text: 'Floral (rose, violet, honeysuckle)', value: 'floral' },
    { id: 'herbal', text: 'Herbal (herbs, grass, mint)', value: 'herbal' },
    { id: 'earthy', text: 'Earthy (mushroom, soil, forest floor)', value: 'earthy' },
    { id: 'oaky', text: 'Oaky (vanilla, toast, baking spices)', value: 'oaky' },
    { id: 'none', text: 'Not really noticing any', value: 'none' }
  ];

  const fruitNote = isRed
    ? 'Red wines often show berry and cherry notes, while dark-skinned grapes bring plum and blackberry.'
    : isWhite
    ? 'White wines typically show citrus, stone fruit, or tropical notes depending on the grape and climate.'
    : 'Wine gets its fruit flavors from the grape itself and fermentation.';

  const questions: TastingQuestion[] = [
    // --- FRUIT (notice + rate) ---
    {
      id: 'fruit-notice',
      section: 'fruit',
      type: 'multiple_choice',
      beatType: 'notice',
      educationalNote: fruitNote,
      config: {
        title: 'What fruit flavors jump out at you?',
        description: 'Swirl the glass gently and take a sip. Don\'t overthink it — what\'s the first thing that comes to mind?',
        options: fruitOptions,
        allowMultiple: true
      }
    },
    {
      id: 'fruit-rate',
      section: 'fruit',
      type: 'scale',
      beatType: 'rate',
      preferenceDirection: 'more',
      config: {
        title: 'How much do you enjoy these fruit flavors?',
        description: 'Would you want more or less fruit intensity in your next wine?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Not my style', 'Love them']
      }
    },
    // --- BODY (notice + rate) ---
    {
      id: 'body-notice',
      section: 'body',
      type: 'scale',
      beatType: 'notice',
      educationalNote: 'This weight is called "body." It comes from alcohol, sugar, and extract in the wine. Full-bodied wines feel richer and coat your mouth more.',
      config: {
        title: 'How heavy does the wine feel in your mouth?',
        description: 'Think of it like milk: skim milk is light-bodied, whole milk is medium, cream is full-bodied.',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Light and delicate', 'Full and rich']
      }
    },
    {
      id: 'body-rate',
      section: 'body',
      type: 'scale',
      beatType: 'rate',
      preferenceDirection: 'more',
      config: {
        title: 'Do you enjoy this body style?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Prefer lighter wines', 'Prefer fuller wines']
      }
    },
    // --- ACIDITY (notice + rate) ---
    {
      id: 'acidity-notice',
      section: 'acidity',
      type: 'scale',
      beatType: 'notice',
      educationalNote: 'That bright, mouth-watering sensation is acidity. It\'s what makes wine feel refreshing rather than flat. Higher acidity wines pair beautifully with food.',
      config: {
        title: 'How much zing or crispness do you notice?',
        description: 'Pay attention to whether your mouth waters after you swallow. More watering = more acidity.',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Soft and smooth', 'Bright and zingy']
      }
    },
    {
      id: 'acidity-rate',
      section: 'acidity',
      type: 'scale',
      beatType: 'rate',
      preferenceDirection: 'more',
      config: {
        title: 'Do you enjoy this level of acidity?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Prefer softer wines', 'Love the zing']
      }
    },
    // --- SECONDARY AROMAS (notice + rate) ---
    {
      id: 'secondary-notice',
      section: 'secondary',
      type: 'multiple_choice',
      beatType: 'notice',
      educationalNote: 'These are called secondary and tertiary aromas. They come from fermentation (floral, herbal notes) and aging (vanilla, toast, leather). They\'re what make each wine unique.',
      config: {
        title: 'Beyond the fruit, do you notice any other aromas?',
        description: 'Give the glass another swirl and take a deeper sniff. These "secondary" aromas add complexity.',
        options: secondaryOptions,
        allowMultiple: true
      }
    },
    {
      id: 'secondary-rate',
      section: 'secondary',
      type: 'scale',
      beatType: 'rate',
      preferenceDirection: 'more',
      config: {
        title: 'How do you feel about these extra aromas?',
        description: 'Do they add to your enjoyment or distract from the fruit?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Prefer simpler wines', 'Love the complexity']
      }
    },
  ];

  // --- TANNINS (notice + rate) — only for red/orange wines ---
  if (hasTannins) {
    questions.push(
      {
        id: 'tannins-notice',
        section: 'tannins',
        type: 'scale',
        beatType: 'notice',
        educationalNote: 'That drying feeling is called tannin — it comes from grape skins, seeds, and sometimes oak barrels. Tannins add structure and help wines age well.',
        config: {
          title: 'How much does this wine dry out your mouth?',
          description: 'Focus on your gums and the sides of your tongue. Do they feel smooth, or is there a drying, slightly rough sensation — like over-steeped tea?',
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: ['Silky smooth', 'Grippy and drying']
        }
      },
      {
        id: 'tannins-rate',
        section: 'tannins',
        type: 'scale',
        beatType: 'rate',
        preferenceDirection: 'more',
        config: {
          title: 'Do you enjoy this level of tannin?',
          description: 'Some people love that grippy feeling, others prefer smoother wines.',
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: ['Prefer smoother', 'Love the grip']
        }
      }
    );
  }

  // --- Sweetness (for white/sparkling/dessert — replaces tannins slot) ---
  if (isWhite || isSparkling || type === 'dessert') {
    questions.push(
      {
        id: 'sweetness-notice',
        section: 'sweetness',
        type: 'scale',
        beatType: 'notice',
        educationalNote: 'Sweetness in wine comes from residual sugar left after fermentation. Wines range from bone-dry (no sugar) to lusciously sweet. Your perception of sweetness is also affected by acidity — high acidity makes wines taste drier.',
        config: {
          title: 'How sweet does this wine taste?',
          description: 'Take a sip and focus on the tip of your tongue. Does it feel bone-dry, slightly sweet, or noticeably sweet?',
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: ['Bone dry', 'Very sweet']
        }
      },
      {
        id: 'sweetness-rate',
        section: 'sweetness',
        type: 'scale',
        beatType: 'rate',
        preferenceDirection: 'more',
        config: {
          title: 'Do you enjoy this level of sweetness?',
          scaleMin: 1,
          scaleMax: 10,
          scaleLabels: ['Prefer drier wines', 'Love the sweetness']
        }
      }
    );
  }

  // --- OVERALL (no beatType — standard ending) ---
  questions.push(
    {
      id: 'overall-rating',
      section: 'overall',
      type: 'scale',
      config: {
        title: 'Overall, how much do you enjoy this wine?',
        description: 'Think about the full experience — the smell, the taste, the aftertaste. Would you be happy if someone poured you another glass?',
        scaleMin: 1,
        scaleMax: 10,
        scaleLabels: ['Not for me', 'Love it!']
      }
    },
    {
      id: 'overall-buy-again',
      section: 'overall',
      type: 'multiple_choice',
      config: {
        title: 'Would you buy this wine again?',
        options: [
          { id: 'yes', text: 'Yes, definitely!', value: 'yes' },
          { id: 'maybe', text: 'Maybe, at the right price', value: 'maybe' },
          { id: 'no', text: 'No, not for me', value: 'no' }
        ]
      }
    },
    {
      id: 'overall-notes',
      section: 'overall',
      type: 'text',
      config: {
        title: 'Any thoughts you want to remember about this wine?',
        description: 'What stood out? What would you tell a friend about it?',
        placeholder: 'e.g., "Great with the steak!", "Too tannic for me", "Perfect summer wine"',
        rows: 3
      }
    }
  );

  return questions;
}

// Section info for headers - 6 core components + chapter focus
const SECTIONS: Record<string, { name: string; icon: any; color: string }> = {
  fruit: { name: 'Fruit Flavors', icon: Grape, color: 'from-red-500 to-pink-500' },
  secondary: { name: 'Secondary Notes', icon: Droplets, color: 'from-purple-500 to-indigo-500' },
  tertiary: { name: 'Aged Character', icon: Wine, color: 'from-amber-500 to-orange-500' },
  body: { name: 'Body & Texture', icon: Wine, color: 'from-rose-500 to-red-500' },
  acidity: { name: 'Acidity', icon: Droplets, color: 'from-yellow-500 to-lime-500' },
  tannins: { name: 'Tannins', icon: Wine, color: 'from-stone-500 to-stone-700' },
  sweetness: { name: 'Sweetness', icon: Droplets, color: 'from-pink-400 to-rose-500' },
  overall: { name: 'Overall', icon: Star, color: 'from-emerald-500 to-teal-500' },
  // Legacy sections for fallback questions
  aroma: { name: 'Aroma', icon: Droplets, color: 'from-purple-500 to-pink-500' },
  taste: { name: 'Taste', icon: Grape, color: 'from-red-500 to-orange-500' },
  chapter: { name: 'Chapter Focus', icon: Wine, color: 'from-amber-500 to-yellow-500' }
};

// Convert chapter prompts to TastingQuestion format
function convertChapterPrompts(prompts: Array<{ question: string; category?: string }>): TastingQuestion[] {
  return prompts
    .filter(prompt => prompt && prompt.question && prompt.question.trim()) // Filter out empty prompts
    .map((prompt, index) => ({
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
  // Map AI category to section for display purposes
  const categoryToSection: Record<string, TastingQuestion['section']> = {
    'fruit': 'fruit',
    'secondary': 'secondary',
    'tertiary': 'tertiary',
    'body': 'body',
    'acidity': 'acidity',
    'tannins': 'tannins',
    'overall': 'overall',
    'appearance': 'visual',
    'aroma': 'aroma',
    'taste': 'taste',
    'structure': 'structure',
    'visual': 'visual',
  };

  return questions
    .filter(q => q && q.title && q.title.trim())
    .map((q) => ({
    id: q.id,
    section: categoryToSection[q.category] || 'taste',
    type: q.questionType === 'multiple_choice' ? 'multiple_choice' :
          q.questionType === 'scale' ? 'scale' : 'text',
    config: {
      title: q.title,
      description: q.description || q.wineContext,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleLabels: q.scaleLabels,
      options: q.options?.map(opt => ({
        id: opt.id,
        text: opt.text,
        value: opt.id
      })),
      allowMultiple: q.allowMultiple,
      placeholder: q.questionType === 'text' ? 'Share your observations...' : undefined,
      rows: q.questionType === 'text' ? 3 : undefined
    },
    // Pass through three-beat metadata
    beatType: q.beatType,
    educationalNote: q.educationalNote,
    preferenceDirection: q.preferenceDirection,
  }));
}

export default function SoloTastingSession({ wine, onComplete, onCancel, chapterContext, aiQuestions }: SoloTastingSessionProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showEducationalNote, setShowEducationalNote] = useState(false);

  // localStorage auto-save for crash protection
  const STORAGE_KEY = `cata-tasting-draft-${wine?.wineName || 'unknown'}`;
  const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - (parsed.timestamp || 0) < DRAFT_MAX_AGE_MS) {
          setAnswers(parsed.answers || {});
          setCurrentQuestionIndex(parsed.questionIndex || 0);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch { /* ignore corrupt localStorage */ }
  }, []);

  // Auto-save draft on change (debounced 500ms)
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          answers,
          questionIndex: currentQuestionIndex,
          timestamp: Date.now()
        }));
      } catch { /* localStorage full or unavailable */ }
    }, 500);
    return () => clearTimeout(timeout);
  }, [answers, currentQuestionIndex]);

  // Build the full question list: AI questions (if available) or standard questions + chapter prompts
  const allQuestions = useMemo(() => {
    // If we have AI-generated questions, use them instead of defaults
    if (aiQuestions && aiQuestions.length > 0) {
      return convertAIQuestions(aiQuestions);
    }

    // Build wine-type-aware questions
    const baseQuestions = getTastingQuestions(wine?.wineType);

    // Fallback to standard questions + chapter prompts
    if (!chapterContext?.tastingPrompts?.length) {
      return baseQuestions;
    }

    // Insert chapter prompts after the taste section (before overall)
    const chapterQuestions = convertChapterPrompts(chapterContext.tastingPrompts);
    const tasteEndIndex = baseQuestions.findIndex(q => q.section === 'overall');

    return [
      ...baseQuestions.slice(0, tasteEndIndex),
      ...chapterQuestions,
      ...baseQuestions.slice(tasteEndIndex)
    ];
  }, [chapterContext, aiQuestions, wine?.wineType]);

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

    // Map display sections to TastingResponses keys for save
    const sectionToResponseKey: Record<string, keyof TastingResponses> = {
      visual: 'visual',
      aroma: 'aroma',
      taste: 'taste',
      structure: 'structure',
      overall: 'overall',
      fruit: 'aroma',
      secondary: 'aroma',
      tertiary: 'aroma',
      body: 'structure',
      acidity: 'structure',
      tannins: 'taste',
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
          const responseKey = sectionToResponseKey[q.section] || 'taste';
          const section = responses[responseKey];
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

    // Ensure canonical fields the backend expects are populated,
    // even when AI-generated questions use non-standard field names
    normalizeCanonicalFields(responses, allQuestions, answers);

    return responses;
  };

  /**
   * Map AI-generated question answers to the canonical field paths the backend expects.
   * Uses explicit canonical ID matching first, then falls back to keyword heuristics.
   */
  function normalizeCanonicalFields(
    responses: TastingResponses,
    questions: TastingQuestion[],
    allAnswers: Record<string, any>
  ) {
    // Explicit canonical ID → field mapping (three-beat IDs use notice beats for observation data)
    const explicitIdMap: Record<string, { section: keyof TastingResponses; field: string }> = {
      'sweetness-notice': { section: 'taste', field: 'sweetness' },
      'acidity-notice': { section: 'taste', field: 'acidity' },
      'tannins-notice': { section: 'taste', field: 'tannins' },
      'body-notice': { section: 'taste', field: 'body' },
      'overall-rating': { section: 'overall', field: 'rating' },
      'overall-buy-again': { section: 'overall', field: 'wouldBuyAgain' },
      // Legacy fallback IDs
      'taste_sweetness': { section: 'taste', field: 'sweetness' },
      'taste_acidity': { section: 'taste', field: 'acidity' },
      'taste_tannins': { section: 'taste', field: 'tannins' },
      'taste_body': { section: 'taste', field: 'body' },
      'overall_rating': { section: 'overall', field: 'rating' },
      'overall_buy_again': { section: 'overall', field: 'wouldBuyAgain' },
    };

    // First pass: explicit ID matching
    for (const q of questions) {
      const answer = allAnswers[q.id];
      if (answer === undefined) continue;
      const mapping = explicitIdMap[q.id];
      if (mapping) {
        const target = responses[mapping.section] as Record<string, any> | undefined;
        if (target && target[mapping.field] === undefined) {
          target[mapping.field] = answer;
        }
      }
    }

    // Second pass: keyword heuristics for any remaining unmapped fields
    const canonicalFields = [
      { section: 'taste' as keyof TastingResponses, field: 'sweetness', keywords: ['sweetness', 'sweet', 'residual_sugar'] },
      { section: 'taste' as keyof TastingResponses, field: 'acidity', keywords: ['acidity', 'acid', 'tartness', 'crisp'] },
      { section: 'taste' as keyof TastingResponses, field: 'tannins', keywords: ['tannin', 'tannins', 'tannic', 'astringent'] },
      { section: 'taste' as keyof TastingResponses, field: 'body', keywords: ['body', 'weight', 'fullness', 'mouthfeel'] },
      { section: 'overall' as keyof TastingResponses, field: 'rating', keywords: ['rating', 'overall_rating', 'score'] },
    ];

    for (const { section, field, keywords } of canonicalFields) {
      const target = responses[section] as Record<string, any> | undefined;
      if (!target || target[field] !== undefined) continue;

      const structureTarget = responses.structure as Record<string, any> | undefined;
      if (structureTarget?.[field] !== undefined) {
        target[field] = structureTarget[field];
        continue;
      }

      for (const q of questions) {
        // Only map notice-beat questions (observations), not rate-beat (preferences)
        if (q.beatType === 'rate') continue;
        const answer = allAnswers[q.id];
        if (answer === undefined) continue;
        const idLower = q.id.toLowerCase();
        const titleLower = (q.config?.title || '').toLowerCase();
        if (keywords.some(kw => idLower.includes(kw) || titleLower.includes(kw))) {
          target[field] = answer;
          break;
        }
      }
    }

    // Third pass: collect preference data from rate-beat questions
    const preferences: Record<string, { enjoyment: number; wantMore: boolean }> = {};
    for (const q of questions) {
      if (q.beatType !== 'rate') continue;
      const answer = allAnswers[q.id];
      if (answer === undefined || typeof answer !== 'number') continue;

      // Extract trait name from ID (e.g., "tannins-rate" → "tannins")
      const trait = q.id.replace(/-rate$/, '');
      if (trait) {
        preferences[trait] = {
          enjoyment: answer,
          wantMore: q.preferenceDirection === 'more' ? answer >= 6 : answer <= 4,
        };
      }
    }

    if (Object.keys(preferences).length > 0) {
      responses.preferences = preferences;
    }
  }

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
    onSuccess: (data) => {
      localStorage.removeItem(STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ['/api/solo/tastings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/solo/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me/taste-profile'] });
      // Also invalidate URL-embedded dashboard queries (e.g. ['/api/dashboard/email@...'])
      queryClient.invalidateQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === 'string' &&
          (query.queryKey[0] as string).startsWith('/api/dashboard')
      });
      setSaveError(null);
      setIsSaving(false);
      // Navigate directly — parent (SoloTastingNew) owns the completion screen
      onComplete(data?.tasting?.id);
    },
    onError: (error) => {
      console.error('Failed to save tasting:', error);
      setIsSaving(false);
      setSaveError(error instanceof Error ? error.message : 'Failed to save tasting. Please try again.');
    }
  });

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    setShowEducationalNote(false);

    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Last question - save and complete
      setIsSaving(true);
      saveTastingMutation.mutate();
    }
  };

  const handlePrevious = () => {
    setShowEducationalNote(false);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const { id, type, config } = currentQuestion;

    // Skip rendering if the question has no title/content
    if (!config.title || !config.title.trim()) {
      console.warn('[SoloTastingSession] Skipping question with empty title:', currentQuestion);
      return null;
    }

    // For notice-beat questions, integrate the educational tip into the description
    const description = currentQuestion.beatType === 'notice' && currentQuestion.educationalNote
      ? `${config.description || ''}\n\n💡 ${currentQuestion.educationalNote}`.trim()
      : (config.description || '');

    switch (type) {
      case 'scale':
        return (
          <ScaleQuestion
            question={{
              title: config.title,
              description,
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
              description,
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

  // Save error screen - show retry option
  if (saveError) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Save Failed</h2>
          <p className="text-white/70 mb-6">
            Your tasting notes couldn't be saved. Don't worry — your answers are still here.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => {
                setSaveError(null);
                setIsSaving(true);
                saveTastingMutation.mutate();
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full text-white/60 hover:text-white hover:bg-white/10 py-3 rounded-xl"
            >
              Exit Without Saving
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
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
            className="flex-1 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
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
