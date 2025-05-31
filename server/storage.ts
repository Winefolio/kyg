import { 
  type Package, type InsertPackage,
  type Slide, type InsertSlide,
  type Session, type InsertSession,
  type Participant, type InsertParticipant,
  type Response, type InsertResponse,
  packages, slides, sessions, participants, responses
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
  getSessionById(id: string): Promise<Session | undefined>;
  updateSessionParticipantCount(sessionId: string, count: number): Promise<void>;
  
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
    const result = await db
      .insert(sessions)
      .values({
        packageId: session.packageId,
        completedAt: session.completedAt,
        activeParticipants: session.activeParticipants || 0
      })
      .returning();
    return result[0];
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);
    return result[0];
  }

  async updateSessionParticipantCount(sessionId: string, count: number): Promise<void> {
    await db
      .update(sessions)
      .set({ activeParticipants: count })
      .where(eq(sessions.id, sessionId));
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
    const existingResponse = await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.participantId, participantId),
          eq(responses.slideId, slideId)
        )
      )
      .limit(1);

    if (existingResponse.length > 0) {
      const updated = await db
        .update(responses)
        .set({ 
          answerJson,
          answeredAt: new Date()
        })
        .where(eq(responses.id, existingResponse[0].id))
        .returning();
      return updated[0];
    } else {
      return this.createResponse({ 
        participantId, 
        slideId, 
        answerJson, 
        synced: true 
      });
    }
  }
}

export const storage = new DatabaseStorage();
