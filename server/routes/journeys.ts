import type { Express } from "express";
import { storage } from "../storage";
import { validateWineForChapter, getValidationMessage } from "../services/wineValidation";
import { generateQuestionsForWine, getFallbackQuestions } from "../services/questionGenerator";
import type { WineRecognitionResult } from "@shared/schema";

export function registerJourneyRoutes(app: Express) {
  console.log("🗺️ Registering journey endpoints...");

  // Get all published journeys (for discovery page)
  app.get("/api/journeys", async (req, res) => {
    try {
      const { difficulty, wineType } = req.query;

      const journeys = await storage.getPublishedJourneys({
        difficulty: difficulty as string | undefined,
        wineType: wineType as string | undefined
      });

      res.json({ journeys });
    } catch (error) {
      console.error("Error fetching journeys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single journey with chapters
  app.get("/api/journeys/:journeyId", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);

      if (isNaN(journeyId)) {
        return res.status(400).json({ message: "Invalid journey ID" });
      }

      const journey = await storage.getJourneyWithChapters(journeyId);

      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }

      res.json({ journey });
    } catch (error) {
      console.error("Error fetching journey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's journey progress
  app.get("/api/journeys/:journeyId/progress/:email", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const { email } = req.params;

      if (isNaN(journeyId)) {
        return res.status(400).json({ message: "Invalid journey ID" });
      }

      const progress = await storage.getUserJourneyProgress(email, journeyId);

      res.json({ progress });
    } catch (error) {
      console.error("Error fetching journey progress:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Start a journey (enroll user)
  app.post("/api/journeys/:journeyId/start", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const { email } = req.body;

      if (isNaN(journeyId)) {
        return res.status(400).json({ message: "Invalid journey ID" });
      }

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const userJourney = await storage.startJourney(email, journeyId);

      res.json({ userJourney });
    } catch (error) {
      console.error("Error starting journey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Complete a chapter (after tasting validation)
  app.post("/api/journeys/:journeyId/chapters/:chapterId/complete", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const chapterId = parseInt(req.params.chapterId);
      const { email, tastingId } = req.body;

      if (isNaN(journeyId) || isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid journey or chapter ID" });
      }

      if (!email || !tastingId) {
        return res.status(400).json({ message: "Email and tastingId are required" });
      }

      const updatedProgress = await storage.completeChapter(email, journeyId, chapterId, tastingId);

      res.json({ progress: updatedProgress });
    } catch (error) {
      console.error("Error completing chapter:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's active journeys (for dashboard)
  app.get("/api/user/:email/journeys", async (req, res) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const userJourneys = await storage.getUserActiveJourneys(email);

      res.json({ journeys: userJourneys });
    } catch (error) {
      console.error("Error fetching user journeys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SPRINT 5: WINE VALIDATION & AI QUESTIONS
  // ============================================

  // Validate wine photo against chapter requirements
  app.post("/api/journeys/:journeyId/chapters/:chapterId/validate", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const chapterId = parseInt(req.params.chapterId);
      const { wineInfo } = req.body as { wineInfo: WineRecognitionResult };

      if (isNaN(journeyId) || isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid journey or chapter ID" });
      }

      if (!wineInfo) {
        return res.status(400).json({ message: "Wine info is required" });
      }

      // Get the chapter to validate against
      const chapter = await storage.getChapterById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Validate the wine
      const validationResult = validateWineForChapter(wineInfo, chapter);
      const message = getValidationMessage(validationResult);

      res.json({
        validation: validationResult,
        message,
        chapter: {
          id: chapter.id,
          title: chapter.title,
          description: chapter.description
        }
      });
    } catch (error) {
      console.error("Error validating wine:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate AI questions for a chapter tasting
  app.post("/api/journeys/:journeyId/chapters/:chapterId/questions", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const chapterId = parseInt(req.params.chapterId);
      const { wineInfo, difficulty = 'intermediate' } = req.body as {
        wineInfo: WineRecognitionResult;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
      };

      if (isNaN(journeyId) || isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid journey or chapter ID" });
      }

      if (!wineInfo) {
        return res.status(400).json({ message: "Wine info is required" });
      }

      // Get the chapter for context
      const chapter = await storage.getChapterById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Generate questions
      const questions = await generateQuestionsForWine(wineInfo, chapter, difficulty);

      res.json({
        questions,
        wineContext: wineInfo,
        chapter: {
          id: chapter.id,
          title: chapter.title
        }
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      // Return fallback questions on error
      res.json({
        questions: getFallbackQuestions(),
        wineContext: req.body.wineInfo,
        fallback: true,
        error: "Failed to generate custom questions, using default set"
      });
    }
  });

  // Combined endpoint: validate wine AND generate questions in one call
  app.post("/api/journeys/:journeyId/chapters/:chapterId/start-tasting", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const chapterId = parseInt(req.params.chapterId);
      const {
        wineInfo,
        winePhotoUrl,
        email,
        difficulty = 'intermediate',
        skipValidation = false
      } = req.body as {
        wineInfo: WineRecognitionResult;
        winePhotoUrl?: string;
        email: string;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        skipValidation?: boolean;
      };

      if (isNaN(journeyId) || isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid journey or chapter ID" });
      }

      if (!wineInfo || !email) {
        return res.status(400).json({ message: "Wine info and email are required" });
      }

      // Get the chapter
      const chapter = await storage.getChapterById(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      // Validate wine (unless skipValidation is true)
      let validationResult = null;
      let validationMessage = null;

      if (!skipValidation) {
        validationResult = validateWineForChapter(wineInfo, chapter);
        validationMessage = getValidationMessage(validationResult);

        // If validation failed, return early with the validation result
        if (!validationResult.passed) {
          return res.json({
            success: false,
            validation: validationResult,
            message: validationMessage,
            questions: null
          });
        }
      }

      // Generate questions
      const questions = await generateQuestionsForWine(wineInfo, chapter, difficulty);

      res.json({
        success: true,
        validation: validationResult,
        message: validationMessage || "Wine accepted! Let's start tasting.",
        questions,
        wineContext: wineInfo,
        chapter: {
          id: chapter.id,
          title: chapter.title,
          description: chapter.description
        }
      });
    } catch (error) {
      console.error("Error starting chapter tasting:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        questions: getFallbackQuestions()
      });
    }
  });

  // ============================================
  // ADMIN ROUTES FOR JOURNEY MANAGEMENT
  // ============================================

  // Create a new journey (admin/liaison)
  app.post("/api/admin/journeys", async (req, res) => {
    try {
      const journeyData = req.body;

      if (!journeyData.title) {
        return res.status(400).json({ message: "Journey title is required" });
      }

      const journey = await storage.createJourney(journeyData);
      res.status(201).json({ journey });
    } catch (error) {
      console.error("Error creating journey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a journey (admin/liaison)
  app.put("/api/admin/journeys/:journeyId", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const updates = req.body;

      if (isNaN(journeyId)) {
        return res.status(400).json({ message: "Invalid journey ID" });
      }

      const journey = await storage.updateJourney(journeyId, updates);
      if (!journey) {
        return res.status(404).json({ message: "Journey not found" });
      }

      res.json({ journey });
    } catch (error) {
      console.error("Error updating journey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a journey (admin/liaison)
  app.delete("/api/admin/journeys/:journeyId", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);

      if (isNaN(journeyId)) {
        return res.status(400).json({ message: "Invalid journey ID" });
      }

      await storage.deleteJourney(journeyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting journey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create a chapter (admin/liaison)
  app.post("/api/admin/journeys/:journeyId/chapters", async (req, res) => {
    try {
      const journeyId = parseInt(req.params.journeyId);
      const chapterData = req.body;

      if (isNaN(journeyId)) {
        return res.status(400).json({ message: "Invalid journey ID" });
      }

      if (!chapterData.title) {
        return res.status(400).json({ message: "Chapter title is required" });
      }

      const chapter = await storage.createChapter({
        ...chapterData,
        journeyId
      });

      res.status(201).json({ chapter });
    } catch (error) {
      console.error("Error creating chapter:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a chapter (admin/liaison)
  app.put("/api/admin/chapters/:chapterId", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const updates = req.body;

      if (isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid chapter ID" });
      }

      const chapter = await storage.updateChapter(chapterId, updates);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }

      res.json({ chapter });
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete a chapter (admin/liaison)
  app.delete("/api/admin/chapters/:chapterId", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.chapterId);

      if (isNaN(chapterId)) {
        return res.status(400).json({ message: "Invalid chapter ID" });
      }

      await storage.deleteChapter(chapterId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chapter:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all journeys with chapters (admin view - includes unpublished)
  app.get("/api/admin/journeys", async (req, res) => {
    try {
      const journeys = await storage.getAllJourneysWithChapters();
      res.json({ journeys });
    } catch (error) {
      console.error("Error fetching journeys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
