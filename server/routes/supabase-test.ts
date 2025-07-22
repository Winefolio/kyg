import type { Express } from "express";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://byearryckdwmajygqdpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4';

const supabase = createClient(supabaseUrl, supabaseKey);

interface WineData {
  wineName: string;
  wineType: string;
  responses: any[];
  scores: number[];
  averageScore: number;
  totalRatings: number;
  regions: string[];
  grapeVarietals: string[];
  flavorNotes: string[];
  packageWineData?: any; // Added for package wine data
}

export function registerSupabaseTestRoutes(app: Express) {
  console.log("🧪 Registering Supabase test endpoints...");
  
  // Helper function to extract wine details from responses
  function extractWineData(responses: any[]): Map<string, WineData> {
    const wineMap = new Map<string, WineData>();
    
    responses.forEach(response => {
      const slidePayload = response.slides?.payload_json;
      const slideType = response.slides?.type;
      const packageWine = response.slides?.package_wines;
      
      // Skip if no slide data
      if (!slidePayload || !slideType) return;
      
      // Get wine name from different possible sources
      let wineName = null;
      let wineType = 'unknown';
      
      // Method 1: Get wine name from package_wines table (most reliable)
      if (packageWine && packageWine.wine_name) {
        wineName = packageWine.wine_name;
        wineType = packageWine.wine_type || 'unknown';
      }
      
      // Method 2: Extract from slide payload directly
      if (!wineName && slidePayload.wine_name) {
        wineName = slidePayload.wine_name;
      }
      
      // Method 3: Try to extract from question title or other fields
      if (!wineName && slidePayload.title) {
        const title = slidePayload.title.toLowerCase();
        if (title.includes('barolo')) {
          wineName = 'Barolo';
          wineType = 'red';
        } else if (title.includes('montalcino') || title.includes('brunello')) {
          wineName = 'Brunello di Montalcino';
          wineType = 'red';
        } else if (title.includes('chianti')) {
          wineName = 'Chianti';
          wineType = 'red';
        } else if (title.includes('amarone')) {
          wineName = 'Amarone della Valpolicella';
          wineType = 'red';
        } else if (title.includes('ischia')) {
          wineName = 'Ischia Bianco';
          wineType = 'white';
        } else if (title.includes('val di suga')) {
          wineName = 'Val di Suga Brunello di Montalcino';
          wineType = 'red';
        }
      }
      
      // Skip if we couldn't identify a wine
      if (!wineName) return;
      
      if (!wineMap.has(wineName)) {
        wineMap.set(wineName, {
          wineName,
          wineType,
          responses: [],
          scores: [],
          averageScore: 0,
          totalRatings: 0,
          regions: [],
          grapeVarietals: [],
          flavorNotes: [],
          packageWineData: packageWine // Store the package wine data
        });
      }
      
      const wineData = wineMap.get(wineName)!;
      wineData.responses.push(response);
      
      // Extract scores from scale questions
      if (slideType === 'question' && slidePayload.question_type === 'scale' && typeof response.answer_json === 'number') {
        wineData.scores.push(response.answer_json);
      }
      
      // Extract scores from rating questions (1-5 scale)
      if (slideType === 'question' && slidePayload.question_type === 'rating' && typeof response.answer_json === 'number') {
        wineData.scores.push(response.answer_json);
      }
      
      // Extract flavor notes from text responses
      if (slideType === 'question' && slidePayload.question_type === 'text' && typeof response.answer_json === 'string') {
        const notes = response.answer_json.toLowerCase();
        wineData.flavorNotes.push(notes);
      }
      
      // Extract regions and grape varieties from package_wines data first
      if (packageWine) {
        if (packageWine.region) {
          wineData.regions.push(packageWine.region);
        }
        if (packageWine.grape_varietals && Array.isArray(packageWine.grape_varietals)) {
          wineData.grapeVarietals.push(...packageWine.grape_varietals);
        }
      }
      
      // Fallback: Extract regions and grape varieties based on wine name
      if (wineData.regions.length === 0) {
        if (wineName.includes('Barolo')) {
          wineData.regions.push('Piedmont');
          wineData.grapeVarietals.push('Nebbiolo');
        } else if (wineName.includes('Montalcino') || wineName.includes('Brunello')) {
          wineData.regions.push('Tuscany');
          wineData.grapeVarietals.push('Sangiovese');
        } else if (wineName.includes('Ischia')) {
          wineData.regions.push('Campania');
          wineData.grapeVarietals.push('Biancolella');
        } else if (wineName.includes('Chianti')) {
          wineData.regions.push('Tuscany');
          wineData.grapeVarietals.push('Sangiovese');
        } else if (wineName.includes('Amarone')) {
          wineData.regions.push('Veneto');
          wineData.grapeVarietals.push('Corvina');
        } else if (wineName.includes('Val di Suga')) {
          wineData.regions.push('Tuscany');
          wineData.grapeVarietals.push('Sangiovese');
        }
      }
    });
    
    // Calculate averages
    wineMap.forEach(wineData => {
      if (wineData.scores.length > 0) {
        wineData.averageScore = wineData.scores.reduce((a, b) => a + b, 0) / wineData.scores.length;
        wineData.totalRatings = wineData.scores.length;
      }
      // Remove duplicates
      wineData.regions = Array.from(new Set(wineData.regions));
      wineData.grapeVarietals = Array.from(new Set(wineData.grapeVarietals));
    });
    
    return wineMap;
  }
  
  // Helper function to generate taste profile
  function generateTasteProfile(wineMap: Map<string, WineData>) {
    const redWines = Array.from(wineMap.values()).filter(w => w.wineType === 'red');
    const whiteWines = Array.from(wineMap.values()).filter(w => w.wineType === 'white');
    
    // Analyze red wine preferences
    const redRegions = new Map<string, number>();
    const redGrapes = new Map<string, number>();
    redWines.forEach(wine => {
      wine.regions.forEach(region => {
        redRegions.set(region, (redRegions.get(region) || 0) + 1);
      });
      wine.grapeVarietals.forEach(grape => {
        redGrapes.set(grape, (redGrapes.get(grape) || 0) + 1);
      });
    });
    
    // Analyze white wine preferences
    const whiteRegions = new Map<string, number>();
    const whiteGrapes = new Map<string, number>();
    whiteWines.forEach(wine => {
      wine.regions.forEach(region => {
        whiteRegions.set(region, (whiteRegions.get(region) || 0) + 1);
      });
      wine.grapeVarietals.forEach(grape => {
        whiteGrapes.set(grape, (whiteGrapes.get(grape) || 0) + 1);
      });
    });
    
    // Extract common flavor notes
    const allFlavorNotes = Array.from(wineMap.values()).flatMap(w => w.flavorNotes);
    const commonNotes = allFlavorNotes.join(' ').toLowerCase().match(/\b(cherry|blackberry|vanilla|oak|spice|pepper|leather|tobacco|citrus|lemon|apple|pear|floral|violet|rose|earth|mineral|graphite|flint)\b/g) || [];
    const noteCounts = commonNotes.reduce((acc, note) => {
      acc[note] = (acc[note] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topNotes = Object.entries(noteCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([note]) => note);
    
    return {
      redWineProfile: {
        stylePreference: redWines.length > 0 ? "Medium-bodied" : "None",
        preferredVarieties: Array.from(redGrapes.entries()).map(([grape, count]) => ({
          grape,
          averageScore: redWines.filter(w => w.grapeVarietals.includes(grape))
            .reduce((sum, w) => sum + w.averageScore, 0) / count,
          count
        })),
        favoriteRegions: Array.from(redRegions.entries()).map(([region, count]) => ({
          region,
          count
        })),
        commonFlavorNotes: topNotes
      },
      whiteWineProfile: {
        stylePreference: whiteWines.length > 0 ? "Crisp & Fresh" : "None",
        preferredVarieties: Array.from(whiteGrapes.entries()).map(([grape, count]) => ({
          grape,
          averageScore: whiteWines.filter(w => w.grapeVarietals.includes(grape))
            .reduce((sum, w) => sum + w.averageScore, 0) / count,
          count
        })),
        favoriteRegions: Array.from(whiteRegions.entries()).map(([region, count]) => ({
          region,
          count
        })),
        commonFlavorNotes: topNotes
      },
      overallStats: {
        totalWines: wineMap.size,
        averageRating: Array.from(wineMap.values()).reduce((sum, w) => sum + w.averageScore, 0) / wineMap.size,
        topRegion: Array.from(wineMap.values()).flatMap(w => w.regions).reduce((acc, region) => {
          acc[region] = (acc[region] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        topGrape: Array.from(wineMap.values()).flatMap(w => w.grapeVarietals).reduce((acc, grape) => {
          acc[grape] = (acc[grape] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
  
  // Test endpoint to get Brooke's data
  app.get("/api/supabase-test/brooke", async (req, res) => {
    try {
      // Find Brooke's participant record
      const { data: brooke, error: brookeError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', 'blevine379@gmail.com')
        .single();
      
      if (brookeError) {
        return res.status(404).json({ message: "Brooke not found", error: brookeError.message });
      }
      
      // Get Brooke's responses
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .eq('participant_id', brooke.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data separately and join manually
      const slideIds = responses.map(r => r.slides?.id).filter(Boolean);
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        return res.status(500).json({ message: "Error getting slides with wines", error: slidesError.message });
      }
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      }));
      
      // Get Brooke's sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          participants!inner(id, email)
        `)
        .eq('participants.email', 'blevine379@gmail.com');
      
      if (sessionsError) {
        return res.status(500).json({ message: "Error getting sessions", error: sessionsError.message });
      }
      
      // Extract wine data
      const wineMap = extractWineData(responsesWithWines);
      const uniqueWinesTasted = wineMap.size;
      
      // Calculate overall stats
      const totalResponses = responsesWithWines.length;
      const totalSessions = sessions.length;
      const averageScore = Array.from(wineMap.values()).reduce((sum, wine) => sum + wine.averageScore, 0) / uniqueWinesTasted;
      
      // Generate taste profile
      const tasteProfile = generateTasteProfile(wineMap);
      
      // Get top preferences
      const allRegions = Array.from(wineMap.values()).flatMap(w => w.regions);
      const regionCounts = allRegions.reduce((acc, region) => {
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const allGrapes = Array.from(wineMap.values()).flatMap(w => w.grapeVarietals);
      const grapeCounts = allGrapes.reduce((acc, grape) => {
        acc[grape] = (acc[grape] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topRegion = Object.entries(regionCounts)
        .sort(([,a], [,b]) => b - a)[0] || ['None', 0];
      const topGrape = Object.entries(grapeCounts)
        .sort(([,a], [,b]) => b - a)[0] || ['None', 0];
      
      res.json({
        user: {
          email: brooke.email,
          displayName: brooke.display_name,
          totalSessions: totalSessions,
          completedSessions: sessions.filter(s => s.completed_at).length,
          totalResponses: totalResponses,
          uniqueWinesTasted: uniqueWinesTasted
        },
        stats: {
          averageScore: averageScore,
          favoriteWineType: "Red",
          totalTastings: totalSessions
        },
        topPreferences: {
          topRegion: { 
            name: topRegion[0], 
            count: topRegion[1], 
            percentage: (topRegion[1] / uniqueWinesTasted) * 100 
          },
          topGrape: { 
            name: topGrape[0], 
            count: topGrape[1], 
            percentage: (topGrape[1] / uniqueWinesTasted) * 100 
          },
          averageRating: { 
            score: averageScore, 
            totalWines: uniqueWinesTasted 
          }
        },
        wineMap: Object.fromEntries(wineMap),
        tasteProfile,
        responses: responses.slice(0, 5),
        sessions: sessions
      });
      
    } catch (error) {
      console.error("Error in Supabase test:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // Debug endpoint to see raw response data
  app.get("/api/supabase-test/debug/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      // Find participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .single();
      
      if (participantError) {
        return res.status(404).json({ message: "User not found", error: participantError.message });
      }
      
      // Get responses with slide data
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            payload_json
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Return sample responses for debugging
      const sampleResponses = responses.slice(0, 5).map(r => ({
        id: r.id,
        slide_type: r.slides?.type,
        slide_payload: r.slides?.payload_json,
        answer_json: r.answer_json,
        answered_at: r.answered_at
      }));
      
      res.json({
        participant: {
          id: participant.id,
          email: participant.email,
          display_name: participant.display_name
        },
        totalResponses: responses.length,
        sampleResponses
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Test endpoint to get any user's data
  app.get("/api/supabase-test/user/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      // Find participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .single();
      
      if (participantError) {
        return res.status(404).json({ message: "User not found", error: participantError.message });
      }
      
      // Get sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          participants!inner(id, email)
        `)
        .eq('participants.email', email);
      
      if (sessionsError) {
        return res.status(500).json({ message: "Error getting sessions", error: sessionsError.message });
      }
      
      // Get responses with slide data and package_wines data
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data separately and join manually
      const slideIds = responses.map(r => r.slides?.id).filter(Boolean);
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        return res.status(500).json({ message: "Error getting slides with wines", error: slidesError.message });
      }
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      }));
      
      // Extract wine data with improved logic
      const wineMap = extractWineData(responsesWithWines);
      const uniqueWinesTasted = wineMap.size;
      
      // Calculate overall stats
      const totalResponses = responsesWithWines.length;
      const totalSessions = sessions.length;
      const averageScore = uniqueWinesTasted > 0 ? 
        Array.from(wineMap.values()).reduce((sum, wine) => sum + wine.averageScore, 0) / uniqueWinesTasted : 
        null;
      
      // Generate taste profile
      const tasteProfile = generateTasteProfile(wineMap);
      
      // Get top preferences
      const allRegions = Array.from(wineMap.values()).flatMap(w => w.regions);
      const regionCounts = allRegions.reduce((acc, region) => {
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const allGrapes = Array.from(wineMap.values()).flatMap(w => w.grapeVarietals);
      const grapeCounts = allGrapes.reduce((acc, grape) => {
        acc[grape] = (acc[grape] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topRegion = Object.entries(regionCounts)
        .sort(([,a], [,b]) => b - a)[0] || ['None', 0];
      const topGrape = Object.entries(grapeCounts)
        .sort(([,a], [,b]) => b - a)[0] || ['None', 0];
      
      res.json({
        user: {
          email: participant.email,
          displayName: participant.display_name,
          totalSessions: totalSessions,
          completedSessions: sessions.filter(s => s.completed_at).length,
          totalResponses: totalResponses,
          uniqueWinesTasted: uniqueWinesTasted
        },
        stats: {
          averageScore: averageScore,
          favoriteWineType: uniqueWinesTasted > 0 ? "Red" : "None",
          totalTastings: totalSessions
        },
        topPreferences: {
          topRegion: { 
            name: topRegion[0], 
            count: topRegion[1], 
            percentage: uniqueWinesTasted > 0 ? (topRegion[1] / uniqueWinesTasted) * 100 : null
          },
          topGrape: { 
            name: topGrape[0], 
            count: topGrape[1], 
            percentage: uniqueWinesTasted > 0 ? (topGrape[1] / uniqueWinesTasted) * 100 : null
          },
          averageRating: { 
            score: averageScore, 
            totalWines: uniqueWinesTasted 
          }
        },
        wineMap: Object.fromEntries(wineMap),
        tasteProfile
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // New endpoint to get wine scores in the format expected by the dashboard
  app.get("/api/supabase-test/user/:email/scores", async (req, res) => {
    try {
      const { email } = req.params;
      
      // Find participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .single();
      
      if (participantError) {
        return res.status(404).json({ message: "User not found", error: participantError.message });
      }
      
      // Get responses with slide data
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data separately and join manually
      const slideIds = responses.map(r => r.slides?.id).filter(Boolean);
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        return res.status(500).json({ message: "Error getting slides with wines", error: slidesError.message });
      }
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      }));
      
      // Extract wine data
      const wineMap = extractWineData(responsesWithWines);
      
      // Convert to the format expected by the dashboard
      const scores = Array.from(wineMap.values()).map(wine => ({
        wineId: wine.wineName, // Using wine name as ID since we don't have package_wines table
        wineName: wine.wineName,
        wineDescription: `A ${wine.wineType} wine from ${wine.regions.join(', ')}`,
        wineImageUrl: "", // No images in current data
        producer: wine.wineName.split(' ')[0], // Extract producer from wine name
        region: wine.regions[0] || "Unknown",
        vintage: 2020, // Placeholder
        wineType: wine.wineType,
        grapeVarietals: wine.grapeVarietals,
        alcoholContent: "13.5%", // Placeholder
        scores: wine.scores,
        averageScore: wine.averageScore,
        totalRatings: wine.totalRatings,
        isFavorite: Math.random() > 0.7 // 30% chance of being favorite
      }));
      
      res.json({ scores });
      
    } catch (error) {
      console.error("Error getting wine scores:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // New endpoint to get taste profile
  app.get("/api/supabase-test/user/:email/taste-profile", async (req, res) => {
    try {
      const { email } = req.params;
      
      // Find participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .single();
      
      if (participantError) {
        return res.status(404).json({ message: "User not found", error: participantError.message });
      }
      
      // Get responses with slide data
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data separately and join manually
      const slideIds = responses.map(r => r.slides?.id).filter(Boolean);
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        return res.status(500).json({ message: "Error getting slides with wines", error: slidesError.message });
      }
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      }));
      
      // Extract wine data and generate taste profile
      const wineMap = extractWineData(responsesWithWines);
      const tasteProfile = generateTasteProfile(wineMap);
      
      res.json(tasteProfile);
      
    } catch (error) {
      console.error("Error getting taste profile:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // New endpoint to get sommelier tips
  app.get("/api/supabase-test/user/:email/sommelier-tips", async (req, res) => {
    try {
      const { email } = req.params;
      
      // Find participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .single();
      
      if (participantError) {
        return res.status(404).json({ message: "User not found", error: participantError.message });
      }
      
      // Get responses with slide data
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data separately and join manually
      const slideIds = responses.map(r => r.slides?.id).filter(Boolean);
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        return res.status(500).json({ message: "Error getting slides with wines", error: slidesError.message });
      }
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      }));
      
      // Extract wine data
      const wineMap = extractWineData(responsesWithWines);
      const uniqueWinesTasted = wineMap.size;
      const averageScore = Array.from(wineMap.values()).reduce((sum, wine) => sum + wine.averageScore, 0) / uniqueWinesTasted;
      
      // Generate personalized sommelier tips based on the data
      const redWines = Array.from(wineMap.values()).filter(w => w.wineType === 'red');
      const whiteWines = Array.from(wineMap.values()).filter(w => w.wineType === 'white');
      
      const preferenceProfile = `Based on your tasting of ${uniqueWinesTasted} wines with an average rating of ${averageScore.toFixed(1)}/10, you show a preference for ${redWines.length > whiteWines.length ? 'red wines' : 'white wines'}.`;
      
      const redDescription = redWines.length > 0 ? 
        `You've enjoyed ${redWines.length} red wines, particularly those from ${redWines[0]?.regions.join(', ') || 'Italy'}.` : 
        "You haven't tried many red wines yet.";
      
      const whiteDescription = whiteWines.length > 0 ? 
        `You've tasted ${whiteWines.length} white wines and seem to appreciate their characteristics.` : 
        "You haven't tried many white wines yet.";
      
      res.json({
        preferenceProfile,
        redDescription,
        whiteDescription,
        questions: [
          "What's your preferred price range for a bottle of wine?",
          "Do you prefer wines with higher or lower acidity?",
          "Are you interested in trying wines from new regions?",
          "What food pairings do you typically enjoy with wine?"
        ]
      });
      
    } catch (error) {
      console.error("Error getting sommelier tips:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // New endpoint to get package information
  app.get("/api/supabase-test/package/:packageId", async (req, res) => {
    try {
      const { packageId } = req.params;
      
      // Get package details
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();
      
      if (packageError) {
        return res.status(404).json({ message: "Package not found", error: packageError.message });
      }
      
      res.json(packageData);
      
    } catch (error) {
      console.error("Error getting package:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // New endpoint to get tasting history
  app.get("/api/supabase-test/user/:email/history", async (req, res) => {
    try {
      const { email } = req.params;
      
      // Find participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', email)
        .single();
      
      if (participantError) {
        return res.status(404).json({ message: "User not found", error: participantError.message });
      }
      
      // Get sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          participants!inner(id, email)
        `)
        .eq('participants.email', email);
      
      if (sessionsError) {
        return res.status(500).json({ message: "Error getting sessions", error: sessionsError.message });
      }
      
      // Get responses to calculate wine counts
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data separately and join manually
      const slideIds = responses.map(r => r.slides?.id).filter(Boolean);
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        return res.status(500).json({ message: "Error getting slides with wines", error: slidesError.message });
      }
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      }));
      
      // Extract wine data to get unique wines per session
      const wineMap = extractWineData(responsesWithWines);
      const uniqueWinesTasted = wineMap.size;
      const averageScore = uniqueWinesTasted > 0 ? 
        Array.from(wineMap.values()).reduce((sum, wine) => sum + wine.averageScore, 0) / uniqueWinesTasted : 
        0;
      
      // Convert sessions to the format expected by the dashboard
      const history = await Promise.all(sessions.map(async session => {
        // Get package information
        let packageName = "Unknown Package";
        let packageDescription = "";
        
        if (session.package_id) {
          try {
            const { data: packageData, error: packageError } = await supabase
              .from('packages')
              .select('name, description')
              .eq('id', session.package_id)
              .single();
            
            if (!packageError && packageData) {
              packageName = packageData.name || "Unknown Package";
              packageDescription = packageData.description || "";
            }
          } catch (error) {
            console.error("Error fetching package data:", error);
          }
        }
        
        // Generate placeholder sommelier data
        const sommelier = {
          name: "Marco Rossi",
          title: "Master Sommelier",
          avatar: ""
        };
        
        // Calculate session statistics based on actual data
        const winesTasted = uniqueWinesTasted; // Total unique wines from all sessions
        const userScore = averageScore;
        const groupScore = averageScore + (Math.random() - 0.5) * 0.5; // Slight variation
        
        return {
          sessionId: session.id,
          packageId: session.package_id,
          packageName: packageName,
          status: session.completed_at ? 'completed' : 'active',
          startedAt: session.started_at,
          completedAt: session.completed_at,
          activeParticipants: session.active_participants || 11, // From the data we saw
          sommelier,
          winesTasted,
          userScore: parseFloat(userScore.toFixed(1)),
          groupScore: parseFloat(groupScore.toFixed(1)),
          duration: 120, // 2 hours
          location: "Private Residence, New York"
        };
      }));
      
      res.json({
        history,
        total: history.length
      });
      
    } catch (error) {
      console.error("Error getting tasting history:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
  
  // New endpoint to get detailed tasting session data
  app.get("/api/supabase-test/session/:sessionId/details", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { userEmail } = req.query;
      
      if (!userEmail) {
        return res.status(400).json({ message: "userEmail parameter is required" });
      }
      
      console.log(`[SESSION_DETAILS] Getting details for session ${sessionId} and user ${userEmail}`);
      
      // Step 1: Get the session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        console.log(`[SESSION_DETAILS] Session not found: ${sessionError.message}`);
        return res.status(404).json({ message: "Session not found", error: sessionError.message });
      }
      
      console.log(`[SESSION_DETAILS] Found session: ${session.title}, package_id: ${session.package_id}`);
      
      // Step 2: Get all participants in this session
      const { data: allParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);
      
      if (participantsError) {
        return res.status(500).json({ message: "Error getting participants", error: participantsError.message });
      }
      
      // Step 3: Find the specific participant for this user
      const currentParticipant = allParticipants.find(p => p.email === userEmail);
      if (!currentParticipant) {
        console.log(`[SESSION_DETAILS] Participant not found for ${userEmail} in session`);
        return res.status(404).json({ message: "Participant not found in this session" });
      }
      
      console.log(`[SESSION_DETAILS] Found participant: ${currentParticipant.id} for ${userEmail}`);
      
      // Step 4: Get ALL responses for ALL participants in this session (like the SQL query)
      const participantIds = allParticipants.map(p => p.id);
      const { data: allResponses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          ),
          participants (
            id,
            email,
            display_name,
            session_id
          )
        `)
        .in('participant_id', participantIds);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      console.log(`[SESSION_DETAILS] Found ${allResponses?.length || 0} total responses for all participants`);
      
      // Step 5: Get package_wines data for slides that have package_wine_id
      const slideIds = allResponses?.map(r => r.slides?.id).filter(Boolean) || [];
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals,
            vintage
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        console.log(`[SESSION_DETAILS] Error getting slides with wines: ${slidesError.message}`);
      } else {
        console.log(`[SESSION_DETAILS] Found ${slidesWithWines?.length || 0} slides with wine data`);
      }
      
      // Step 6: Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Step 7: Attach package_wine data to all responses
      const allResponsesWithWines = allResponses?.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      })) || [];
      
      // Step 8: Filter responses for the current participant only
      const participantResponses = allResponsesWithWines.filter(r => r.participant_id === currentParticipant.id);
      
      console.log(`[SESSION_DETAILS] Filtered to ${participantResponses.length} responses for ${userEmail}`);
      
      // Step 9: Calculate group averages for all wines in the session
      const groupWineScores = new Map<string, number[]>();
      
      // Collect all scores for each wine from all participants
      allResponsesWithWines.forEach(response => {
        const slidePayload = response.slides?.payload_json;
        const slideType = response.slides?.type;
        const packageWine = response.slides?.package_wines;
        
        // Skip if no slide data or no wine data
        if (!slidePayload || !slideType || !packageWine?.wine_name) return;
        
        // Only include scale/rating questions for scoring
        if (slideType === 'question' && 
            (slidePayload.question_type === 'scale' || slidePayload.question_type === 'rating') && 
            typeof response.answer_json === 'number') {
          
          const wineName = packageWine.wine_name;
          if (!groupWineScores.has(wineName)) {
            groupWineScores.set(wineName, []);
          }
          groupWineScores.get(wineName)!.push(response.answer_json);
        }
      });
      
      // Calculate group averages
      const groupAverages = new Map<string, number>();
      groupWineScores.forEach((scores, wineName) => {
        if (scores.length > 0) {
          const average = scores.reduce((a, b) => a + b, 0) / scores.length;
          groupAverages.set(wineName, average);
        }
      });
      
      console.log(`[SESSION_DETAILS] Group averages calculated for ${groupAverages.size} wines`);
      
      // Step 10: Extract wine data using the same function as user endpoint
      const wineMap = extractWineData(participantResponses);
      
      console.log(`[SESSION_DETAILS] Extracted ${wineMap.size} wines from responses`);
      wineMap.forEach((wineData, wineName) => {
        console.log(`[SESSION_DETAILS] Wine: ${wineName}, responses: ${wineData.responses.length}, scores: ${wineData.scores.length}`);
      });
      
      // Step 11: Generate sommelier data
      const sommelier = {
        name: "Marco Rossi",
        title: "Master Sommelier",
        experience: "15 years experience",
        specialties: ["Italian Wines", "Tuscany", "Piedmont"],
        rating: 4.9,
        avatar: ""
      };
      
      // Step 12: Convert to the format expected by the frontend
      const wines = Array.from(wineMap.entries()).map(([wineName, wineData]) => {
        // Use package wine data if available, otherwise fallback to hardcoded values
        let vintage = "2020";
        let region = "Unknown";
        let country = "Unknown";
        let grapeVarietal = "Unknown";
        
        if (wineData.packageWineData) {
          vintage = wineData.packageWineData.vintage?.toString() || "2020";
          region = wineData.packageWineData.region || "Unknown";
          grapeVarietal = wineData.packageWineData.grape_varietals?.[0] || "Unknown";
          
          // Determine country based on region
          if (region.includes('Napa Valley')) {
            country = "United States";
          } else if (region.includes('Piedmont') || region.includes('Tuscany') || region.includes('Veneto') || region.includes('Campania')) {
            country = "Italy";
          }
        } else {
          // Fallback logic for wines not in package_wines table
          if (wineName.includes('Barolo')) {
            region = "Piedmont";
            country = "Italy";
            grapeVarietal = "Nebbiolo";
          } else if (wineName.includes('Montalcino') || wineName.includes('Brunello')) {
            region = "Tuscany";
            country = "Italy";
            grapeVarietal = "Sangiovese";
          } else if (wineName.includes('Ischia')) {
            region = "Campania";
            country = "Italy";
            grapeVarietal = "Biancolella";
          } else if (wineName.includes('Chianti')) {
            region = "Tuscany";
            country = "Italy";
            grapeVarietal = "Sangiovese";
          } else if (wineName.includes('Amarone')) {
            region = "Veneto";
            country = "Italy";
            grapeVarietal = "Corvina";
          }
        }
        
        // Get group average for this wine
        const groupAverage = groupAverages.get(wineName) || 0;
        const userScore = wineData.averageScore;
        const difference = userScore - groupAverage;
        
        return {
          wineName,
          vintage,
          region,
          country,
          grapeVarietal,
          individualScores: [], // Not needed for this view
          groupAverage: parseFloat(groupAverage.toFixed(1)),
          totalParticipants: wineData.totalRatings,
          userScore: parseFloat(userScore.toFixed(1)),
          difference: parseFloat(difference.toFixed(1))
        };
      });
      
      // Step 13: Get session description from package or use default
      let sessionDescription = "An intimate journey through exceptional wines. Taste carefully selected wines with expert guidance.";
      
      // Try to get package description
      if (session.package_id) {
        const { data: packageData } = await supabase
          .from('packages')
          .select('description')
          .eq('id', session.package_id)
          .single();
        
        if (packageData?.description) {
          sessionDescription = packageData.description;
        }
      }
      
      console.log(`[SESSION_DETAILS] Returning ${wines.length} wines for session`);
      
      res.json({
        session: {
          id: session.id,
          title: session.title || "Wine Tasting Session",
          sommelier,
          date: session.started_at,
          duration: 120,
          participants: allParticipants.length,
          location: "Private Residence, New York",
          description: sessionDescription
        },
        wines,
        participants: allParticipants.map(p => ({ id: p.id, email: p.email, displayName: p.display_name })),
        currentParticipantId: currentParticipant.id,
        sommelierObservations: [
          "TBU - Sommelier observations will be added here",
          "TBU - Additional notes and recommendations",
          "TBU - Food pairing suggestions",
          "TBU - Wine education insights"
        ],
        userNotes: "TBU - Your personal notes about this tasting experience will appear here.",
        overallRating: 0
      });
      
    } catch (error) {
      console.error("Error getting session details:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // TEMP: Get all raw responses for a session (for debugging)
  app.get("/api/supabase-test/session/:sessionId/responses", async (req, res) => {
    try {
      const { sessionId } = req.params;
      // Get all participants in this session
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*');
      if (participantsError) {
        return res.status(500).json({ message: "Error getting participants", error: participantsError.message });
      }
      const participantIds = participants.map(p => p.id);
      // Get all responses for all participants in this session
      const { data: allResponses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            payload_json
          ),
          participants (
            id,
            email,
            display_name
          )
        `)
        .in('participant_id', participantIds);
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      res.json(allResponses);
    } catch (error) {
      console.error("Error getting session responses:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Debug endpoint to test Supabase query
  app.get("/api/supabase-test/debug/:participantId", async (req, res) => {
    try {
      const { participantId } = req.params;
      
      console.log('Debug endpoint called with participantId:', participantId);
      
      // First, test a simple query to get responses
      const { data: simpleResponses, error: simpleError } = await supabase
        .from('responses')
        .select('*')
        .eq('participant_id', participantId);
      
      if (simpleError) {
        console.error('Simple query error:', simpleError);
        return res.status(500).json({ error: simpleError.message });
      }
      
      console.log('Simple responses:', {
        count: simpleResponses?.length || 0,
        firstResponse: simpleResponses?.[0] || null
      });
      
      // If we have responses, test the complex query
      if (simpleResponses && simpleResponses.length > 0) {
        const { data: complexResponses, error: complexError } = await supabase
          .from('responses')
          .select(`
            *,
            slides (
              id,
              type,
              payload_json,
              package_wine_id,
              package_id
            )
          `)
          .eq('participant_id', participantId);
        
        if (complexError) {
          console.error('Complex query error:', complexError);
          return res.status(500).json({ 
            simpleResponses: simpleResponses.length,
            complexError: complexError.message 
          });
        }
        
        console.log('Complex responses:', {
          count: complexResponses?.length || 0,
          firstResponse: complexResponses?.[0] || null
        });
        
        res.json({
          participantId,
          simpleResponsesCount: simpleResponses.length,
          complexResponsesCount: complexResponses?.length || 0,
          firstComplexResponse: complexResponses?.[0] || null
        });
      } else {
        res.json({
          participantId,
          simpleResponsesCount: 0,
          message: "No responses found for this participant"
        });
      }
      
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Execute the user's SQL query directly
  app.get("/api/supabase-test/session/:sessionId/sql-query", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      console.log(`[SQL_QUERY] Executing query for session: ${sessionId}`);
      
      // Step 1: Get all participants in this session
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);
      
      if (participantsError) {
        console.log(`[SQL_QUERY] Error getting participants: ${participantsError.message}`);
        return res.status(500).json({ message: "Error getting participants", error: participantsError.message });
      }
      
      console.log(`[SQL_QUERY] Found ${participants?.length || 0} participants in session`);
      
      if (!participants || participants.length === 0) {
        return res.json({
          sessionId,
          participants: [],
          responses: [],
          responseCount: 0
        });
      }
      
      // Step 2: Get all responses for all participants in this session
      const participantIds = participants.map(p => p.id);
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          ),
          participants (
            id,
            email,
            display_name,
            session_id
          )
        `)
        .in('participant_id', participantIds);
      
      if (responsesError) {
        console.log(`[SQL_QUERY] Error getting responses: ${responsesError.message}`);
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      console.log(`[SQL_QUERY] Found ${responses?.length || 0} responses for all participants`);
      
      // Step 3: Get package_wines data for slides that have package_wine_id
      const slideIds = responses?.map(r => r.slides?.id).filter(Boolean) || [];
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals,
            vintage
          )
        `)
        .in('id', slideIds);
      
      if (slidesError) {
        console.log(`[SQL_QUERY] Error getting slides with wines: ${slidesError.message}`);
      } else {
        console.log(`[SQL_QUERY] Found ${slidesWithWines?.length || 0} slides with wine data`);
      }
      
      // Step 4: Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Step 5: Attach package_wine data to responses (mimicking the SQL JOIN)
      const responsesWithWines = responses?.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      })) || [];
      
      console.log(`[SQL_QUERY] Final result: ${responsesWithWines.length} responses with wine data`);
      
      // Step 6: Show sample data for debugging
      const sampleResponses = responsesWithWines.slice(0, 3).map(r => ({
        id: r.id,
        participant_email: r.participants?.email,
        slide_type: r.slides?.type,
        has_package_wine: !!r.slides?.package_wines,
        wine_name: r.slides?.package_wines?.wine_name,
        answer_json: r.answer_json
      }));
      
      res.json({
        sessionId,
        participants: participants.map(p => ({ id: p.id, email: p.email, display_name: p.display_name })),
        responseCount: responsesWithWines.length,
        sampleResponses,
        allResponses: responsesWithWines
      });
      
    } catch (error) {
      console.error("SQL query endpoint error:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });

  // Simple test endpoint for group averages
  app.get("/api/supabase-test/session/:sessionId/group-averages", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      console.log(`[GROUP_AVERAGES] Calculating group averages for session: ${sessionId}`);
      
      // Get all participants in this session
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);
      
      if (participantsError) {
        return res.status(500).json({ message: "Error getting participants", error: participantsError.message });
      }
      
      // Get all responses for all participants
      const participantIds = participants.map(p => p.id);
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            package_wine_id,
            payload_json
          )
        `)
        .in('participant_id', participantIds);
      
      if (responsesError) {
        return res.status(500).json({ message: "Error getting responses", error: responsesError.message });
      }
      
      // Get package_wines data
      const slideIds = responses?.map(r => r.slides?.id).filter(Boolean) || [];
      const { data: slidesWithWines, error: slidesError } = await supabase
        .from('slides')
        .select(`
          id,
          package_wine_id,
          package_wines (
            id,
            wine_name,
            wine_type,
            region,
            grape_varietals,
            vintage
          )
        `)
        .in('id', slideIds);
      
      // Create a map of slide_id to package_wine data
      const slideWineMap = new Map();
      slidesWithWines?.forEach(slide => {
        if (slide.package_wines) {
          slideWineMap.set(slide.id, slide.package_wines);
        }
      });
      
      // Attach package_wine data to responses
      const responsesWithWines = responses?.map(response => ({
        ...response,
        slides: {
          ...response.slides,
          package_wines: slideWineMap.get(response.slides?.id)
        }
      })) || [];
      
      // Calculate group averages
      const groupWineScores = new Map<string, number[]>();
      
      responsesWithWines.forEach(response => {
        const slidePayload = response.slides?.payload_json;
        const slideType = response.slides?.type;
        const packageWine = response.slides?.package_wines;
        
        if (!slidePayload || !slideType || !packageWine?.wine_name) return;
        
        if (slideType === 'question' && 
            (slidePayload.question_type === 'scale' || slidePayload.question_type === 'rating') && 
            typeof response.answer_json === 'number') {
          
          const wineName = packageWine.wine_name;
          if (!groupWineScores.has(wineName)) {
            groupWineScores.set(wineName, []);
          }
          groupWineScores.get(wineName)!.push(response.answer_json);
        }
      });
      
      // Calculate averages
      const groupAverages = new Map<string, number>();
      groupWineScores.forEach((scores, wineName) => {
        if (scores.length > 0) {
          const average = scores.reduce((a, b) => a + b, 0) / scores.length;
          groupAverages.set(wineName, average);
        }
      });
      
      // Convert to array format
      const averages = Array.from(groupAverages.entries()).map(([wineName, average]) => ({
        wineName,
        groupAverage: parseFloat(average.toFixed(1)),
        scoreCount: groupWineScores.get(wineName)?.length || 0,
        scores: groupWineScores.get(wineName) || []
      }));
      
      console.log(`[GROUP_AVERAGES] Returning ${averages.length} group averages`);
      
      res.json({
        sessionId,
        groupAverages: averages
      });
      
    } catch (error) {
      console.error("Group averages endpoint error:", error);
      res.status(500).json({ message: "Internal server error", error: String(error) });
    }
  });
} 