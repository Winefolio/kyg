import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSessionSchema,
  insertParticipantSchema,
  insertResponseSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate package code
  app.get("/api/packages/:code", async (req, res) => {
    try {
      const { code } = req.params;
      console.log(`Looking for package with code: ${code}`);
      const pkg = await storage.getPackageByCode(code.toUpperCase());
      
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      res.json(pkg);
    } catch (error) {
      console.error("Error fetching package:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get slides for a package
  app.get("/api/packages/:code/slides", async (req, res) => {
    try {
      const { code } = req.params;
      const { participantId } = req.query;
      
      const pkg = await storage.getPackageByCode(code.toUpperCase());
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      // Check if participant is host
      let isHost = false;
      if (participantId) {
        const participant = await storage.getParticipantById(participantId as string);
        isHost = participant?.isHost || false;
      }

      const slides = await storage.getSlidesByPackageId(pkg.id, isHost);
      res.json({ slides, totalCount: slides.length });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create session
  app.post("/api/sessions", async (req, res) => {
    try {
      const { packageCode } = req.body;
      
      const pkg = await storage.getPackageByCode(packageCode.toUpperCase());
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      const session = await storage.createSession({
        packageId: pkg.id,
        completedAt: null,
        activeParticipants: 0
      });

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Join session as participant
  app.post("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const validatedData = insertParticipantSchema.parse({
        ...req.body,
        sessionId
      });

      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const participant = await storage.createParticipant(validatedData);
      
      // Update participant count
      const participants = await storage.getParticipantsBySessionId(sessionId);
      await storage.updateSessionParticipantCount(sessionId, participants.length);

      res.json(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get session participants
  app.get("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const participants = await storage.getParticipantsBySessionId(sessionId);
      res.json(participants);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Save response
  app.post("/api/responses", async (req, res) => {
    try {
      const validatedData = insertResponseSchema.parse(req.body);
      const response = await storage.createResponse(validatedData);
      
      // Update participant progress
      const participant = await storage.getParticipantById(validatedData.participantId!);
      if (participant) {
        await storage.updateParticipantProgress(
          participant.id, 
          participant.progressPtr! + 1
        );
      }

      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update response
  app.put("/api/responses/:participantId/:slideId", async (req, res) => {
    try {
      const { participantId, slideId } = req.params;
      const { answerJson } = req.body;

      const response = await storage.updateResponse(participantId, slideId, answerJson);
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get participant responses
  app.get("/api/participants/:participantId/responses", async (req, res) => {
    try {
      const { participantId } = req.params;
      const responses = await storage.getResponsesByParticipantId(participantId);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get slide responses (for host)
  app.get("/api/slides/:slideId/responses", async (req, res) => {
    try {
      const { slideId } = req.params;
      const responses = await storage.getResponsesBySlideId(slideId);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
