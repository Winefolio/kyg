/**
 * AI Question Generation Service
 * Sprint 5: Generates wine-specific tasting questions
 *
 * Key Principle: Questions focus on 5 core components to help users understand their preferences:
 * 1. Fruit flavors - primary taste driver
 * 2. Secondary flavors - herbal, floral, earthy notes (complexity indicators)
 * 3. Tertiary flavors - oak, vanilla, aged characteristics (winemaking influence)
 * 4. Body - weight and texture in the mouth
 * 5. Acidity - brightness and crispness
 *
 * Questions are conversational and focused on what the user LIKES, not testing knowledge.
 */

import { z } from 'zod';
import type { GeneratedQuestion, WineRecognitionResult, Chapter, TastingLevel, QuestionCategory } from "@shared/schema";
import { openai } from "../lib/openai";

// Zod schema for structured output from GPT
const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  description: z.string().optional()
});

const GeneratedQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(['fruit', 'secondary', 'tertiary', 'body', 'acidity', 'overall']),
  questionType: z.enum(['multiple_choice', 'scale', 'text']),
  title: z.string(),
  description: z.string().optional(),
  options: z.array(QuestionOptionSchema).optional(),
  allowMultiple: z.boolean().optional(),
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
  scaleLabels: z.tuple([z.string(), z.string()]).optional(),
  wineContext: z.string().optional()
});

const QuestionSetSchema = z.object({
  questions: z.array(GeneratedQuestionSchema)
});

// Interface for raw GPT response before transformation
interface RawGPTQuestion {
  id: string;
  category: string;
  questionType: string;
  title: string;
  description?: string;
  options?: Array<{ id: string; text: string; description?: string }>;
  allowMultiple?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: string[];
  wineContext?: string;
}

// Fallback questions when AI generation fails - based on 5 core components
const FALLBACK_QUESTIONS: GeneratedQuestion[] = [
  {
    id: 'fruit-1',
    category: 'fruit',
    questionType: 'scale',
    title: 'How much do you enjoy the fruit flavors you\'re tasting?',
    description: 'Think about berries, citrus, stone fruit, or tropical notes',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Not at all', 'Love them']
  },
  {
    id: 'fruit-2',
    category: 'fruit',
    questionType: 'multiple_choice',
    title: 'What fruit flavors stand out to you?',
    description: 'Select all that you notice',
    options: [
      { id: 'red-berries', text: 'Red berries (cherry, raspberry, strawberry)' },
      { id: 'dark-berries', text: 'Dark berries (blackberry, blueberry, plum)' },
      { id: 'citrus', text: 'Citrus (lemon, lime, grapefruit)' },
      { id: 'stone-fruit', text: 'Stone fruit (peach, apricot, nectarine)' },
      { id: 'tropical', text: 'Tropical (pineapple, mango, passion fruit)' }
    ],
    allowMultiple: true
  },
  {
    id: 'secondary-1',
    category: 'secondary',
    questionType: 'multiple_choice',
    title: 'Do you notice any herbal, floral, or earthy notes?',
    description: 'These add complexity to the wine',
    options: [
      { id: 'herbal', text: 'Herbal (mint, eucalyptus, bell pepper)' },
      { id: 'floral', text: 'Floral (rose, violet, honeysuckle)' },
      { id: 'earthy', text: 'Earthy (mushroom, soil, forest floor)' },
      { id: 'mineral', text: 'Mineral (wet stones, chalk, slate)' },
      { id: 'none', text: 'Not really noticing any' }
    ],
    allowMultiple: true
  },
  {
    id: 'secondary-2',
    category: 'secondary',
    questionType: 'scale',
    title: 'How do you feel about these secondary notes?',
    description: 'Do they add to your enjoyment or distract from it?',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Dislike them', 'Really enjoy them']
  },
  {
    id: 'tertiary-1',
    category: 'tertiary',
    questionType: 'multiple_choice',
    title: 'Do you notice any oak, vanilla, or aged characteristics?',
    description: 'These come from winemaking and aging',
    options: [
      { id: 'vanilla', text: 'Vanilla' },
      { id: 'toast', text: 'Toast or baking spices' },
      { id: 'smoke', text: 'Smoke or char' },
      { id: 'leather', text: 'Leather or tobacco' },
      { id: 'none', text: 'Not noticing these' }
    ],
    allowMultiple: true
  },
  {
    id: 'tertiary-2',
    category: 'tertiary',
    questionType: 'scale',
    title: 'How do you feel about these oak/aged characteristics?',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Too much', 'Love them']
  },
  {
    id: 'body-1',
    category: 'body',
    questionType: 'scale',
    title: 'How does the weight feel in your mouth?',
    description: 'Think of it like milk - skim milk (light) to whole milk (full)',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Light body', 'Full body']
  },
  {
    id: 'body-2',
    category: 'body',
    questionType: 'scale',
    title: 'Do you enjoy this body style?',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Prefer lighter', 'Prefer fuller']
  },
  {
    id: 'acidity-1',
    category: 'acidity',
    questionType: 'scale',
    title: 'How bright or crisp does this wine taste?',
    description: 'Does it make your mouth water?',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Soft, mellow', 'Bright, crisp']
  },
  {
    id: 'acidity-2',
    category: 'acidity',
    questionType: 'scale',
    title: 'Do you enjoy this level of acidity?',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Too much', 'Perfect']
  },
  {
    id: 'overall-1',
    category: 'overall',
    questionType: 'scale',
    title: 'Overall, how much do you enjoy this wine?',
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: ['Not for me', 'Love it!']
  },
  {
    id: 'overall-2',
    category: 'overall',
    questionType: 'text',
    title: 'What stood out to you most about this wine?',
    description: 'Share what you liked or didn\'t like'
  }
];

