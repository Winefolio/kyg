import type { Express, Request, Response } from "express";
import { requireAuth } from "./auth";
import { getWineCharacteristics, isWineIntelligenceAvailable } from "../wine-intelligence";
import OpenAI from "openai";
import multer from "multer";

// Configure multer for file uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface RecognizedWine {
  wineName: string;
  wineRegion?: string;
  grapeVariety?: string;
  wineVintage?: number;
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'orange';
  producer?: string;
  confidence: number;
}

/**
 * Register wine-related routes
 */
export function registerWinesRoutes(app: Express): void {

  /**
   * Recognize wine from photo using GPT-4 Vision
   * POST /api/solo/wines/recognize
   */
  app.post("/api/solo/wines/recognize", requireAuth, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!openai) {
        return res.status(503).json({
          recognized: false,
          error: "Wine recognition is not available (OpenAI not configured)"
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          recognized: false,
          error: "No image provided"
        });
      }

      // Convert to base64
      const base64Image = file.buffer.toString('base64');
      const mimeType = file.mimetype;

      console.log(`[Wine Recognition] Processing image: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);

      // Call GPT-4 Vision
      const completion = await openai.chat.completions.create({
        model: 'gpt-5.2', // Using GPT-5.2 for best accuracy in wine recognition
        messages: [
          {
            role: 'system',
            content: `You are an expert sommelier analyzing wine label images. Extract wine information from the label.

Return a JSON object with these fields:
- wineName: Full wine name as it appears on the label
- producer: The winery/producer name
- wineRegion: Region/appellation (e.g., "Napa Valley", "Bordeaux", "Barossa Valley")
- grapeVariety: Primary grape variety - IMPORTANT: Even if not explicitly on the label, use your wine knowledge to infer the grape. For example:
  - Bourgogne Blanc = Chardonnay
  - Bourgogne Rouge = Pinot Noir
  - Chablis = Chardonnay
  - Sancerre = Sauvignon Blanc
  - Barolo = Nebbiolo
  - Chianti = Sangiovese
  - Rioja = Tempranillo (typically)
- wineVintage: Year as a number (null if non-vintage or not visible)
- wineType: One of: red, white, rosé, sparkling, dessert, fortified, orange
- confidence: Your confidence level 0-1 (1 = very confident)

If you cannot read the label clearly or it's not a wine label, return:
{ "recognized": false, "confidence": 0 }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              },
              {
                type: 'text',
                text: 'Please analyze this wine label and extract the wine information.'
              }
            ]
          }
        ],
        max_completion_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        return res.json({
          recognized: false,
          error: "No response from recognition service"
        });
      }

      const parsed = JSON.parse(response);

      // Check if recognition failed
      if (parsed.recognized === false || parsed.confidence < 0.3) {
        return res.json({
          recognized: false,
          error: "Could not recognize wine from image"
        });
      }

      // Build recognized wine object
      const wine: RecognizedWine = {
        wineName: parsed.wineName || parsed.producer || 'Unknown Wine',
        wineRegion: parsed.wineRegion || undefined,
        grapeVariety: parsed.grapeVariety || undefined,
        wineVintage: parsed.wineVintage ? parseInt(parsed.wineVintage) : undefined,
        wineType: ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange'].includes(parsed.wineType)
          ? parsed.wineType
          : undefined,
        producer: parsed.producer || undefined,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5))
      };

      console.log(`[Wine Recognition] Recognized: ${wine.wineName} (confidence: ${wine.confidence})`);

      return res.json({
        recognized: true,
        wine,
        message: wine.confidence > 0.7
          ? "Wine recognized successfully"
          : "Wine recognized with low confidence - please verify details"
      });

    } catch (error) {
      console.error("[Wine Recognition] Error:", error);
      return res.json({
        recognized: false,
        error: "Failed to process image"
      });
    }
  });

  /**
   * Get wine characteristics (typical profile for this wine)
   * POST /api/solo/wines/characteristics
   */
  app.post("/api/solo/wines/characteristics", requireAuth, async (req: Request, res: Response) => {
    try {
      const { wineName, wineRegion, grapeVariety, wineType } = req.body;

      if (!wineName) {
        return res.status(400).json({ error: "Wine name is required" });
      }

      if (!isWineIntelligenceAvailable()) {
        return res.status(503).json({
          error: "Wine intelligence is not available (OpenAI not configured)"
        });
      }

      const characteristics = await getWineCharacteristics(
        wineName,
        wineRegion,
        grapeVariety,
        wineType
      );

      if (!characteristics) {
        return res.json({
          found: false,
          message: "Could not determine characteristics for this wine"
        });
      }

      return res.json({
        found: true,
        characteristics,
        message: characteristics.source === 'cache'
          ? "Retrieved from cache"
          : "Fetched wine profile"
      });

    } catch (error) {
      console.error("[Wine Characteristics] Error:", error);
      return res.status(500).json({ error: "Failed to get wine characteristics" });
    }
  });

  /**
   * Check wine intelligence availability
   * GET /api/solo/wines/status
   */
  app.get("/api/solo/wines/status", async (req: Request, res: Response) => {
    return res.json({
      recognitionAvailable: !!openai,
      characteristicsAvailable: isWineIntelligenceAvailable()
    });
  });
}
