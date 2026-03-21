import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAIClient } from '../lib/openai';
import { sanitizeForPrompt } from '../lib/sanitize';
import { db } from '../db';
import { users } from '@shared/schema';
import type { OnboardingData, StarterRecommendation } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Zod schema for structured GPT output
const starterRecSchema = z.object({
  recommendations: z.array(z.object({
    wineName: z.string(),
    wineType: z.enum(['red', 'white', 'rosé', 'sparkling', 'orange', 'dessert']),
    grape: z.string(),
    region: z.string(),
    reason: z.string(),
  })).min(3).max(5),
});

const SYSTEM_PROMPT = `You are a friendly sommelier helping a new wine explorer find their first wines.

Given the user's onboarding answers (taste preferences, food/drink habits, and optionally wines they've enjoyed), recommend 3-5 specific, real wines that are commonly available at wine shops and restaurants.

Rules:
- Recommend REAL wines that actually exist and are widely available (not obscure or fictional)
- Each recommendation should be a specific wine style/type (e.g., "Malbec from Mendoza" not just "red wine")
- The "reason" field should be ONE sentence that connects the pick to something specific in the user's answers
- Vary the recommendations — don't suggest 5 reds if the user might enjoy whites too
- If the user is a beginner, favor approachable, crowd-pleasing wines
- If they mentioned specific wines they've enjoyed, use those as anchors to suggest similar or complementary wines
- Match wine intensity to their vibe preference (bold → full-bodied, light → crisp/delicate, sweet → off-dry/dessert)
- Consider their food preferences for pairing logic (steak → bold reds, seafood → crisp whites, etc.)
- Consider their drink preferences as palate signals (black coffee → tannin tolerance, lemonade → enjoys acidity)`;

/**
 * Generate and store starter wine recommendations from onboarding data.
 * Called async after onboarding save. Results stored on user record.
 */
export async function generateAndStoreStarterRecs(
  userId: number,
  onboardingData: OnboardingData
): Promise<StarterRecommendation[] | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    console.warn('[StarterRecs] OpenAI not configured, skipping');
    return null;
  }

  try {
    const sanitizedFavorites = sanitizeForPrompt(onboardingData.favoriteWines, 500);

    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            knowledgeLevel: onboardingData.knowledgeLevel,
            wineVibe: onboardingData.wineVibe,
            foodPreferences: onboardingData.foodPreferences,
            drinkPreferences: onboardingData.drinkPreferences,
            occasion: onboardingData.occasion,
            favoriteWines: sanitizedFavorites || null,
          }),
        },
      ],
      response_format: zodResponseFormat(starterRecSchema, 'starter_recs'),
      max_completion_tokens: 800,
    });

    if (completion.choices[0].message.refusal) {
      console.warn('[StarterRecs] GPT refused generation');
      return null;
    }

    const recs = completion.choices[0].message.parsed!.recommendations;

    // Store on user record
    await db.update(users).set({
      starterRecommendations: recs,
    }).where(eq(users.id, userId));

    console.log(`[StarterRecs] Generated ${recs.length} recommendations for user ${userId}`);
    return recs;
  } catch (error) {
    console.error('[StarterRecs] Generation failed:', error);
    return null;
  }
}
