import type { Express, Request, Response } from "express";
import { db } from "../db";
import { tastings, users, insertTastingSchema } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "./auth";
import { attachCharacteristicsToTasting } from "../wine-intelligence";

/**
 * Get user's taste preferences derived from their tastings
 */
async function getUserPreferences(userId: number) {
  const result = await db.execute(sql`
    SELECT
      AVG((responses->'taste'->>'sweetness')::numeric) as sweetness,
      AVG((responses->'taste'->>'acidity')::numeric) as acidity,
      AVG((responses->'taste'->>'tannins')::numeric) as tannins,
      AVG((responses->'taste'->>'body')::numeric) as body,
      COUNT(*) as tasting_count
    FROM tastings
    WHERE user_id = ${userId}
  `);

  const row = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
  return row || { sweetness: null, acidity: null, tannins: null, body: null, tasting_count: 0 };
}

/**
 * Format preferences as human-readable text
 */
function formatPreferences(prefs: any): string {
  const descriptions: string[] = [];

  if (prefs.body !== null) {
    if (Number(prefs.body) > 3.5) descriptions.push('Full-bodied');
    else if (Number(prefs.body) < 2.5) descriptions.push('Light-bodied');
  }

  if (prefs.tannins !== null) {
    if (Number(prefs.tannins) > 3.5) descriptions.push('High tannins');
    else if (Number(prefs.tannins) < 2.5) descriptions.push('Low tannins');
  }

  if (prefs.acidity !== null) {
    if (Number(prefs.acidity) > 3.5) descriptions.push('High acidity');
    else if (Number(prefs.acidity) < 2.5) descriptions.push('Low acidity');
  }

  if (prefs.sweetness !== null) {
    if (Number(prefs.sweetness) > 3.5) descriptions.push('Off-dry to sweet');
    else if (Number(prefs.sweetness) < 2) descriptions.push('Bone dry');
  }

  return descriptions.length > 0
    ? `You prefer: ${descriptions.join(', ')}`
    : 'Complete more tastings to see your preferences';
}

interface WineRecommendation {
  name: string;
  region: string;
  grapeVariety: string;
  wineType: 'red' | 'white' | 'rosé' | 'sparkling';
  reason: string;
  characteristics: { sweetness: number; acidity: number; tannins: number; body: number };
}

/**
 * Generate wine recommendations based on user preferences
 */
function generateRecommendations(prefs: any): WineRecommendation[] {
  const recommendations: WineRecommendation[] = [];
  const body = prefs.body ? Number(prefs.body) : 3;
  const tannins = prefs.tannins ? Number(prefs.tannins) : 3;
  const acidity = prefs.acidity ? Number(prefs.acidity) : 3;
  const sweetness = prefs.sweetness ? Number(prefs.sweetness) : 2;

  // High body, high tannins = bold reds
  if (body > 3 && tannins > 3) {
    recommendations.push({
      name: 'Barolo',
      region: 'Piedmont, Italy',
      grapeVariety: 'Nebbiolo',
      wineType: 'red',
      reason: 'Rich, full-bodied with firm tannins - perfect for bold wine lovers',
      characteristics: { sweetness: 1.5, acidity: 3.5, tannins: 4.5, body: 4.5 }
    });
    recommendations.push({
      name: 'Napa Valley Cabernet Sauvignon',
      region: 'Napa Valley, USA',
      grapeVariety: 'Cabernet Sauvignon',
      wineType: 'red',
      reason: 'Powerful and structured with dark fruit and oak complexity',
      characteristics: { sweetness: 1.5, acidity: 3, tannins: 4, body: 4.5 }
    });
  }

  // Medium body, lower tannins = elegant reds
  if (body >= 2.5 && body <= 3.5 && tannins < 3.5) {
    recommendations.push({
      name: 'Burgundy Pinot Noir',
      region: 'Burgundy, France',
      grapeVariety: 'Pinot Noir',
      wineType: 'red',
      reason: 'Elegant and refined with silky tannins and red fruit notes',
      characteristics: { sweetness: 1.5, acidity: 3.5, tannins: 2.5, body: 3 }
    });
  }

  // High acidity preference = crisp whites
  if (acidity > 3) {
    recommendations.push({
      name: 'Chablis',
      region: 'Burgundy, France',
      grapeVariety: 'Chardonnay',
      wineType: 'white',
      reason: 'Mineral-driven with bright acidity and citrus notes',
      characteristics: { sweetness: 1.5, acidity: 4, tannins: 1, body: 2.5 }
    });
    recommendations.push({
      name: 'Sancerre',
      region: 'Loire Valley, France',
      grapeVariety: 'Sauvignon Blanc',
      wineType: 'white',
      reason: 'Crisp and refreshing with herbaceous and citrus character',
      characteristics: { sweetness: 1.5, acidity: 4.5, tannins: 1, body: 2 }
    });
  }

  // Lower acidity, fuller body = richer whites
  if (acidity <= 3 && body > 3) {
    recommendations.push({
      name: 'California Chardonnay',
      region: 'Sonoma, USA',
      grapeVariety: 'Chardonnay',
      wineType: 'white',
      reason: 'Rich and creamy with vanilla and tropical fruit notes',
      characteristics: { sweetness: 2, acidity: 2.5, tannins: 1, body: 4 }
    });
  }

  // Sweetness preference = off-dry/sweet wines
  if (sweetness > 2.5) {
    recommendations.push({
      name: 'Mosel Riesling Spätlese',
      region: 'Mosel, Germany',
      grapeVariety: 'Riesling',
      wineType: 'white',
      reason: 'Off-dry with honeyed stone fruit balanced by racy acidity',
      characteristics: { sweetness: 3.5, acidity: 4.5, tannins: 1, body: 2.5 }
    });
  }

  // Add sparkling if no strong preferences or variety
  if (recommendations.length < 3) {
    recommendations.push({
      name: 'Champagne Brut',
      region: 'Champagne, France',
      grapeVariety: 'Chardonnay, Pinot Noir, Pinot Meunier',
      wineType: 'sparkling',
      reason: 'Versatile and celebratory with fine bubbles and complexity',
      characteristics: { sweetness: 1.5, acidity: 4, tannins: 1, body: 2.5 }
    });
  }

  // Default exploration wines for new users
  if (recommendations.length === 0) {
    recommendations.push(
      {
        name: 'Côtes du Rhône',
        region: 'Rhône Valley, France',
        grapeVariety: 'Grenache, Syrah, Mourvèdre',
        wineType: 'red',
        reason: 'A great starting point - approachable with ripe fruit and spice',
        characteristics: { sweetness: 2, acidity: 3, tannins: 3, body: 3.5 }
      },
      {
        name: 'New Zealand Sauvignon Blanc',
        region: 'Marlborough, New Zealand',
        grapeVariety: 'Sauvignon Blanc',
        wineType: 'white',
        reason: 'Vibrant and expressive - perfect for discovering white wine',
        characteristics: { sweetness: 1.5, acidity: 4, tannins: 1, body: 2.5 }
      }
    );
  }

  return recommendations.slice(0, 4); // Return top 4 recommendations
}

