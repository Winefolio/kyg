import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users, type OnboardingData } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";
import { z } from "zod";
import { validationError, internalError } from "../lib/api-error";
import { generateAndStoreStarterRecs } from "../services/starterRecommendationService";

const onboardingSchema = z.object({
  knowledgeLevel: z.enum(['beginner', 'casual', 'enthusiast', 'nerd', 'not_sure']),
  wineVibe: z.enum(['bold', 'light', 'sweet', 'adventurous', 'not_sure']),
  foodPreferences: z.array(z.string()).max(15),
  drinkPreferences: z.array(z.string()).max(10),
  occasion: z.enum(['learning', 'go_to_bottle', 'impress', 'date_night', 'not_sure']),
  favoriteWines: z.string().max(500).optional(),
});

// Also accept skip requests (no data)
const skipOnboardingSchema = z.object({
  skip: z.literal(true),
});

const tastingLevelMap: Record<string, string> = {
  beginner: 'intro',
  casual: 'intro',
  enthusiast: 'intermediate',
  nerd: 'advanced',
};

export function registerUserRoutes(app: Express): void {
  // Save onboarding quiz answers (or skip)
  app.post("/api/user/onboarding", requireAuth, async (req: Request, res: Response) => {
    const userId = req.session.userId!;

    try {
      // Check if skip request
      const skipParsed = skipOnboardingSchema.safeParse(req.body);
      if (skipParsed.success) {
        await db.update(users).set({
          onboardingCompleted: true,
        }).where(eq(users.id, userId));

        const updatedUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        return res.json({ user: updatedUser });
      }

      // Validate quiz answers
      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        return validationError(res, "Invalid onboarding data");
      }

      const { knowledgeLevel, wineVibe, foodPreferences, drinkPreferences, occasion, favoriteWines } = parsed.data;

      const onboardingData: OnboardingData = {
        knowledgeLevel,
        wineVibe,
        foodPreferences,
        drinkPreferences,
        occasion,
        favoriteWines: favoriteWines || undefined,
        completedAt: new Date().toISOString(),
      };

      await db.update(users).set({
        onboardingCompleted: true,
        onboardingData,
        tastingLevel: tastingLevelMap[knowledgeLevel] || 'intro',
      }).where(eq(users.id, userId));

      // Generate starter recommendations async (fire-and-forget)
      generateAndStoreStarterRecs(userId, onboardingData).catch(err => {
        console.error('[User] Starter recs generation failed:', err);
      });

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      return res.json({ user: updatedUser });
    } catch (error) {
      console.error("[User] Onboarding save error:", error);
      return internalError(res, "Failed to save onboarding data");
    }
  });
}