/**
 * Generate wine-specific tasting questions focused on 5 core components
 *
 * @param wineInfo - Recognition result from photographed wine
 * @param chapter - Chapter context for additional guidance
 * @param userLevel - User's tasting level (intro, intermediate, advanced)
 * @returns Array of generated questions focused on understanding preferences
 */
export async function generateQuestionsForWine(
  wineInfo: WineRecognitionResult,
  chapter?: Chapter,
  userLevel: TastingLevel = 'intro'
): Promise<GeneratedQuestion[]> {
  // Return fallback questions if OpenAI is not configured
  if (!openai) {
    console.log('[QuestionGenerator] OpenAI not configured, returning fallback questions');
    return getFallbackQuestions();
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini', // Fast, cheap model for question generation
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(userLevel)
        },
        {
          role: 'user',
          content: getUserPrompt(wineInfo, chapter, userLevel)
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'wine_questions',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    category: { type: 'string', enum: ['fruit', 'secondary', 'tertiary', 'body', 'acidity', 'overall'] },
                    questionType: { type: 'string', enum: ['multiple_choice', 'scale', 'text'] },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          text: { type: 'string' },
                          description: { type: 'string' }
                        },
                        required: ['id', 'text'],
                        additionalProperties: false
                      }
                    },
                    allowMultiple: { type: 'boolean' },
                    scaleMin: { type: 'number' },
                    scaleMax: { type: 'number' },
                    scaleLabels: { type: 'array', items: { type: 'string' } },
                    wineContext: { type: 'string' }
                  },
                  required: ['id', 'category', 'questionType', 'title'],
                  additionalProperties: false
                }
              }
            },
            required: ['questions'],
            additionalProperties: false
          }
        }
      },
      max_completion_tokens: 2000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.warn('No content in GPT response, using fallback questions');
      return FALLBACK_QUESTIONS;
    }

    const parsed = JSON.parse(content);

    // Validate and transform the response
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      console.warn('Invalid questions array in response, using fallback');
      return FALLBACK_QUESTIONS;
    }

    // Transform scaleLabels from array to tuple if needed
    const questions: GeneratedQuestion[] = (parsed.questions as RawGPTQuestion[]).map((q) => ({
      ...q,
      category: q.category as GeneratedQuestion['category'],
      questionType: q.questionType as GeneratedQuestion['questionType'],
      scaleLabels: q.scaleLabels && q.scaleLabels.length >= 2
        ? [q.scaleLabels[0], q.scaleLabels[1]] as [string, string]
        : undefined
    }));

    // Ensure we have all 5 core components represented
    const categories = new Set(questions.map(q => q.category));
    const requiredCategories: QuestionCategory[] = ['fruit', 'secondary', 'tertiary', 'body', 'acidity', 'overall'];

    for (const cat of requiredCategories) {
      if (!categories.has(cat)) {
        // Add fallback question for missing category
        const fallback = FALLBACK_QUESTIONS.find(q => q.category === cat);
        if (fallback) {
          questions.push(fallback);
        }
      }
    }

    // Sort by category order (5 core components + overall)
    const categoryOrder = { fruit: 0, secondary: 1, tertiary: 2, body: 3, acidity: 4, overall: 5 };
    questions.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

    return questions;

  } catch (error) {
    console.error('Error generating questions:', error);
    return FALLBACK_QUESTIONS;
  }
}