/**
 * Register solo tasting routes
 */
export function registerTastingsRoutes(app: Express): void {
  // Create a new tasting (authenticated)
  app.post("/api/solo/tastings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Validate input
      const parseResult = insertTastingSchema.safeParse({
        userId,
        ...req.body
      });

      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid tasting data",
          details: parseResult.error.errors
        });
      }

      const tastingData = parseResult.data;

      // Insert the tasting
      const [newTasting] = await db.insert(tastings).values({
        userId,
        wineName: tastingData.wineName,
        wineRegion: tastingData.wineRegion || null,
        wineVintage: tastingData.wineVintage || null,
        grapeVariety: tastingData.grapeVariety || null,
        wineType: tastingData.wineType || null,
        photoUrl: tastingData.photoUrl || null,
        responses: tastingData.responses
      }).returning();

      // Async: Attach wine characteristics (don't wait for it)
      attachCharacteristicsToTasting(newTasting.id).catch(err => {
        console.error("Background wine intel error:", err);
      });

      return res.status(201).json({
        tasting: newTasting,
        message: "Tasting saved successfully"
      });
    } catch (error) {
      console.error("Error saving tasting:", error);
      return res.status(500).json({ error: "Failed to save tasting" });
    }
  });

  // Get user's tastings (authenticated)
  app.get("/api/solo/tastings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const userTastings = await db
        .select()
        .from(tastings)
        .where(eq(tastings.userId, userId))
        .orderBy(desc(tastings.tastedAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tastings)
        .where(eq(tastings.userId, userId));

      const total = Number(countResult[0]?.count || 0);

      return res.json({
        tastings: userTastings,
        total,
        limit,
        offset
      });
    } catch (error) {
      console.error("Error fetching tastings:", error);
      return res.status(500).json({ error: "Failed to fetch tastings" });
    }
  });

  // Get a single tasting by ID (authenticated, must be owner)
  app.get("/api/solo/tastings/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const tastingId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (isNaN(tastingId)) {
        return res.status(400).json({ error: "Invalid tasting ID" });
      }

      const tasting = await db.query.tastings.findFirst({
        where: eq(tastings.id, tastingId)
      });

      if (!tasting) {
        return res.status(404).json({ error: "Tasting not found" });
      }

      if (tasting.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to view this tasting" });
      }

      return res.json({ tasting });
    } catch (error) {
      console.error("Error fetching tasting:", error);
      return res.status(500).json({ error: "Failed to fetch tasting" });
    }
  });

  // Delete a tasting (authenticated, must be owner)
  app.delete("/api/solo/tastings/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const tastingId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (isNaN(tastingId)) {
        return res.status(400).json({ error: "Invalid tasting ID" });
      }

      // Check ownership
      const tasting = await db.query.tastings.findFirst({
        where: eq(tastings.id, tastingId)
      });

      if (!tasting) {
        return res.status(404).json({ error: "Tasting not found" });
      }

      if (tasting.userId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this tasting" });
      }

      await db.delete(tastings).where(eq(tastings.id, tastingId));

      return res.json({ success: true, message: "Tasting deleted" });
    } catch (error) {
      console.error("Error deleting tasting:", error);
      return res.status(500).json({ error: "Failed to delete tasting" });
    }
  });

  // Get user's taste preferences (authenticated)
  app.get("/api/solo/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const prefs = await getUserPreferences(userId);
      const summary = formatPreferences(prefs);

      return res.json({
        preferences: {
          sweetness: prefs.sweetness ? Number(prefs.sweetness) : null,
          acidity: prefs.acidity ? Number(prefs.acidity) : null,
          tannins: prefs.tannins ? Number(prefs.tannins) : null,
          body: prefs.body ? Number(prefs.body) : null
        },
        tastingCount: Number(prefs.tasting_count),
        summary
      });
    } catch (error) {
      console.error("Error fetching preferences:", error);
      return res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Get wine recommendations based on user preferences (authenticated)
  app.get("/api/solo/recommendations", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const prefs = await getUserPreferences(userId);
      const recommendations = generateRecommendations(prefs);

      return res.json({
        recommendations,
        basedOnTastings: Number(prefs.tasting_count)
      });
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      return res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });
}
