/**
 * AI Question Generation Service
 * Sprint 5: Generates wine-specific tasting questions following the existing structure
 *
 * Key Principle: The AI enhances questions with wine-specific options/context,
 * but KEEPS the existing flow structure: appearance → aroma → taste → structure → overall
 */

import OpenAI from 'openai';
import { z } from 'zod';
import type { GeneratedQuestion, WineRecognitionResult, Chapter } from "@shared/schema";

const openai = new OpenAI();

// Zod schema for structured output from GPT
const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  description: z.string().optional()
});

const GeneratedQuestionSchema = z.object({
  id: z.string(),
  category: z.enum(['appearance', 'aroma', 'taste', 'structure', 'overall']),
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

// Fallback questions when AI generation fails
const FALLBACK_QUESTIONS: GeneratedQuestion[] = [
  {
    id: 'appearance-1',
    category: 'appearance',
    questionType: 'multiple_choice',
    title: 'What is the color intensity?',
    description: 'Observe the wine against a white background',
    options: [
      { id: 'pale', text: 'Pale', description: 'Light, watery color' },
      { id: 'medium', text: 'Medium', description: 'Moderate color depth' },
      { id: 'deep', text: 'Deep', description: 'Rich, intense color' }
    ]
  },
  {
    id: 'aroma-1',
    category: 'aroma',
    questionType: 'multiple_choice',
    title: 'What aromas do you detect?',
    description: 'Swirl the glass and take a few sniffs',
    options: [
      { id: 'fruit', text: 'Fruit (berries, citrus, stone fruit)' },
      { id: 'floral', text: 'Floral (rose, violet, blossom)' },
      { id: 'earth', text: 'Earth (soil, mushroom, forest floor)' },
      { id: 'oak', text: 'Oak (vanilla, toast, spice)' },
      { id: 'other', text: 'Other' }
    ],
    allowMultiple: true
  },
  {
    id: 'taste-1',
    category: 'taste',
    questionType: 'scale',
    title: 'How sweet is this wine?',
    description: 'Focus on the tip of your tongue',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Bone Dry', 'Sweet']
  },
  {
    id: 'taste-2',
    category: 'taste',
    questionType: 'scale',
    title: 'How would you rate the acidity?',
    description: 'Does it make your mouth water?',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Low Acidity', 'High Acidity']
  },
  {
    id: 'structure-1',
    category: 'structure',
    questionType: 'scale',
    title: 'How would you describe the body?',
    description: 'The weight and fullness in your mouth',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Light Body', 'Full Body']
  },
  {
    id: 'structure-2',
    category: 'structure',
    questionType: 'scale',
    title: 'Rate the tannin level',
    description: 'The drying sensation on your gums (for red wines)',
    scaleMin: 1,
    scaleMax: 5,
    scaleLabels: ['Soft Tannins', 'Firm Tannins']
  },
  {
    id: 'overall-1',
    category: 'overall',
    questionType: 'scale',
    title: 'Overall, how would you rate this wine?',
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: ['Poor', 'Excellent']
  },
  {
    id: 'overall-2',
    category: 'overall',
    questionType: 'text',
    title: 'Any final tasting notes?',
    description: 'Share your overall impressions'
  }
];

/**
 * Generate wine-specific tasting questions
 *
 * @param wineInfo - Recognition result from photographed wine
 * @param chapter - Chapter context for additional guidance
 * @param difficulty - User's skill level
 * @returns Array of generated questions following the standard flow
 */
export async function generateQuestionsForWine(
  wineInfo: WineRecognitionResult,
  chapter?: Chapter,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
): Promise<GeneratedQuestion[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2', // Use latest GPT-5 for complex wine-specific question generation
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(difficulty)
        },
        {
          role: 'user',
          content: getUserPrompt(wineInfo, chapter)
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
                    category: { type: 'string', enum: ['appearance', 'aroma', 'taste', 'structure', 'overall'] },
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
    const questions: GeneratedQuestion[] = parsed.questions.map((q: any) => ({
      ...q,
      scaleLabels: q.scaleLabels && q.scaleLabels.length >= 2
        ? [q.scaleLabels[0], q.scaleLabels[1]] as [string, string]
        : undefined
    }));

    // Ensure we have all categories represented
    const categories = new Set(questions.map(q => q.category));
    const requiredCategories = ['appearance', 'aroma', 'taste', 'structure', 'overall'];

    for (const cat of requiredCategories) {
      if (!categories.has(cat as any)) {
        // Add fallback question for missing category
        const fallback = FALLBACK_QUESTIONS.find(q => q.category === cat);
        if (fallback) {
          questions.push(fallback);
        }
      }
    }

    // Sort by category order
    const categoryOrder = { appearance: 0, aroma: 1, taste: 2, structure: 3, overall: 4 };
    questions.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

    return questions;

  } catch (error) {
    console.error('Error generating questions:', error);
    return FALLBACK_QUESTIONS;
  }
}

function getSystemPrompt(difficulty: string): string {
  return `You are a sommelier and wine educator creating tasting questions.

CRITICAL: You MUST follow this exact category flow:
1. appearance (1-2 questions about color, clarity)
2. aroma (1-2 questions about what you smell)
3. taste (2-3 questions about flavors, sweetness, acidity)
4. structure (1-2 questions about body, tannins, finish)
5. overall (1-2 questions for rating and final notes)

Generate 8-10 questions total. For a ${difficulty} level taster:
${difficulty === 'beginner' ? '- Use simple, approachable language\n- Provide helpful descriptions for each option\n- Focus on basic characteristics' : ''}
${difficulty === 'intermediate' ? '- Use standard wine vocabulary\n- Include some specific regional terms\n- Balance education with evaluation' : ''}
${difficulty === 'advanced' ? '- Use professional tasting terminology\n- Include nuanced distinctions\n- Challenge the taster with specific assessments' : ''}

For multiple_choice questions: provide 4-5 options specific to this wine.
For scale questions: use 1-5 for characteristics, 1-10 for overall rating.
For text questions: use only for final notes.

Include wineContext field with a brief educational note about what to expect from this specific wine type.`;
}

function getUserPrompt(wineInfo: WineRecognitionResult, chapter?: Chapter): string {
  let prompt = `Generate tasting questions for this wine:

Wine: ${wineInfo.name}
Region: ${wineInfo.region}
Grape Varieties: ${wineInfo.grapeVarieties.join(', ')}
${wineInfo.vintage ? `Vintage: ${wineInfo.vintage}` : ''}
${wineInfo.producer ? `Producer: ${wineInfo.producer}` : ''}`;

  if (chapter) {
    prompt += `

Learning Context:
Chapter: ${chapter.title}
${chapter.description ? `Description: ${chapter.description}` : ''}
${chapter.learningObjectives ? `Learning Objectives: ${JSON.stringify(chapter.learningObjectives)}` : ''}`;
  }

  prompt += `

Generate questions with options specifically tailored to characteristics typical of this wine and region. For example:
- For a Barolo, aroma options might include "tar and roses", "dried cherry", "truffle"
- For a Marlborough Sauvignon Blanc, aroma options might include "passion fruit", "gooseberry", "freshly cut grass"

Make the options educational - teach the taster what to look for in this specific wine.`;

  return prompt;
}

/**
 * Get fallback questions if generation fails
 */
export function getFallbackQuestions(): GeneratedQuestion[] {
  return FALLBACK_QUESTIONS;
}
