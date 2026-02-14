/**
 * Sommelier Context Builder
 * Assembles the system prompt for the AI sommelier chat using existing storage methods.
 */

import { storage } from "../storage";
import fs from "fs/promises";
import path from "path";

let cachedPersonalityPrompt: string | null = null;

async function getPersonalityPrompt(): Promise<string> {
  if (cachedPersonalityPrompt) return cachedPersonalityPrompt;
  const promptPath = path.join(process.cwd(), "prompts", "sommelier_chat.txt");
  cachedPersonalityPrompt = await fs.readFile(promptPath, "utf-8");
  return cachedPersonalityPrompt;
}

/**
 * Build the full system prompt for a sommelier chat turn.
 */
export async function buildSystemPrompt(
  userEmail: string,
  conversationSummary?: string | null
): Promise<string> {
  const [personality, userContext] = await Promise.all([
    getPersonalityPrompt(),
    buildUserContext(userEmail),
  ]);

  const summarySection = conversationSummary
    ? `\n\n== CONVERSATION SO FAR ==\n${conversationSummary}`
    : "\n\n== CONVERSATION SO FAR ==\nThis is the start of your conversation.";

  return `${personality}\n\n${userContext}${summarySection}`;
}

async function buildUserContext(email: string): Promise<string> {
  try {
    const [user, starters, dashboardData, wineScores] = await Promise.all([
      storage.getUserByEmail(email),
      storage.getConversationStarters(email).catch(() => null),
      storage.getUserDashboardData(email).catch(() => null),
      storage.getUserWineScores(email).catch(() => null),
    ]);

    if (!user) return "== YOUR TASTER ==\nNew taster, no history yet.";

    const lines: string[] = ["== YOUR TASTER =="];

    // Basic info
    lines.push(`Level: ${user.tastingLevel || "intro"} (${user.tastingsCompleted || 0} tastings)`);
    if (user.wineArchetype) lines.push(`Wine Archetype: ${user.wineArchetype}`);

    // Favorites from conversation starters
    if (starters) {
      if (starters.favoriteRegion) {
        lines.push(`Favorite Region: ${starters.favoriteRegion.region} (${starters.favoriteRegion.wines} wines, avg ${starters.favoriteRegion.avgRating}/5)`);
      }
      if (starters.favoriteGrape) {
        lines.push(`Favorite Grape: ${starters.favoriteGrape.grape} (${starters.favoriteGrape.wines} wines, avg ${starters.favoriteGrape.avgRating}/5)`);
      }
      if (starters.quickFacts) {
        lines.push(`Total Wines Tasted: ${starters.quickFacts.totalWines}`);
        lines.push(`Preferred Style: ${starters.quickFacts.preferredStyle}`);
      }
    }

    // Preference scores from dashboard
    if (dashboardData?.preferences) {
      const p = dashboardData.preferences;
      const prefs: string[] = [];
      if (p.sweetness != null) prefs.push(`Sweetness ${p.sweetness}/5`);
      if (p.acidity != null) prefs.push(`Acidity ${p.acidity}/5`);
      if (p.tannins != null) prefs.push(`Tannins ${p.tannins}/5`);
      if (p.body != null) prefs.push(`Body ${p.body}/5`);
      if (prefs.length > 0) lines.push(`Preferences: ${prefs.join(", ")}`);
    }

    // Recent tastings (last 5 for token budget)
    if (wineScores?.scores && wineScores.scores.length > 0) {
      const recent = wineScores.scores.slice(0, 5);
      const recentList = recent
        .map((w: any) => `${w.wineName} (${w.region || "unknown region"}, ${w.averageScore ? w.averageScore.toFixed(1) : "unrated"})`)
        .join("; ");
      lines.push(`Recent Wines: ${recentList}`);
    }

    return lines.join("\n");
  } catch (error) {
    console.error("[SommelierContext] Error building user context:", error);
    return "== YOUR TASTER ==\nCould not load taster profile.";
  }
}
