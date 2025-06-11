import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { uploadMediaFile, deleteMediaFile, getMediaType, isSupabaseConfigured } from "./supabase-storage";
import { 
  insertSessionSchema,
  insertParticipantSchema,
  insertResponseSchema,
  insertSlideSchema,
  insertPackageWineSchema,
  type InsertSession
} from "@shared/schema";
import { z } from "zod";
import { reorderSlidesForWine } from './slide-reorder-fix';

// Configure multer for file uploads with comprehensive image support
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Support all major image formats
    const allowedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'image/bmp', 'image/tiff', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif'
    ];
    
    // For image uploads, check size limit (10MB)
    if (file.mimetype.startsWith('image/')) {
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported image format: ${file.mimetype}`));
      }
    } else {
      // For other media types, use existing logic
      cb(null, true);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log("🚀 Starting route registration...");
  
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

      // Check if this request is from a session that has wine selections
      let wines = await storage.getPackageWines(pkg.id);
      if (participantId) {
        const participant = await storage.getParticipantById(participantId as string);
        if (participant?.sessionId) {
          // Check if this session has custom wine selections
          const sessionWineSelections = await storage.getSessionWineSelections(participant.sessionId);
          if (sessionWineSelections.length > 0) {
            // Use session-specific wine selections, ordered by host preference
            wines = sessionWineSelections
              .filter(selection => selection.isIncluded)
              .sort((a, b) => a.position - b.position)
              .map(selection => selection.wine);
          }
        }
      }

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

      res.json({ package: pkg, slides: allSlides, totalCount: allSlides.length, wines });
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

  // Get session by package code
  app.get("/api/sessions/by-package/:packageCode", async (req, res) => {
    try {
      const { packageCode } = req.params;
      
      // Find package by code
      const pkg = await storage.getPackageByCode(packageCode.toUpperCase());
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }

      // Find the most recent active session for this package
      const allSessions = await storage.getAllSessions();
      const packageSessions = allSessions.filter(session => session.packageId === pkg.id);
      
      if (packageSessions.length === 0) {
        return res.status(404).json({ message: "No sessions found for this package" });
      }

      // Return the most recent session (you could also filter by status if needed)
      const latestSession = packageSessions.sort((a, b) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      )[0];

      // Add package code to the response
      const sessionWithPackageCode = {
        ...latestSession,
        packageCode: pkg.code
      };

      res.json(sessionWithPackageCode);
    } catch (error) {
      console.error("Error getting session by package code:", error);
      res.status(500).json({ message: "Internal server error" });
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

  // Package wines endpoint for wine selection
  app.get("/api/packages/:packageId/wines", async (req, res) => {
    try {
      const { packageId } = req.params;
      const wines = await storage.getPackageWines(packageId);
      res.json(wines);
    } catch (error) {
      console.error("Error fetching package wines:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Session Wine Selection Routes
  app.get("/api/sessions/:sessionId/wine-selections", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const selections = await storage.getSessionWineSelections(sessionId);
      res.json(selections);
    } catch (error) {
      console.error("Error fetching session wine selections:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/sessions/:sessionId/wine-selections", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { selections } = req.body;
      
      const savedSelections = await storage.createSessionWineSelections(sessionId, selections);
      res.json(savedSelections);
    } catch (error) {
      console.error("Error creating session wine selections:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/sessions/:sessionId/wine-selections", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { selections } = req.body;
      
      const updatedSelections = await storage.updateSessionWineSelections(sessionId, selections);
      res.json(updatedSelections);
    } catch (error) {
      console.error("Error updating session wine selections:", error);
      res.status(500).json({ message: "Internal server error" });
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

  // Get participant-specific analytics for completion experience
  app.get("/api/sessions/:sessionId/participant-analytics/:participantId", async (req, res) => {
    try {
      const { sessionId, participantId } = req.params;
      const participantAnalytics = await storage.getParticipantAnalytics(sessionId, participantId);
      res.json(participantAnalytics);
    } catch (error) {
      console.error("Error fetching participant analytics:", error);
      if (error instanceof Error && error.message === 'Session not found') {
        return res.status(404).json({ message: "Session not found" });
      }
      if (error instanceof Error && error.message === 'Participant not found') {
        return res.status(404).json({ message: "Participant not found" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export session analytics as CSV
  app.get("/api/sessions/:sessionId/export/csv", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get analytics data
      const analyticsData = await storage.getAggregatedSessionAnalytics(sessionId);
      
      // Get all responses for detailed export
      const responses = await storage.getSessionResponses(sessionId);
      
      // Build CSV content
      let csv = 'Session Analytics Export\n';
      csv += `Session ID:,${analyticsData.sessionId}\n`;
      csv += `Session Name:,${analyticsData.sessionName}\n`;
      csv += `Package:,${analyticsData.packageName}\n`;
      csv += `Total Participants:,${analyticsData.totalParticipants}\n`;
      csv += `Completed Participants:,${analyticsData.completedParticipants}\n`;
      csv += `Average Progress:,${analyticsData.averageProgressPercent}%\n`;
      csv += '\n';
      
      // Question-by-question breakdown
      csv += 'Question Analytics\n';
      csv += 'Position,Title,Type,Total Responses,Details\n';
      
      for (const slide of analyticsData.slidesAnalytics) {
        csv += `${slide.slidePosition},"${slide.slideTitle.replace(/"/g, '""')}",${slide.questionType || 'N/A'},${slide.totalResponses},`;
        
        if (slide.questionType === 'multiple_choice' && slide.aggregatedData.optionsSummary) {
          // Format multiple choice options
          const optionsText = slide.aggregatedData.optionsSummary
            .map(opt => `${opt.optionText}: ${opt.count} (${opt.percentage}%)`)
            .join(' | ');
          csv += `"${optionsText.replace(/"/g, '""')}"\n`;
          
          if (slide.aggregatedData.notesSubmittedCount) {
            csv += `,,,,"Notes submitted: ${slide.aggregatedData.notesSubmittedCount}"\n`;
          }
        } else if (slide.questionType === 'scale' && slide.aggregatedData.averageScore !== undefined) {
          csv += `"Average: ${slide.aggregatedData.averageScore}, Range: ${slide.aggregatedData.minScore}-${slide.aggregatedData.maxScore}"\n`;
        } else {
          csv += '"No response data"\n';
        }
      }
      
      csv += '\n';
      
      // Detailed responses section
      csv += 'Detailed Participant Responses\n';
      csv += 'Participant,Email,Question,Answer,Notes,Timestamp\n';
      
      for (const response of responses) {
        const answer = response.responseType === 'scale' 
          ? response.scaleValue?.toString() || 'N/A'
          : response.selectedOptionText || 'N/A';
        
        csv += `"${response.participantName.replace(/"/g, '""')}",`;
        csv += `"${(response.participantEmail || 'N/A').replace(/"/g, '""')}",`;
        csv += `"${response.slideTitle.replace(/"/g, '""')}",`;
        csv += `"${answer.replace(/"/g, '""')}",`;
        csv += `"${(response.notes || '').replace(/"/g, '""')}",`;
        csv += `"${new Date(response.answeredAt).toLocaleString()}"\n`;
      }
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="wine-tasting-session-${sessionId}-analytics.csv"`);
      res.send(csv);
      
    } catch (error) {
      console.error("Error exporting session analytics:", error);
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

  app.get("/api/wine-characteristics", async (_req, res) => {
    try {
      const characteristics = await storage.getWineCharacteristics();
      res.json(characteristics);
    } catch (error) {
      console.error("Error fetching wine characteristics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create package with server-generated code
  app.post("/api/packages", async (req, res) => {
    try {
      const { name, description, imageUrl } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Package name is required" });
      }

      // Generate a unique code on the server
      const uniqueCode = await storage.generateUniqueShortCode(6);

      const pkg = await storage.createPackage({
        code: uniqueCode,
        name,
        description,
        imageUrl: imageUrl || "", // Include image URL if provided
      });

      res.status(201).json(pkg); // Use 201 Created for successful creation
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

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

  // Slide templates endpoint
  app.get("/api/slide-templates", async (req, res) => {
    try {
      // Return slide templates from our predefined list
      const slideTemplates = [
        { id: 'visual-assessment', name: 'Visual Assessment', type: 'question', sectionType: 'intro' },
        { id: 'aroma-intensity', name: 'Aroma Intensity', type: 'question', sectionType: 'deep_dive' },
        { id: 'tasting-notes', name: 'Tasting Notes', type: 'question', sectionType: 'deep_dive' },
        { id: 'body-assessment', name: 'Body Assessment', type: 'question', sectionType: 'deep_dive' },
        { id: 'tannin-level', name: 'Tannin Level', type: 'question', sectionType: 'deep_dive' },
        { id: 'acidity-level', name: 'Acidity Level', type: 'question', sectionType: 'deep_dive' },
        { id: 'finish-length', name: 'Finish Length', type: 'question', sectionType: 'ending' },
        { id: 'overall-impression', name: 'Overall Impression', type: 'question', sectionType: 'ending' }
      ];
      res.json(slideTemplates);
    } catch (error) {
      console.error("Error fetching slide templates:", error);
      res.status(500).json({ message: "Failed to fetch slide templates" });
    }
  });

  // Duplicate slides from one wine to another
  app.post("/api/wines/:wineId/duplicate-slides", async (req: Request, res: Response) => {
    try {
      const { wineId } = req.params;
      const { targetWineId, replaceExisting } = req.body;

      if (!targetWineId) {
        return res.status(400).json({ error: "Target wine ID is required" });
      }

      if (wineId === targetWineId) {
        return res.status(400).json({ error: "Source and target wines cannot be the same" });
      }

      const result = await storage.duplicateWineSlides(
        wineId, 
        targetWineId, 
        replaceExisting || false
      );

      res.json({
        success: true,
        duplicatedCount: result.count,
        targetWineId,
        message: `Successfully duplicated ${result.count} slides`
      });
    } catch (error) {
      console.error("Error duplicating wine slides:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to duplicate slides" 
      });
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

  app.get("/api/sessions/:sessionId/participants", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const participants = await storage.getParticipantsBySessionId(sessionId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching session participants:", error);
      res.status(500).json({ message: "Failed to fetch session participants" });
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

  // Direct slide management endpoints for slide editor
  app.get("/api/slides/:packageWineId", async (req, res) => {
    try {
      const { packageWineId } = req.params;
      const slides = await storage.getSlidesByPackageWineId(packageWineId);
      res.json(slides);
    } catch (error) {
      console.error("Error fetching slides:", error);
      res.status(500).json({ error: "Failed to fetch slides" });
    }
  });

  app.post("/api/slides", async (req, res) => {
    try {
      const validatedData = insertSlideSchema.parse(req.body);
      console.log(`📝 Creating slide with type: ${validatedData.type}`);
      const slide = await storage.createSlide(validatedData);
      res.json({ slide });
    } catch (error) {
      console.error("Error creating slide:", error);
      res.status(500).json({ error: "Failed to create slide" });
    }
  });

  app.patch("/api/slides/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const slide = await storage.updateSlide(id, req.body);
      res.json({ slide });
    } catch (error) {
      console.error("Error updating slide:", error);
      res.status(500).json({ error: "Failed to update slide" });
    }
  });

  app.delete("/api/slides/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSlide(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting slide:", error);
      res.status(500).json({ error: "Failed to delete slide" });
    }
  });

  // Reorder slides - Fixed version with proper constraint handling
  app.put("/api/slides/reorder", async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }
      
      console.log(`📋 Processing ${updates.length} slide position updates`);
      
      // Validate updates
      if (updates.some(u => !u.slideId || typeof u.position !== 'number')) {
        return res.status(400).json({ message: "Invalid update format. Each update must have slideId and position." });
      }
      
      // Group updates by wine to handle each wine's slides separately
      const updatesByWine = new Map<string, typeof updates>();
      
      // First, get all slides to know their wine IDs
      const slideIds = updates.map(u => u.slideId);
      const allSlides = await Promise.all(
        slideIds.map(id => storage.getSlideById(id))
      );
      
      // Check if all slides were found
      const missingSlides = slideIds.filter((id, index) => !allSlides[index]);
      if (missingSlides.length > 0) {
        console.error(`Missing slides: ${missingSlides.join(', ')}`);
        return res.status(400).json({ message: `Slides not found: ${missingSlides.join(', ')}` });
      }
      
      // Group updates by wine
      updates.forEach((update, index) => {
        const slide = allSlides[index];
        if (slide) {
          const wineId = slide.packageWineId;
          if (!updatesByWine.has(wineId)) {
            updatesByWine.set(wineId, []);
          }
          updatesByWine.get(wineId)!.push(update);
        }
      });
      
      // Process each wine's updates separately using the tested reorder function
      for (const [wineId, wineUpdates] of Array.from(updatesByWine.entries())) {
        console.log(`🍷 Processing ${wineUpdates.length} position updates for wine ${wineId}`);
        
        try {
          await reorderSlidesForWine(wineId, wineUpdates);
          console.log(`   ✅ Successfully updated positions for wine ${wineId}`);
        } catch (wineError: any) {
          console.error(`Error processing wine ${wineId}:`, wineError);
          
          // Check if it's a duplicate key error
          if (wineError.code === '23505' || wineError.message?.includes('duplicate key')) {
            throw new Error(`Position conflict for wine ${wineId}. ${wineError.detail || wineError.message}`);
          }
          
          throw wineError;
        }
      }
      
      res.json({ message: "Slides reordered successfully" });
    } catch (error: any) {
      console.error("Error reordering slides:", error);
      
      // Check for specific database constraint errors
      if (error.code === '23505' || error.constraint === 'slides_package_wine_id_position_key') {
        return res.status(409).json({ 
          message: "Position conflict detected. Another slide already has this position.", 
          error: "DUPLICATE_POSITION",
          details: error.detail || 'Duplicate key violation'
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Internal server error", 
        error: error.code || 'UNKNOWN_ERROR',
        details: error.detail || error.constraint || 'Unknown error'
      });
    }
  });

  // NEW: Endpoint for the slide editor to get all package data
  app.get("/api/packages/:code/editor", async (req, res) => {
    try {
      const { code } = req.params;
      const data = await storage.getPackageWithWinesAndSlides(code);
      if (!data) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching package editor data:", error);
      res.status(500).json({ error: "Failed to fetch package data" });
    }
  });

  // NEW: Endpoint to update slide order (uses transaction-based batch update)
  app.put("/api/slides/order", async (req, res) => {
    try {
      const { slideUpdates } = req.body;
      if (!Array.isArray(slideUpdates)) {
        return res.status(400).json({ message: "Invalid payload: slideUpdates must be an array." });
      }
      
      // Map to the format expected by batchUpdateSlidePositions
      const updates = slideUpdates.map((update: any) => ({
        slideId: update.slideId,
        position: update.position,
        packageWineId: update.packageWineId
      }));
      
      await storage.batchUpdateSlidePositions(updates);
      res.status(200).json({ message: "Slide order updated successfully." });
    } catch (error: any) {
      console.error("Failed to update slide order:", error);
      
      // Check for specific database constraint errors
      if (error.code === '23505' || error.constraint === 'slides_package_wine_id_position_key') {
        return res.status(409).json({ 
          message: "Position conflict detected. Slides cannot have duplicate positions within the same wine.", 
          error: "DUPLICATE_POSITION",
          details: error.detail || 'Duplicate key violation'
        });
      }
      
      res.status(500).json({ 
        message: error.message || "Failed to update slide order.",
        error: error.code || 'UNKNOWN_ERROR' 
      });
    }
  });

  // UPDATED: Use new function to include wines  
  app.get("/api/packages-with-wines", async (req, res) => {
    try {
      const packages = await storage.getAllPackagesWithWines();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages with wines:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  // Modern wine management endpoints
  app.post("/api/wines", async (req, res) => {
    try {
      const validatedData = insertPackageWineSchema.parse(req.body);
      const wine = await storage.createPackageWineFromDashboard(validatedData);
      res.json({ wine });
    } catch (error) {
      console.error("Error creating wine:", error);
      res.status(500).json({ error: "Failed to create wine" });
    }
  });

  app.patch("/api/wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const wine = await storage.updatePackageWine(id, req.body);
      res.json({ wine });
    } catch (error) {
      console.error("Error updating wine:", error);
      res.status(500).json({ error: "Failed to update wine" });
    }
  });

  app.delete("/api/wines/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePackageWine(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting wine:", error);
      res.status(500).json({ error: "Failed to delete wine" });
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

  // Comprehensive media upload endpoint supporting all image formats up to 10MB
  console.log("📁 Registering comprehensive media upload endpoints...");
  
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const { mimetype, buffer, originalname, size } = req.file;
      
      // Enhanced validation for image uploads (10MB limit)
      if (mimetype.startsWith('image/')) {
        const maxImageSize = 10 * 1024 * 1024; // 10MB for images
        if (size > maxImageSize) {
          return res.status(400).json({ 
            message: "Image file too large. Maximum size is 10MB.",
            maxSize: maxImageSize,
            fileSize: size
          });
        }
      }

      // Check if Supabase is configured for production uploads
      if (!isSupabaseConfigured()) {
        // For local development, return a base64 data URL
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${mimetype};base64,${base64}`;
        return res.json({ 
          url: dataUrl,
          message: "File processed locally (Supabase not configured)",
          filename: originalname,
          size: size,
          type: mimetype
        });
      }

      // For production uploads with Supabase
      const { entityId, entityType } = req.body; // slide ID, wine ID, or package ID

      // For package creation, we might not have an entity ID yet
      if (!entityId && entityType !== 'package-temp') {
        return res.status(400).json({ message: "Entity ID is required" });
      }

      // Use temporary ID for package uploads during creation
      const uploadEntityId = entityId || `package-temp-${Date.now()}`;

      // Validate file type
      const mediaType = getMediaType(mimetype);
      if (!mediaType) {
        return res.status(400).json({ 
          message: `Unsupported file type: ${mimetype}. Supported types: images (JPEG, PNG, WebP, GIF, AVIF, HEIC, etc.), audio (MP3, WAV, M4A), video (MP4, WebM, MOV)` 
        });
      }

      // Upload to Supabase Storage
      const publicUrl = await uploadMediaFile(buffer, originalname, mimetype, uploadEntityId);

      res.json({
        url: publicUrl,
        mediaType,
        fileName: originalname,
        fileSize: buffer.length
      });
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to upload media" 
      });
    }
  });

  app.delete("/api/upload/media", async (req, res) => {
    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        return res.status(503).json({ 
          message: "Media deletion is not available. Supabase Storage is not configured." 
        });
      }

      const { fileUrl } = req.body;
      
      if (!fileUrl) {
        return res.status(400).json({ message: "File URL is required" });
      }

      await deleteMediaFile(fileUrl);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting media:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete media" 
      });
    }
  });

  console.log("✅ All routes registered successfully!");
  const httpServer = createServer(app);
  return httpServer;
}
