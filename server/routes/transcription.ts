import type { Express, Request, Response } from "express";
import { requireAuth } from "./auth";
import { transcriptionRateLimit } from "../middleware/rateLimiter";
import OpenAI from "openai";
import multer from "multer";

// Configure multer for audio uploads
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max (Whisper limit)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3',
      'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/flac'
    ];
    if (allowedTypes.some(type => file.mimetype.startsWith(type.split('/')[0]))) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Register transcription routes
 */
export function registerTranscriptionRoutes(app: Express): void {

  /**
   * Transcribe audio to text using Whisper
   * POST /api/transcribe
   * Rate limited: 5 requests per minute per user
   */
  app.post("/api/transcribe", requireAuth, transcriptionRateLimit, audioUpload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!openai) {
        return res.status(503).json({
          success: false,
          error: "Transcription is not available (OpenAI not configured)"
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No audio file provided"
        });
      }

      console.log(`[Transcription] Processing audio: ${file.originalname || 'recording'} (${(file.size / 1024).toFixed(1)}KB, ${file.mimetype})`);

      // Create a File object from the buffer for Whisper API
      const audioFile = new File([file.buffer], file.originalname || 'recording.webm', {
        type: file.mimetype
      });

      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en", // Can make this configurable if needed
        response_format: "text"
      });

      console.log(`[Transcription] Success: "${transcription.substring(0, 50)}${transcription.length > 50 ? '...' : ''}"`);

      return res.json({
        success: true,
        text: transcription.trim()
      });

    } catch (error) {
      console.error('[Transcription] Error:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: `Transcription failed: ${error.message}`
        });
      }

      return res.status(500).json({
        success: false,
        error: "Transcription failed"
      });
    }
  });
}
