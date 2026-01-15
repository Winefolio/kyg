import type { Express } from "express";
import { storage } from "../storage";

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
}
