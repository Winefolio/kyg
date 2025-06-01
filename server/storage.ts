import { 
  type Package, type InsertPackage,
  type Slide, type InsertSlide,
  type Session, type InsertSession,
  type Participant, type InsertParticipant,
  type Response, type InsertResponse,
  packages, slides, sessions, participants, responses
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc } from "drizzle-orm";
import crypto from 'crypto';

// Utility function to generate unique short codes
async function generateUniqueShortCode(length: number = 6): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Removed O, 0 to avoid confusion
  let attempts = 0;
  const maxAttempts = 20; // Increased max attempts

  while (attempts < maxAttempts) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existingSession = await db.query.sessions.findFirst({
      columns: { id: true }, // Only fetch necessary column for existence check
      where: eq(sessions.short_code, result),
    });

    if (!existingSession) {
      return result;
    }
    attempts++;
  }
  // Fallback if a unique code can't be generated (highly unlikely for 6 chars from 34 options if table isn't enormous)
  console.error(`Failed to generate a unique ${length}-char code after ${maxAttempts} attempts. Falling back.`);
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
}

export interface IStorage {
  // Packages
  getPackageByCode(code: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  
  // Slides
  getSlidesByPackageId(packageId: string, isHost?: boolean): Promise<Slide[]>;
  getSlideById(id: string): Promise<Slide | undefined>;
  createSlide(slide: InsertSlide): Promise<Slide>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSessionById(id: string): Promise<(Session & { packageCode?: string }) | undefined>;
  updateSessionParticipantCount(sessionId: string, count: number): Promise<void>;
  updateSessionStatus(sessionId: string, status: string): Promise<Session | undefined>;
  
  // Participants
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantById(id: string): Promise<Participant | undefined>;
  getParticipantsBySessionId(sessionId: string): Promise<Participant[]>;
  updateParticipantProgress(participantId: string, progress: number): Promise<void>;
  
  // Responses
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesByParticipantId(participantId: string): Promise<Response[]>;
  getResponsesBySlideId(slideId: string): Promise<Response[]>;
  updateResponse(participantId: string, slideId: string, answerJson: any): Promise<Response>;
  
  // Analytics
  getAggregatedSessionAnalytics(sessionId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeWineTastingData();
  }

  private async initializeWineTastingData() {
    // Check if data already exists
    const existingPackage = await this.getPackageByCode("WINE01");
    if (existingPackage) {
      return; // Data already exists
    }

    console.log("Initializing wine tasting data...");

    // Create the Bordeaux wine package
    const bordeauxPackage = await this.createPackage({
      code: "WINE01",
      name: "Bordeaux Discovery Collection",
      description: "Explore the finest wines from France's most prestigious region"
    });

    // Create all 8 wine tasting slides
    const slideData = [
      {
        position: 1,
        type: "interlude",
        payloadJson: {
          title: "Welcome to Your Wine Tasting",
          description: "Let's begin our journey through Bordeaux",
          wine_name: "2018 Château Margaux",
          wine_image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
        }
      },
      {
        position: 2,
        type: "question",
        payloadJson: {
          title: "What aromas do you detect?",
          description: "Take a moment to swirl and smell. Select all the aromas you can identify.",
          question_type: "multiple_choice",
          category: "Aroma",
          options: [
            { id: "1", text: "Dark fruits (blackberry, plum)", description: "Rich, concentrated berry aromas" },
            { id: "2", text: "Vanilla and oak", description: "From barrel aging" },
            { id: "3", text: "Spices (pepper, clove)", description: "Complex spice notes" },
            { id: "4", text: "Floral notes", description: "Violet or rose petals" },
            { id: "5", text: "Earth and minerals", description: "Terroir characteristics" }
          ],
          allow_multiple: true,
          allow_notes: true
        }
      },
      {
        position: 3,
        type: "question",
        payloadJson: {
          title: "Rate the aroma intensity",
          description: "How strong are the aromas? 1 = Very light, 10 = Very intense",
          question_type: "scale",
          category: "Intensity",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Very Light", "Very Intense"]
        }
      },
      {
        position: 4,
        type: "question",
        payloadJson: {
          title: "Describe the taste profile",
          description: "Take a sip and identify the flavors you experience.",
          question_type: "multiple_choice",
          category: "Taste",
          options: [
            { id: "1", text: "Red fruits (cherry, raspberry)", description: "Bright fruit flavors" },
            { id: "2", text: "Dark fruits (blackcurrant, plum)", description: "Rich, deep fruit flavors" },
            { id: "3", text: "Chocolate and coffee", description: "Rich, roasted notes" },
            { id: "4", text: "Tobacco and leather", description: "Aged, complex flavors" },
            { id: "5", text: "Herbs and spices", description: "Savory elements" }
          ],
          allow_multiple: true,
          allow_notes: true
        }
      },
      {
        position: 5,
        type: "question",
        payloadJson: {
          title: "How would you describe the body?",
          description: "The weight and fullness of the wine in your mouth",
          question_type: "scale",
          category: "Body",
          scale_min: 1,
          scale_max: 5,
          scale_labels: ["Light Body", "Full Body"]
        }
      },
      {
        position: 6,
        type: "question",
        payloadJson: {
          title: "Tannin level assessment",
          description: "How much dryness and grip do you feel on your gums and tongue?",
          question_type: "scale",
          category: "Tannins",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Soft Tannins", "Firm Tannins"]
        }
      },
      {
        position: 7,
        type: "question",
        payloadJson: {
          title: "How long is the finish?",
          description: "How long do the flavors linger after swallowing?",
          question_type: "scale",
          category: "Finish",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Short Finish", "Very Long Finish"]
        }
      },
      {
        position: 8,
        type: "question",
        payloadJson: {
          title: "Overall wine rating",
          description: "Your overall impression of this wine",
          question_type: "scale",
          category: "Overall",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Poor", "Excellent"]
        }
      }
    ];

    for (const slideInfo of slideData) {
      await this.createSlide({
        packageId: bordeauxPackage.id,
        position: slideInfo.position,
        type: slideInfo.type,
        payloadJson: slideInfo.payloadJson
      });
    }

    console.log("Wine tasting data initialized successfully!");
  }

  // Package methods
  async getPackageByCode(code: string): Promise<Package | undefined> {
    const result = await db
      .select()
      .from(packages)
      .where(eq(packages.code, code.toUpperCase()))
      .limit(1);
    return result[0];
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const result = await db
      .insert(packages)
      .values({
        code: pkg.code.toUpperCase(),
        name: pkg.name,
        description: pkg.description
      })
      .returning();
    return result[0];
  }

  // Slide methods
  async getSlidesByPackageId(packageId: string, isHost = false): Promise<Slide[]> {
    let result = await db
      .select()
      .from(slides)
      .where(eq(slides.packageId, packageId))
      .orderBy(slides.position);

    if (!isHost) {
      result = result.filter(slide => {
        const payload = slide.payloadJson as any;
        return !payload.for_host;
      });
    }

    return result;
  }

  async getSlideById(id: string): Promise<Slide | undefined> {
    const result = await db
      .select()
      .from(slides)
      .where(eq(slides.id, id))
      .limit(1);
    return result[0];
  }

  async createSlide(slide: InsertSlide): Promise<Slide> {
    const result = await db
      .insert(slides)
      .values({
        packageId: slide.packageId,
        position: slide.position,
        type: slide.type,
        payloadJson: slide.payloadJson
      })
      .returning();
    return result[0];
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const uniqueShortCode = await generateUniqueShortCode(6);

    const result = await db
      .insert(sessions)
      .values({
        packageId: session.packageId,
        short_code: uniqueShortCode,
        status: session.status || 'waiting', // Use provided status or default to 'waiting'
        completedAt: session.completedAt,
        activeParticipants: session.activeParticipants || 0
      })
      .returning();
    
    if (!result || result.length === 0) {
      throw new Error("Failed to create session or return result.");
    }
    return result[0];
  }

  async getSessionById(id: string): Promise<(Session & { packageCode?: string }) | undefined> {
    let result: any[] = [];
    
    // Check if the ID looks like a UUID first
    const isUUID = id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // Check if it's a 6-character short code
    const isShortCode = id.length === 6 && id.match(/^[A-Z0-9]{6}$/);
    
    if (isUUID) {
      // Try to find by session ID (UUID)
      result = await db
        .select({
          id: sessions.id,
          packageId: sessions.packageId,
          short_code: sessions.short_code,
          status: sessions.status,
          startedAt: sessions.startedAt,
          completedAt: sessions.completedAt,
          activeParticipants: sessions.activeParticipants,
          updatedAt: sessions.updatedAt,
          packageCode: packages.code
        })
        .from(sessions)
        .leftJoin(packages, eq(sessions.packageId, packages.id))
        .where(eq(sessions.id, id))
        .limit(1);
    } else if (isShortCode) {
      // Try to find by short code
      result = await db
        .select({
          id: sessions.id,
          packageId: sessions.packageId,
          short_code: sessions.short_code,
          status: sessions.status,
          startedAt: sessions.startedAt,
          completedAt: sessions.completedAt,
          activeParticipants: sessions.activeParticipants,
          updatedAt: sessions.updatedAt,
          packageCode: packages.code
        })
        .from(sessions)
        .leftJoin(packages, eq(sessions.packageId, packages.id))
        .where(eq(sessions.short_code, id.toUpperCase()))
        .limit(1);
    } else {
      // If not UUID or short code, treat as package code and find most recent active session
      result = await db
        .select({
          id: sessions.id,
          packageId: sessions.packageId,
          short_code: sessions.short_code,
          status: sessions.status,
          startedAt: sessions.startedAt,
          completedAt: sessions.completedAt,
          activeParticipants: sessions.activeParticipants,
          updatedAt: sessions.updatedAt,
          packageCode: packages.code
        })
        .from(sessions)
        .leftJoin(packages, eq(sessions.packageId, packages.id))
        .where(eq(packages.code, id.toUpperCase()))
        .orderBy(sessions.updatedAt)
        .limit(1);
    }
    
    const sessionData = result[0];
    if (!sessionData) return undefined;
    
    // Convert the result to match our expected type
    const session: Session & { packageCode?: string } = {
      id: sessionData.id,
      packageId: sessionData.packageId,
      short_code: sessionData.short_code,
      status: sessionData.status,
      startedAt: sessionData.startedAt,
      completedAt: sessionData.completedAt,
      activeParticipants: sessionData.activeParticipants,
      updatedAt: sessionData.updatedAt,
      packageCode: sessionData.packageCode || undefined
    };
    
    return session;
  }



  async updateSessionParticipantCount(sessionId: string, count: number): Promise<void> {
    await db
      .update(sessions)
      .set({ activeParticipants: count })
      .where(eq(sessions.id, sessionId));
  }

  async updateSessionStatus(sessionId: string, status: string): Promise<Session | undefined> {
    // Add validation for allowed status values
    const allowedStatuses = ['waiting', 'active', 'paused', 'completed'];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid session status: ${status}`);
    }

    const updatedSessions = await db
      .update(sessions)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    
    return updatedSessions[0];
  }

  // Participant methods
  async createParticipant(participant: InsertParticipant): Promise<Participant> {
    const result = await db
      .insert(participants)
      .values({
        sessionId: participant.sessionId,
        email: participant.email,
        displayName: participant.displayName,
        isHost: participant.isHost || false,
        progressPtr: participant.progressPtr || 0
      })
      .returning();
    return result[0];
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    const result = await db
      .select()
      .from(participants)
      .where(eq(participants.id, id))
      .limit(1);
    return result[0];
  }

  async getParticipantsBySessionId(sessionId: string): Promise<Participant[]> {
    return await db
      .select()
      .from(participants)
      .where(eq(participants.sessionId, sessionId));
  }

  async updateParticipantProgress(participantId: string, progress: number): Promise<void> {
    await db
      .update(participants)
      .set({ 
        progressPtr: progress,
        lastActive: new Date()
      })
      .where(eq(participants.id, participantId));
  }

  // Response methods
  async createResponse(response: InsertResponse): Promise<Response> {
    const result = await db
      .insert(responses)
      .values({
        participantId: response.participantId,
        slideId: response.slideId,
        answerJson: response.answerJson,
        synced: response.synced || true
      })
      .returning();
    return result[0];
  }

  async getResponsesByParticipantId(participantId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.participantId, participantId));
  }

  async getResponsesBySlideId(slideId: string): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.slideId, slideId));
  }

  async updateResponse(participantId: string, slideId: string, answerJson: any): Promise<Response> {
    // First check if participant exists
    const participant = await this.getParticipantById(participantId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    // Use upsert with ON CONFLICT to handle race conditions
    const result = await db
      .insert(responses)
      .values({
        participantId,
        slideId,
        answerJson,
        synced: true
      })
      .onConflictDoUpdate({
        target: [responses.participantId, responses.slideId],
        set: {
          answerJson,
          answeredAt: new Date()
        }
      })
      .returning();
    
    return result[0];
  }

  // Analytics method
  async getAggregatedSessionAnalytics(sessionId: string): Promise<any> {
    // 1. Fetch session details and validate existence
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // 2. Get package details for the session
    const packageData = await db
      .select()
      .from(packages)
      .where(eq(packages.id, session.packageId!))
      .limit(1);
    
    // 3. Fetch all participants for this session
    const sessionParticipants = await this.getParticipantsBySessionId(sessionId);
    
    // 4. Fetch all slides for this package
    const sessionSlides = await this.getSlidesByPackageId(session.packageId!, true); // Include host slides
    
    // 5. Fetch all responses for all participants in this session (optimized single query)
    const participantIds = sessionParticipants.map(p => p.id).filter(id => id !== null);
    const sessionResponses = participantIds.length > 0 
      ? await db
          .select()
          .from(responses)
          .where(inArray(responses.participantId, participantIds))
      : [];

    // Calculate overall session statistics
    const totalParticipants = sessionParticipants.length;
    const questionSlides = sessionSlides.filter(slide => slide.type === 'question');
    const totalQuestions = questionSlides.length;
    
    const completedParticipants = sessionParticipants.filter(
      participant => (participant.progressPtr || 0) >= totalQuestions
    ).length;

    const averageProgressPercent = totalParticipants > 0 
      ? Math.round((sessionParticipants.reduce((sum, p) => sum + (p.progressPtr || 0), 0) / totalParticipants / totalQuestions) * 100)
      : 0;

    // Process slide-by-slide analytics
    const slidesAnalytics = [];

    for (const slide of questionSlides) {
      const slideResponses = sessionResponses.filter(response => response.slideId === slide.id);
      const slidePayload = slide.payloadJson as any;
      
      let aggregatedData: any = {};

      if (slidePayload.question_type === 'multiple_choice') {
        // Process multiple choice questions
        const optionsSummary = [];
        const options = slidePayload.options || [];
        
        for (const option of options) {
          let count = 0;
          
          for (const response of slideResponses) {
            const answerData = response.answerJson as any;
            if (answerData && answerData.selected) {
              if (Array.isArray(answerData.selected)) {
                if (answerData.selected.includes(option.id)) {
                  count++;
                }
              } else if (answerData.selected === option.id) {
                count++;
              }
            }
          }
          
          const percentage = slideResponses.length > 0 ? Math.round((count / slideResponses.length) * 100) : 0;
          
          optionsSummary.push({
            optionId: option.id,
            optionText: option.text,
            count,
            percentage
          });
        }

        // Count notes if allowed
        let notesSubmittedCount = 0;
        if (slidePayload.allow_notes) {
          notesSubmittedCount = slideResponses.filter(response => {
            const answerData = response.answerJson as any;
            return answerData && answerData.notes && answerData.notes.trim().length > 0;
          }).length;
        }

        aggregatedData = {
          optionsSummary,
          notesSubmittedCount
        };

      } else if (slidePayload.question_type === 'scale') {
        // Process scale questions
        const scores = slideResponses
          .map(response => {
            const answerData = response.answerJson as any;
            return typeof answerData === 'number' ? answerData : null;
          })
          .filter(score => score !== null);

        if (scores.length > 0) {
          const averageScore = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
          const minScore = Math.min(...scores);
          const maxScore = Math.max(...scores);
          
          // Create score distribution
          const scoreDistribution: { [key: string]: number } = {};
          for (const score of scores) {
            scoreDistribution[score.toString()] = (scoreDistribution[score.toString()] || 0) + 1;
          }

          aggregatedData = {
            averageScore,
            minScore,
            maxScore,
            scoreDistribution,
            totalResponses: scores.length
          };
        } else {
          aggregatedData = {
            averageScore: 0,
            minScore: 0,
            maxScore: 0,
            scoreDistribution: {},
            totalResponses: 0
          };
        }
      }

      slidesAnalytics.push({
        slideId: slide.id,
        slidePosition: slide.position,
        slideTitle: slidePayload.title || 'Untitled Question',
        slideType: slide.type,
        questionType: slidePayload.question_type,
        totalResponses: slideResponses.length,
        aggregatedData
      });
    }

    return {
      sessionId: session.id,
      sessionName: `Session ${session.id.substring(0, 8)}`, // Generate a session name
      packageName: packageData[0]?.name || 'Unknown Package',
      packageCode: session.packageCode || 'UNKNOWN',
      totalParticipants,
      completedParticipants,
      averageProgressPercent,
      totalQuestions,
      slidesAnalytics
    };
  }
}

export const storage = new DatabaseStorage();