function getSystemPrompt(userLevel: TastingLevel): string {
  const questionCount = userLevel === 'intro' ? '6-8' : userLevel === 'intermediate' ? '10-12' : '12-15';

  return `You are a friendly sommelier helping someone discover what they like about wine.
Your goal is to ask questions that help THEM understand their own preferences.

Focus on these 5 core components (in this order):
1. Fruit flavors - "How much do you enjoy the fruit flavors you're tasting?"
2. Secondary flavors - herbal, floral, earthy notes
3. Tertiary flavors - oak, vanilla, aged characteristics
4. Body - weight and texture in the mouth
5. Acidity - brightness and crispness
6. Overall - final rating and impressions

Generate ${questionCount} questions total.

For ${userLevel} users:
${userLevel === 'intro' ? `- Keep questions simple and approachable. Use everyday language.
- Provide helpful descriptions for each option.
- Focus on "do you like this?" rather than "what is this?"
- Avoid wine jargon - use comparisons like "like skim milk vs whole milk" for body` : ''}
${userLevel === 'intermediate' ? `- Can use some wine terminology.
- Ask about specific flavor notes.
- Include questions about why they like/dislike certain characteristics.
- Start introducing regional characteristics.` : ''}
${userLevel === 'advanced' ? `- Dive deeper into terroir, winemaking, vintage characteristics.
- Include nuanced distinctions.
- Ask about balance, complexity, and aging potential.
- Challenge them to identify specific characteristics.` : ''}

Make it interactive and conversational. The goal is to help them understand what they like about this wine, not test their knowledge.

For multiple_choice questions: provide 4-5 options specific to this wine type.
For scale questions: use 1-5 for characteristics, 1-10 for overall rating.
For text questions: use only for final impressions.

CRITICAL: Frame questions around enjoyment and preference, not identification.
Good: "How much do you enjoy the fruit flavors?"
Bad: "Identify the primary fruit aromas."`;
}

function getUserPrompt(wineInfo: WineRecognitionResult, chapter?: Chapter, userLevel?: TastingLevel): string {
  const varietal = wineInfo.grapeVarieties?.[0] || 'Unknown';

  let prompt = `Generate tasting questions for this wine:

Wine: ${wineInfo.name}
Varietal: ${varietal}
Region: ${wineInfo.region}
${wineInfo.vintage ? `Vintage: ${wineInfo.vintage}` : ''}
${wineInfo.producer ? `Producer: ${wineInfo.producer}` : ''}`;

  if (chapter) {
    prompt += `

Learning Context:
Chapter: ${chapter.title}
${chapter.description ? `Description: ${chapter.description}` : ''}
${chapter.learningObjectives ? `Learning Objectives: ${JSON.stringify(chapter.learningObjectives)}` : ''}`;
  }

  // Add varietal-specific guidance
  prompt += `

Include 2-3 questions specific to ${varietal} characteristics:`;

  if (varietal.toLowerCase().includes('sangiovese') || varietal.toLowerCase().includes('chianti')) {
    prompt += `
- For Sangiovese, ask about cherry notes, tomato-like acidity, and earthy characteristics.`;
  } else if (varietal.toLowerCase().includes('pinot noir')) {
    prompt += `
- For Pinot Noir, ask about red fruit vs. earth balance, mushroom/forest notes.`;
  } else if (varietal.toLowerCase().includes('cabernet')) {
    prompt += `
- For Cabernet, ask about dark fruit intensity, green/herbal notes, oak influence.`;
  } else if (varietal.toLowerCase().includes('chardonnay')) {
    prompt += `
- For Chardonnay, ask about citrus vs. tropical fruit, oak/butter influence, minerality.`;
  } else if (varietal.toLowerCase().includes('sauvignon blanc')) {
    prompt += `
- For Sauvignon Blanc, ask about citrus, grassy notes, and minerality.`;
  } else if (varietal.toLowerCase().includes('riesling')) {
    prompt += `
- For Riesling, ask about sweetness level, petrol notes, and stone fruit.`;
  } else {
    prompt += `
- Ask about characteristics typical of ${varietal} from ${wineInfo.region || 'this region'}.`;
  }

  // Add region-specific guidance
  if (wineInfo.region) {
    prompt += `

Include 1-2 questions about what makes ${wineInfo.region} wines distinctive.`;
  }

  prompt += `

Remember: Focus on what the taster ENJOYS about these characteristics, not just identification.
Frame questions conversationally: "How do you feel about..." rather than "Identify..."`;

  return prompt;
}

/**
 * Get fallback questions if generation fails
 */
export function getFallbackQuestions(): GeneratedQuestion[] {
  return FALLBACK_QUESTIONS;
}
