/**
 * Wine Recognition Service
 * Extracts wine information from label images using GPT Vision
 */

import { openai } from "../lib/openai";

export interface RecognizedWine {
  wineName: string;
  wineRegion?: string;
  grapeVariety?: string;
  wineVintage?: number;
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | 'fortified' | 'orange';
  producer?: string;
  confidence: number;
}

export interface RecognitionResult {
  recognized: boolean;
  wine?: RecognizedWine;
  error?: string;
  message?: string;
  vintageNotFound?: boolean;
}

// Raw GPT response type
interface GPTRecognitionResponse {
  recognized?: boolean;
  wineName?: string;
  producer?: string;
  wineRegion?: string;
  grapeVariety?: string;
  wineVintage?: string | number;
  wineType?: string;
  confidence?: number;
}

const VALID_WINE_TYPES = ['red', 'white', 'rosé', 'sparkling', 'dessert', 'fortified', 'orange'] as const;

/**
 * Recognize wine from an image buffer using GPT Vision
 */
export async function recognizeWineFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  originalFilename?: string
): Promise<RecognitionResult> {
  if (!openai) {
    return {
      recognized: false,
      error: "Wine recognition is not available (OpenAI not configured)"
    };
  }

  const base64Image = imageBuffer.toString('base64');
  console.log(`[Wine Recognition] Processing image: ${originalFilename || 'unknown'} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

  const completion = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content: `You are an expert sommelier analyzing wine label images. Extract wine information from the label.

Return a JSON object with these fields:
- wineName: The COMPLETE wine name including the producer/winery. For example:
  - "Henri Bourgeois Sancerre" NOT just "Sancerre"
  - "Cloudy Bay Sauvignon Blanc" NOT just "Sauvignon Blanc"
  - "Opus One" (producer IS the wine name)
  - "Domaine de la Romanée-Conti Romanée-Conti Grand Cru"
  The format should be: "[Producer] [Wine/Cuvée Name]". Always include the producer as part of the wine name.
- producer: The winery/producer name separately (e.g., "Henri Bourgeois", "Cloudy Bay")
- wineRegion: Region/appellation (e.g., "Napa Valley", "Bordeaux", "Sancerre, Loire Valley")
- grapeVariety: Primary grape variety - IMPORTANT: Even if not explicitly on the label, use your wine knowledge to infer the grape. For example:
  - Bourgogne Blanc = Chardonnay
  - Bourgogne Rouge = Pinot Noir
  - Chablis = Chardonnay
  - Sancerre = Sauvignon Blanc
  - Barolo = Nebbiolo
  - Chianti = Sangiovese
  - Rioja = Tempranillo (typically)
- wineVintage: Year as a number. IMPORTANT: Look very carefully for the vintage year on the label — it is often printed small on the neck label, capsule, front label, or bottom of the label. Common locations:
  - Printed on the front label near the wine name
  - On the neck/capsule of the bottle
  - Small text below or above the main label
  - Embossed on the glass
  If you truly cannot find any year anywhere on the label or bottle, return null. But try hard — most wines have a vintage year somewhere.
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
    return {
      recognized: false,
      error: "No response from recognition service"
    };
  }

  const parsed = JSON.parse(response) as GPTRecognitionResponse;

  // Check if recognition failed
  if (parsed.recognized === false || (parsed.confidence ?? 0) < 0.3) {
    return {
      recognized: false,
      error: "Could not recognize wine from image"
    };
  }

  // Build the wine name, ensuring producer is included
  let wineName = parsed.wineName || 'Unknown Wine';
  const producer = parsed.producer || undefined;

  // If the GPT returned producer separately and it's not already in the wine name, prepend it
  if (producer && wineName !== producer && !wineName.toLowerCase().includes(producer.toLowerCase())) {
    wineName = `${producer} ${wineName}`;
  }
  // If wineName is missing but producer exists, use producer
  if (wineName === 'Unknown Wine' && producer) {
    wineName = producer;
  }

  const vintageRaw = parsed.wineVintage ? parseInt(String(parsed.wineVintage)) : undefined;
  const vintageNotFound = !vintageRaw;

  // Build recognized wine object
  const wine: RecognizedWine = {
    wineName,
    wineRegion: parsed.wineRegion || undefined,
    grapeVariety: parsed.grapeVariety || undefined,
    wineVintage: vintageRaw,
    wineType: VALID_WINE_TYPES.includes(parsed.wineType as typeof VALID_WINE_TYPES[number])
      ? (parsed.wineType as RecognizedWine['wineType'])
      : undefined,
    producer,
    confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5))
  };

  console.log(`[Wine Recognition] Recognized: ${wine.wineName} (confidence: ${wine.confidence})`);

  return {
    recognized: true,
    wine,
    vintageNotFound,
    message: wine.confidence > 0.7
      ? "Wine recognized successfully"
      : "Wine recognized with low confidence - please verify details"
  };
}

/**
 * Check if wine recognition service is available
 */
export function isRecognitionAvailable(): boolean {
  return !!openai;
}
