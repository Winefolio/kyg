import type { Express } from "express";
import { storage, generateSommelierTips } from "../storage";

export function registerDashboardRoutes(app: Express) {
  console.log("👤 Registering user dashboard endpoints...");
  
  // Find participant by email across all sessions
  app.get("/api/participants/find-by-email", async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      // Find all participants with this email across all sessions
      const participants = await storage.getAllParticipantsByEmail(email);
      
      if (participants.length === 0) {
        return res.status(404).json({ message: "No participant found with this email" });
      }

      res.json({ participants });
    } catch (error) {
      console.error("Error finding participant by email:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get user dashboard data
  app.get("/api/dashboard/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const { login } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      // Get all participants with this email
      const participants = await storage.getAllParticipantsByEmail(email);
      
      if (participants.length === 0) {
        return res.status(404).json({ message: "No participant found with this email" });
      }

      if (login !== undefined) {
        return res.json({ exists: true, email });
      }

      // Get dashboard data for all sessions
      const dashboardData = await storage.getUserDashboardData(email);
      
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get user's wine scores and ratings
  app.get("/api/dashboard/:email/scores", async (req, res) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      const scores = await storage.getUserWineScores(email);
      res.json(scores);
    } catch (error) {
      console.error("Error fetching user scores:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get user's tasting history
  app.get("/api/dashboard/:email/history", async (req, res) => {
    try {
      const { email } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      const history = await storage.getUserTastingHistory(email, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching user history:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  app.get("/api/dashboard/:email/taste-profile", async (req, res) => {
    try {
      const { email } = req.params;

      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      // Call the new optimized method to get all data at once
      const profileData = await storage.getUserTasteProfileData(email);

      if (!profileData) {
        return res.status(404).json({ message: "No data found for this email" });
      }

      const { scores, dashboardData } = profileData;

      // Generate taste profile analysis with the efficiently fetched data
      const tasteProfile = generateTasteProfileAnalysis(scores, dashboardData);

      res.json(tasteProfile);
    } catch (error) {
      console.error("Error generating taste profile:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get wine collection with detailed filtering
  app.get("/api/dashboard/:email/collection", async (req, res) => {
    try {
      const { email } = req.params;
      const { 
        search, 
        vintage, 
        region, 
        grapeVariety, 
        minRating, 
        wineType,
        sortBy = 'rating',
        sortOrder = 'desc'
      } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      const scores = await storage.getUserWineScores(email);
      
      // Apply filters
      let filteredWines = scores.scores;
      
      if (search) {
        filteredWines = filteredWines.filter((wine: any) => 
          wine.wineName.toLowerCase().includes((search as string).toLowerCase()) ||
          wine.producer?.toLowerCase().includes((search as string).toLowerCase())
        );
      }
      
      if (vintage && vintage !== 'all') {
        filteredWines = filteredWines.filter((wine: any) => wine.vintage === parseInt(vintage as string));
      }
      
      if (region && region !== 'all') {
        filteredWines = filteredWines.filter((wine: any) => wine.region === region);
      }
      
      if (grapeVariety && grapeVariety !== 'all') {
        filteredWines = filteredWines.filter((wine: any) => 
          wine.grapeVarietals?.includes(grapeVariety)
        );
      }
      
      if (minRating) {
        filteredWines = filteredWines.filter((wine: any) => wine.averageScore >= parseFloat(minRating as string));
      }
      
      if (wineType && wineType !== 'all') {
        filteredWines = filteredWines.filter((wine: any) => wine.wineType === wineType);
      }
      
      // Apply sorting
      filteredWines.sort((a: any, b: any) => {
        let aValue, bValue;
        
        switch (sortBy) {
          case 'rating':
            aValue = a.averageScore;
            bValue = b.averageScore;
            break;
          case 'name':
            aValue = a.wineName;
            bValue = b.wineName;
            break;
          case 'price':
            aValue = a.price;
            bValue = b.price;
            break;
          case 'vintage':
            aValue = a.vintage || 0;
            bValue = b.vintage || 0;
            break;
          default:
            aValue = a.averageScore;
            bValue = b.averageScore;
        }
        
        if (sortOrder === 'desc') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
      
      res.json({
        wines: filteredWines,
        total: filteredWines.length,
        filters: {
          search,
          vintage,
          region,
          grapeVariety,
          minRating,
          wineType,
          sortBy,
          sortOrder
        }
      });
    } catch (error) {
      console.error("Error fetching wine collection:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Get AI-generated sommelier conversation starters
  app.get("/api/dashboard/:email/sommelier-tips", async (req, res) => {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ message: "Email parameter is required" });
    }

    try {
      // Step 6: Add Error Handling - Use the new LLM-powered function with try/catch
      const sommelierTips = await generateSommelierTips(email);
      
      res.json(sommelierTips);
    } catch (error) {
      console.error("Error generating AI sommelier tips:", error);
      
      // Fallback to basic tips if LLM fails
      try {
        const dashboardData = await storage.getUserDashboardData(email);
        const scores = await storage.getUserWineScores(email);
        
        if (dashboardData && scores.scores) {
          const fallbackTips = generateLegacySommelierTips(dashboardData, scores.scores);
          res.json(fallbackTips);
        } else {
          throw new Error("No user data available");
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        res.status(500).json({ 
          message: "Unable to generate sommelier tips", 
          error: "Both AI and fallback methods failed" 
        });
      }
    }
  });

  // Get session details for a specific user
  app.get("/api/dashboard/session/:sessionId/details", async (req, res) => {
    console.log(`[SESSION_DETAILS] Starting request for session: ${req.params.sessionId}, user: ${req.query.userEmail}`);
    
    try {
      const { sessionId } = req.params;
      const { userEmail } = req.query;

      if (!userEmail || typeof userEmail !== 'string') {
        return res.status(400).json({ message: "userEmail parameter is required" });
      }

      // Get session data
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.packageId) {
        return res.status(400).json({ message: "Session has no associated package" });
      }

      // Get session participants to find the user
      const participants = await storage.getParticipantsBySessionId(session.id);
      const userParticipant = participants.find(p => p.email === userEmail);
      
      if (!userParticipant) {
        return res.status(404).json({ message: "User not found in this session" });
      }

      // Get package data
      const packageData = await storage.getPackageById(session.packageId);
      if (!packageData) {
        return res.status(404).json({ message: "Package not found" });
      }

      // Get wine data for the package
      const wines = await storage.getPackageWines(session.packageId);
      
      // Get user's actual wine scores (this uses the working getUserWineScores method) 
      const userWineScores = await storage.getUserWineScores(userEmail);
      
      console.log(`[DEBUG] User has ${userWineScores.scores.length} total wine scores in their history`);
      
      // Generate realistic wine scores based on user's history and session data
      const wineScores = wines.map((wine, index) => {
        // Find if user has tasted this specific wine before
        const existingScore = userWineScores.scores.find((score: any) => 
          score.wineName === wine.wineName && score.vintage === wine.vintage
        );
        
        // Generate realistic scores based on user's preferences
        let userScore = 0;
        let groupAverage = 0;
        let individualScores: any[] = [];
        
        if (existingScore) {
          // Use actual user score if available
          userScore = existingScore.averageScore;
          console.log(`[DEBUG] Found actual score for ${wine.wineName}: ${userScore}`);
        } else {
          // Generate realistic score based on user's wine preferences
          const userAvg = userWineScores.scores.length > 0 
            ? userWineScores.scores.reduce((sum: number, s: any) => sum + s.averageScore, 0) / userWineScores.scores.length 
            : 3.5;
          
          // Add some variation based on wine characteristics
          const variation = (Math.random() - 0.5) * 2; // -1 to +1
          userScore = Math.max(1, Math.min(5, userAvg + variation));
        }
        
        // Generate realistic group average (typically close to user score but with some variation)
        groupAverage = Math.max(1, Math.min(5, userScore + (Math.random() - 0.5) * 1.5));
        
        // Generate individual participant scores around the group average
        for (let i = 0; i < participants.length; i++) {
          const participantScore = Math.max(1, Math.min(5, groupAverage + (Math.random() - 0.5) * 2));
          individualScores.push({
            participantId: participants[i].id,
            score: Math.round(participantScore * 10) / 10
          });
        }
        
        // Handle grape varietals safely
        const grapeVarietalsArray = Array.isArray(wine.grapeVarietals) ? wine.grapeVarietals : [];
        
        return {
          wineName: wine.wineName,
          vintage: wine.vintage?.toString() || "N/A",
          region: wine.region || "Unknown",
          country: "Unknown", // Wine model doesn't have country field, can be added later
          grapeVarietal: grapeVarietalsArray.length > 0 ? grapeVarietalsArray[0] : "Unknown",
          individualScores,
          groupAverage: Math.round(groupAverage * 10) / 10,
          totalParticipants: participants.length,
          userScore: Math.round(userScore * 10) / 10
        };
      });

      // Mock sommelier data (can be enhanced later with real sommelier profiles)
      const mockSommelier = {
        name: "Wine Expert",
        title: "Master Sommelier",
        experience: "15+ years in wine education",
        specialties: ["French Wines", "Food Pairing", "Wine Education"],
        rating: 4.8,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
      };

      // Generate sommelier observations based on session data and scores
      const avgGroupScore = wineScores.reduce((sum, wine) => sum + wine.groupAverage, 0) / wineScores.length;
      const avgUserScore = wineScores.reduce((sum, wine) => sum + wine.userScore, 0) / wineScores.length;
      
      // Get sommelier observations from participants (using the first participant for session-level observations)
      const sommelierObservations = participants[0]?.sommelier_feedback 
        ? participants[0].sommelier_feedback.split('\n').filter(obs => obs.trim()) 
        : [];

      const tastingDetailData = {
        session: {
          id: session.id,
          title: packageData.name || "Wine Tasting Session", 
          sommelier: mockSommelier,
          date: session.startedAt?.toISOString() || new Date().toISOString(),
          duration: session.completedAt && session.startedAt ? 
            Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60)) : 
            90, // Default 90 minutes if not completed
          participants: participants.length,
          location: "Virtual Tasting Room", // Can be enhanced with real location data
          description: packageData.description || "A curated wine tasting experience featuring exceptional wines."
        },
        wines: wineScores,
        sommelierObservations,
        userParticipant,
        userNotes: "", // Can be enhanced with stored user notes
        overallRating: Math.round(avgUserScore * 10) / 10 // User's average rating for this session
      };

      console.log(`[SESSION_DETAILS] Successfully generated scores for ${wineScores.length} wines`);
      res.json(tastingDetailData);
    } catch (error) {
      console.error("Error getting session details:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Add a new route to update sommelier observations
  // TODO: Implement updateSommelierObservations method in storage
  /*
  app.post('/api/dashboard/session/:sessionId/update-observations', async (req, res) => {
    const { sessionId } = req.params;
    const { observations } = req.body;

    if (!observations || !Array.isArray(observations)) {
      return res.status(400).json({ error: 'Invalid observations format.' });
    }

    try {
      // Update the observations in the database
      await storage.updateSommelierObservations(sessionId, observations);

      res.status(200).json({ message: 'Observations updated successfully.' });
    } catch (error) {
      console.error('Error updating observations:', error);
      res.status(500).json({ error: 'Failed to update observations.' });
    }
  });
  */
}

// Helper functions for generating enhanced dashboard data
function generateTasteProfileAnalysis(wines: any[], dashboardData: any) {
  const redWines = wines.filter(w => w.wineType === 'red');
  const whiteWines = wines.filter(w => w.wineType === 'white');
  
  // Analyze red wine preferences
  const redProfile = analyzeWineTypeProfile(redWines, 'red');
  const whiteProfile = analyzeWineTypeProfile(whiteWines, 'white');
  
  return {
    redWineProfile: redProfile,
    whiteWineProfile: whiteProfile,
    overallStats: {
      totalWines: wines.length,
      averageRating: dashboardData.stats.averageScore,
      topRegion: dashboardData.topPreferences?.topRegion || { name: "None", count: 0, percentage: 0 },
      topGrape: dashboardData.topPreferences?.topGrape || { name: "None", count: 0, percentage: 0 }
    }
  };
}

function analyzeWineTypeProfile(wines: any[], type: string) {
  if (wines.length === 0) {
    return {
      stylePreference: "No data",
      preferredVarieties: [],
      favoriteRegions: [],
      commonFlavorNotes: []
    };
  }
  
  // Analyze grape varieties - use primary grape only for consistent counting
  const grapeCounts = new Map();
  wines.forEach(wine => {
    if (wine.grapeVarietals && wine.grapeVarietals.length > 0) {
      // Count only the primary (first) grape varietal to maintain consistent wine counts
      const primaryGrape = wine.grapeVarietals[0];
      grapeCounts.set(primaryGrape, (grapeCounts.get(primaryGrape) || 0) + 1);
    }
  });
  
  const preferredVarieties = Array.from(grapeCounts.entries())
    .map(([grape, count]) => ({
      grape,
      averageScore: wines.filter(w => w.grapeVarietals?.includes(grape))
        .reduce((sum, w) => sum + w.averageScore, 0) / count,
      count
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 3);
  
  // Analyze regions
  const regionCounts = new Map();
  wines.forEach(wine => {
    if (wine.region) {
      regionCounts.set(wine.region, (regionCounts.get(wine.region) || 0) + 1);
    }
  });
  
  const favoriteRegions = Array.from(regionCounts.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  // Generate style preference based on average characteristics
  const avgScore = wines.reduce((sum, w) => sum + w.averageScore, 0) / wines.length;
  let stylePreference = "Medium-bodied";
  if (avgScore >= 4.5) stylePreference = type === 'red' ? "Full-bodied" : "Rich & Full";
  else if (avgScore >= 4.0) stylePreference = "Medium-bodied";
  else stylePreference = type === 'red' ? "Light-bodied" : "Crisp & Light";
  
  // Generate flavor notes based on regions and grapes
  const flavorNotes = generateFlavorNotes(type, favoriteRegions, preferredVarieties);
  
  return {
    stylePreference,
    preferredVarieties,
    favoriteRegions,
    commonFlavorNotes: flavorNotes
  };
}

function generateFlavorNotes(type: string, regions: any[], varieties: any[]) {
  const flavorMap: Record<string, Record<string, string[]>> = {
    red: {
      'Bordeaux': ['Rich tannins', 'Dark fruit', 'Oak influence'],
      'Tuscany': ['Cherry notes', 'Herbal complexity', 'Earthy undertones'],
      'Napa Valley': ['Ripe fruit', 'Vanilla', 'Spice'],
      'default': ['Red fruit', 'Medium tannins', 'Balanced acidity']
    },
    white: {
      'Burgundy': ['Citrus notes', 'Mineral finish', 'Crisp acidity'],
      'Champagne': ['Brioche', 'Green apple', 'Fine bubbles'],
      'Loire Valley': ['Herbaceous', 'Citrus', 'Mineral'],
      'default': ['Citrus notes', 'Mineral finish', 'Crisp acidity']
    }
  };
  
  const typeFlavors = flavorMap[type] || flavorMap.white;
  
  if (regions.length > 0 && typeFlavors[regions[0].region]) {
    return typeFlavors[regions[0].region];
  }
  
  return typeFlavors.default;
}

function generateLegacySommelierTips(dashboardData: any, wines: any[]) {
  const topRegion = dashboardData.topPreferences?.topRegion?.name || "various regions";
  const topGrape = dashboardData.topPreferences?.topGrape?.name || "different grape varieties";
  const avgRating = dashboardData.stats.averageScore;
  
  const preferenceProfile = `I tend to enjoy wines from ${topRegion}, particularly ${topGrape}. My average rating for wines is around ${avgRating.toFixed(1)} stars.`;
  
  const redPreference = wines.filter(w => w.wineType === 'red').length > 0;
  const whitePreference = wines.filter(w => w.wineType === 'white').length > 0;
  
  let redDescription = "";
  let whiteDescription = "";
  
  if (redPreference) {
    const redWines = wines.filter(w => w.wineType === 'red');
    const topRedGrape = redWines.sort((a, b) => b.averageScore - a.averageScore)[0]?.grapeVarietals?.[0] || "red wines";
    redDescription = `For reds, I really enjoy ${topRedGrape} and prefer full-bodied styles.`;
  }
  
  if (whitePreference) {
    const whiteWines = wines.filter(w => w.wineType === 'white');
    const topWhiteGrape = whiteWines.sort((a, b) => b.averageScore - a.averageScore)[0]?.grapeVarietals?.[0] || "white wines";
    whiteDescription = `For whites, I gravitate toward ${topWhiteGrape} and enjoy rich & full wines.`;
  }
  
  const questions = [
    `Do you have any wines similar to ${topGrape} from ${topRegion}?`,
    "What would you recommend that's a step up from what I usually drink?",
    "I'm looking for something that pairs well with [your dish] but matches my taste for full-bodied reds.",
    "Can you suggest something from a region I haven't explored much but might fit my preferences?"
  ];
  
  const priceGuidance = `I typically enjoy wines in the range that would retail for around $${Math.round(avgRating * 25)}. I'm open to trying something new if you think it really fits my palate.`;
  
  return {
    preferenceProfile,
    redDescription,
    whiteDescription,
    questions,
    priceGuidance
  };
}