/**
 * Sommelier Chat Routes
 * API endpoints for AI sommelier chat with SSE streaming and vision support.
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "./auth";
import { apiRateLimit, createRateLimit } from "../middleware/rateLimiter";
import { storage } from "../storage";
import { getOrCreateActiveChat, streamChatResponse } from "../services/sommelierChatService";

// Rate limit for chat messages: 15/min
const sommelierChatRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: "Slow down! Wait a moment before sending more messages.",
});

// Multer for image uploads (memory storage, max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export function registerSommelierChatRoutes(app: Express): void {
  /**
   * GET /api/sommelier-chat/active
   * Get or create the active chat + last 20 messages
   */
  app.get("/api/sommelier-chat/active", requireAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const chat = await getOrCreateActiveChat(userId);
      const messages = await storage.getSommelierChatMessages(chat.id, 20);

      return res.json({ chat, messages });
    } catch (error) {
      console.error("[SommelierChat] Error getting active chat:", error);
      return res.status(500).json({ error: "Failed to load chat" });
    }
  });

  /**
   * POST /api/sommelier-chat/message
   * Send a text message, returns SSE stream
   */
  app.post("/api/sommelier-chat/message", requireAuth, sommelierChatRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const userEmail = req.session.userEmail!;
      const { message } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (message.length > 2000) {
        return res.status(400).json({ error: "Message is too long (max 2000 characters)" });
      }

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const { stream } = await streamChatResponse(userId, userEmail, message.trim());

      for await (const event of stream) {
        res.write(event);
      }

      res.end();
    } catch (error) {
      console.error("[SommelierChat] Error sending message:", error);
      // If headers already sent, send error via SSE
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong. Try again." })}\n\n`);
        res.end();
      } else {
        return res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  /**
   * POST /api/sommelier-chat/message-with-image
   * Send a text message with an image, returns SSE stream
   */
  app.post("/api/sommelier-chat/message-with-image", requireAuth, sommelierChatRateLimit, upload.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const userEmail = req.session.userEmail!;
      const message = req.body.message || "What can you tell me about these wines?";

      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      const imageBase64 = req.file.buffer.toString("base64");
      const imageMimeType = req.file.mimetype;

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const { stream } = await streamChatResponse(
        userId,
        userEmail,
        message.trim(),
        imageBase64,
        imageMimeType
      );

      for await (const event of stream) {
        res.write(event);
      }

      res.end();
    } catch (error) {
      console.error("[SommelierChat] Error sending message with image:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong. Try again." })}\n\n`);
        res.end();
      } else {
        return res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  /**
   * POST /api/sommelier-chat/new
   * Archive current chat, start a new one
   */
  app.post("/api/sommelier-chat/new", requireAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      // Archive existing chat if any
      const existing = await storage.getActiveSommelierChat(userId);
      if (existing) {
        await storage.archiveSommelierChat(existing.id);
      }

      // Create new chat
      const newChat = await storage.createSommelierChat({
        userId,
        title: null,
        summary: null,
        messageCount: 0,
      });

      return res.json({ chat: newChat, messages: [] });
    } catch (error) {
      console.error("[SommelierChat] Error creating new chat:", error);
      return res.status(500).json({ error: "Failed to create new chat" });
    }
  });
}
