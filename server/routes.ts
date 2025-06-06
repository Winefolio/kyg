import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSessionSchema,
  insertParticipantSchema,
  insertResponseSchema,
  type InsertSession
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

  // Get slides for a package (now organized by wines)
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

      // Get all wines for this package
      const wines = await storage.getPackageWines(pkg.id);
      let allSlides: any[] = [];

      // Get slides for each wine and combine them
      for (const wine of wines) {
        const wineSlides = await storage.getSlidesByPackageWineId(wine.id);
        // Add wine context to each slide
        const slidesWithWineContext = wineSlides.map(slide => ({
          ...slide,
          wineInfo: {
            id: wine.id,
            wineName: wine.wineName,
            wineDescription: wine.wineDescription,
            wineImageUrl: wine.wineImageUrl,
            position: wine.position
          }
        }));
        allSlides = allSlides.concat(slidesWithWineContext);
      }

      // Filter host-only slides if not host
      if (!isHost) {
        allSlides = allSlides.filter((slide) => {
          const payload = slide.payloadJson as any;
          return !payload.for_host;
        });
      }

      res.json({ slides: allSlides, totalCount: allSlides.length, wines });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create session (with optional host participant)
  app.post("/api/sessions", async (req, res) => {
    try {
      const { packageId, packageCode, name, hostName, hostDisplayName, hostEmail, createHost } = req.body;
      
      let pkg;
      if (packageId) {
        // Find package by ID (for existing packages)
        const packages = Array.from((storage as any).packages.values());
        pkg = packages.find((p: any) => p.id === packageId);
      } else if (packageCode) {
        // Find package by code
        pkg = await storage.getPackageByCode(packageCode.toUpperCase());
      }
      
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      // Create the session
      const sessionInputData: InsertSession = {
        packageId: (pkg as any).id,
        completedAt: null,
        activeParticipants: 0
      };

      if (createHost) {
        sessionInputData.status = 'active'; // Set session to active if a host is being created
      }

      const session = await storage.createSession(sessionInputData);

      // If createHost is true, also create the host participant
      let hostParticipant = null;
      if (createHost) {
        const hostParticipantData = insertParticipantSchema.parse({
          sessionId: session.id,
          displayName: hostDisplayName || hostName || 'Host',
          email: hostEmail || '',
          isHost: true,
          progress: 0
        });

        hostParticipant = await storage.createParticipant(hostParticipantData);
        
        if (!hostParticipant) {
          return res.status(500).json({ message: "Failed to create host participant for the new session" });
        }
        
        // Update session participant count
        await storage.updateSessionParticipantCount(session.id, 1);
      }

      // Return both session and host participant info
      res.json({
        session,
        hostParticipantId: hostParticipant?.id || null
      });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Join session as participant
  app.post("/api/sessions/:sessionIdOrShortCode/participants", async (req, res) => {
    try {
      const { sessionIdOrShortCode } = req.params; // This can be either UUID or short_code

      // 1. Fetch the session using the provided identifier
      // storage.getSessionById handles both UUIDs and short_codes
      const session = await storage.getSessionById(sessionIdOrShortCode);
      if (!session) {
        console.log(`[JOIN_ATTEMPT_FAIL] Session not found with identifier: ${sessionIdOrShortCode}`);
        return res.status(404).json({ message: "Session not found" });
      }

      // 2. Check session status
      if (session.status !== 'active') {
        console.log(`[JOIN_ATTEMPT_FAIL] Attempt to join inactive session ${session.id} (status: ${session.status}). Identifier used: ${sessionIdOrShortCode}`);
        return res.status(400).json({ message: "Session is not active. Please check with the host." });
      }

      // 3. Parse participant data from request body
      // Omit sessionId from initial parsing since we'll set it correctly
      const participantInputData = insertParticipantSchema
        .omit({ sessionId: true })
        .parse(req.body);

      // 4. Verify active host using the actual session UUID
      const currentParticipants = await storage.getParticipantsBySessionId(session.id);
      const hasActiveHost = currentParticipants.some(p => p.isHost);
      
      if (!hasActiveHost) {
        console.log(`[JOIN_ATTEMPT_FAIL] Session ${session.id} has no active host. Identifier used: ${sessionIdOrShortCode}`);
        return res.status(400).json({ message: "Session does not have an active host. Please contact the session organizer." });
      }

      // 5. Create the participant using the actual session UUID
      const newParticipant = await storage.createParticipant({
        ...participantInputData,
        sessionId: session.id  // CRITICAL FIX: Use actual session UUID, not short code
      });

      // 6. Update participant count using the actual session UUID
      const updatedParticipantsList = await storage.getParticipantsBySessionId(session.id);
      await storage.updateSessionParticipantCount(session.id, updatedParticipantsList.length);

      console.log(`[JOIN_SUCCESS] Participant ${newParticipant.displayName} (ID: ${newParticipant.id}) joined session ${session.id} (Short Code: ${session.short_code || 'N/A'})`);
      res.json(newParticipant);

    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[JOIN_ERROR] Validation error for participant data:", error.errors);
        return res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      }

      // Log the full error for debugging
      console.error(`[JOIN_ERROR] Critical error in /api/sessions/${req.params.sessionIdOrShortCode}/participants:`, error);
      
      // Handle specific database errors
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '22P02' || dbError.code === '23503') {
          console.error("[JOIN_ERROR_DB] Database type or constraint violation:", dbError.detail || dbError.message);
          return res.status(500).json({ message: "Database error: Could not correctly link participant to session due to data mismatch." });
        }
      }
      
      res.status(500).json({ message: "Internal server error while attempting to join session." });
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

  // Update session status
  app.patch("/api/sessions/:sessionId/status", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { status } = req.body;
      
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Invalid status provided in request body." });
      }

      const updatedSession = await storage.updateSessionStatus(sessionId, status);
      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found or failed to update." });
      }
      
      res.json(updatedSession);
    } catch (error: any) {
      console.error(`Error updating session ${req.params.sessionId} status:`, error);
      if (error.message?.includes('Invalid session status')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Internal server error updating session status." });
    }
  });

  // Save response
  app.post("/api/responses", async (req, res) => {
    try {
      const validatedData = insertResponseSchema.parse(req.body);
      
      // First check if participant exists
      const participant = await storage.getParticipantById(validatedData.participantId!);
      if (!participant) {
        console.log(`Participant ${validatedData.participantId} not found - likely from stale offline sync`);
        return res.status(404).json({ message: "Participant not found" });
      }
      
      // Try to update existing response first, create if it doesn't exist
      const response = await storage.updateResponse(
        validatedData.participantId!,
        validatedData.slideId!,
        validatedData.answerJson
      );
      
      // Update participant progress and lastActive
      const currentSlide = await storage.getSlideById(validatedData.slideId!);
      if (currentSlide) {
        const currentProgress = participant.progressPtr || 0;
        
        // Only update progress if the current slide's position is further than current progress
        if (currentSlide.position > currentProgress) {
          await storage.updateParticipantProgress(
            participant.id,
            currentSlide.position
          );
          console.log(`Updated progress for participant ${participant.id} to slide position ${currentSlide.position}`);
        } else {
          // If re-answering a previous slide, still update lastActive but maintain current progress
          await storage.updateParticipantProgress(
            participant.id,
            currentProgress
          );
          console.log(`Participant ${participant.id} re-answered slide or answered out of order. Progress pointer maintained at ${currentProgress}. Last active updated.`);
        }
      }
      
      res.json(response);
    } catch (error: any) {
      console.log("POST /api/responses - Request body:", req.body);
      console.log("POST /api/responses - Error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      // Handle participant not found errors specifically
      if (error.message === 'Participant not found') {
        return res.status(404).json({ message: "Participant not found" });
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

  // Get session by ID
  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get participants for a session
  app.get("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const participants = await storage.getParticipantsBySessionId(sessionId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get aggregated analytics for a session
  app.get("/api/sessions/:sessionId/analytics", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const analyticsData = await storage.getAggregatedSessionAnalytics(sessionId);
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching session analytics:", error);
      if (error instanceof Error && error.message === 'Session not found') {
        return res.status(404).json({ message: "Session not found" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get participant by ID
  app.get("/api/participants/:participantId", async (req, res) => {
    try {
      const { participantId } = req.params;
      const participant = await storage.getParticipantById(participantId);
      
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }

      res.json(participant);
    } catch (error) {
      console.error("Error fetching participant:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get glossary terms
  app.get("/api/glossary", async (_req, res) => {
    try {
      const terms = await storage.getGlossaryTerms();
      res.json(terms);
    } catch (error) {
      console.error("Error fetching glossary:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create package with custom code
  app.post("/api/packages", async (req, res) => {
    try {
      const { code, name, description } = req.body;
      
      // Check if code already exists
      const existing = await storage.getPackageByCode(code.toUpperCase());
      if (existing) {
        return res.status(409).json({ message: "Package code already exists" });
      }

      const pkg = await storage.createPackage({
        code: code.toUpperCase(),
        name,
        description
      });

      res.json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  // Profile endpoints
  app.get("/api/profile", async (req, res) => {
    try {
      // For now, return mock profile data - in production this would use authentication
      const mockProfile = {
        id: "user-123",
        email: "wine.lover@example.com",
        displayName: "Wine Enthusiast",
        tastingSessions: [],
        totalSessions: 0,
        completedSessions: 0
      };
      
      res.json(mockProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/profile/recent-session", async (req, res) => {
    try {
      // Return the most recent completed session if any
      res.json(null); // No recent session for now
    } catch (error) {
      console.error("Error fetching recent session:", error);
      res.status(500).json({ message: "Failed to fetch recent session" });
    }
  });

  // Package management endpoints for sommelier dashboard
  app.get("/api/packages", async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.post("/api/packages", async (req, res) => {
    try {
      const packageData = req.body;
      const newPackage = await storage.createPackage(packageData);
      res.json(newPackage);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  app.patch("/api/packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedPackage = await storage.updatePackage(id, updateData);
      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  app.delete("/api/packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePackage(id);
      res.json({ message: "Package deleted successfully" });
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Wine management endpoints for packages
  app.get("/api/packages/:packageId/wines", async (req, res) => {
    try {
      const { packageId } = req.params;
      const wines = await storage.getPackageWines(packageId);
      res.json(wines);
    } catch (error) {
      console.error("Error fetching wines:", error);
      res.status(500).json({ message: "Failed to fetch wines" });
    }
  });

  app.post("/api/packages/:packageId/wines", async (req, res) => {
    try {
      const { packageId } = req.params;
      const wineData = { ...req.body, packageId };
      const newWine = await storage.createPackageWineFromDashboard(wineData);
      res.json(newWine);
    } catch (error) {
      console.error("Error creating wine:", error);
      res.status(500).json({ message: "Failed to create wine" });
    }
  });

  app.patch("/api/packages/:packageId/wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedWine = await storage.updatePackageWine(id, updateData);
      res.json(updatedWine);
    } catch (error) {
      console.error("Error updating wine:", error);
      res.status(500).json({ message: "Failed to update wine" });
    }
  });

  app.delete("/api/packages/:packageId/wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePackageWine(id);
      res.json({ message: "Wine deleted successfully" });
    } catch (error) {
      console.error("Error deleting wine:", error);
      res.status(500).json({ message: "Failed to delete wine" });
    }
  });

  // Slides management endpoints
  app.get("/api/packages/:packageId/wines/:wineId/slides", async (req, res) => {
    try {
      const { wineId } = req.params;
      const slides = await storage.getSlidesByPackageWineId(wineId);
      res.json(slides);
    } catch (error) {
      console.error("Error fetching slides:", error);
      res.status(500).json({ message: "Failed to fetch slides" });
    }
  });

  app.post("/api/packages/:packageId/wines/:wineId/slides", async (req, res) => {
    try {
      const { wineId } = req.params;
      const slideData = { ...req.body, packageWineId: wineId };
      const newSlide = await storage.createSlide(slideData);
      res.json(newSlide);
    } catch (error) {
      console.error("Error creating slide:", error);
      res.status(500).json({ message: "Failed to create slide" });
    }
  });

  // Legacy wine management endpoints for backward compatibility
  app.post("/api/package-wines", async (req, res) => {
    try {
      const wineData = req.body;
      const newWine = await storage.createPackageWineFromDashboard(wineData);
      res.json(newWine);
    } catch (error) {
      console.error("Error creating wine:", error);
      res.status(500).json({ message: "Failed to create wine" });
    }
  });

  app.patch("/api/package-wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedWine = await storage.updatePackageWine(id, updateData);
      res.json(updatedWine);
    } catch (error) {
      console.error("Error updating wine:", error);
      res.status(500).json({ message: "Failed to update wine" });
    }
  });

  app.delete("/api/package-wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePackageWine(id);
      res.json({ message: "Wine deleted successfully" });
    } catch (error) {
      console.error("Error deleting wine:", error);
      res.status(500).json({ message: "Failed to delete wine" });
    }
  });

  // Enhanced analytics endpoint
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      const sessions = await storage.getAllSessions();
      
      // Calculate comprehensive analytics
      const totalPackages = packages.length;
      const activePackages = packages.filter(p => p.isActive).length;
      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === 'active').length;
      
      // Get total participants across all sessions
      let totalParticipants = 0;
      for (const session of sessions) {
        const participants = await storage.getParticipantsBySessionId(session.id);
        totalParticipants += participants.length;
      }

      // Package usage analytics
      const packageUsage = await Promise.all(
        packages.map(async (pkg) => {
          const packageSessions = sessions.filter(s => s.packageId === pkg.id);
          let packageParticipants = 0;
          for (const session of packageSessions) {
            const participants = await storage.getParticipantsBySessionId(session.id);
            packageParticipants += participants.length;
          }
          return {
            packageId: pkg.id,
            packageName: pkg.name,
            packageCode: pkg.code,
            sessionsCount: packageSessions.length,
            participantsCount: packageParticipants,
            isActive: pkg.isActive
          };
        })
      );

      const analytics = {
        overview: {
          totalPackages,
          activePackages,
          totalSessions,
          activeSessions,
          totalParticipants
        },
        packageUsage,
        recentActivity: sessions.slice(-5).map(s => ({
          sessionId: s.id,
          packageCode: packages.find(p => p.id === s.packageId)?.code || '',
          status: s.status,
          createdAt: s.startedAt || new Date()
        }))
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
