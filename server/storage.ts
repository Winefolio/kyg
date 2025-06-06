import {
  type Package,
  type InsertPackage,
  type PackageWine,
  type InsertPackageWine,
  type Slide,
  type InsertSlide,
  type Session,
  type InsertSession,
  type Participant,
  type InsertParticipant,
  type Response,
  type InsertResponse,
  type GlossaryTerm,
  type InsertGlossaryTerm,
  packages,
  packageWines,
  slides,
  sessions,
  participants,
  responses,
  glossaryTerms,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc } from "drizzle-orm";
import crypto from "crypto";

// Utility function to generate unique short codes
async function generateUniqueShortCode(length: number = 6): Promise<string> {
  const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"; // Removed O, 0 to avoid confusion
  let attempts = 0;
  const maxAttempts = 20; // Increased max attempts

  while (attempts < maxAttempts) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
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
  console.error(
    `Failed to generate a unique ${length}-char code after ${maxAttempts} attempts. Falling back.`,
  );
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

export interface IStorage {
  // Packages
  getPackageByCode(code: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;

  // Package Wines
  createPackageWine(wine: InsertPackageWine): Promise<PackageWine>;
  getPackageWines(packageId: string): Promise<PackageWine[]>;

  // Slides
  getSlidesByPackageWineId(packageWineId: string): Promise<Slide[]>;
  getSlideById(id: string): Promise<Slide | undefined>;
  createSlide(slide: InsertSlide): Promise<Slide>;

  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSessionById(
    id: string,
  ): Promise<(Session & { packageCode?: string }) | undefined>;
  updateSessionParticipantCount(
    sessionId: string,
    count: number,
  ): Promise<void>;
  updateSessionStatus(
    sessionId: string,
    status: string,
  ): Promise<Session | undefined>;

  // Participants
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantById(id: string): Promise<Participant | undefined>;
  getParticipantsBySessionId(sessionId: string): Promise<Participant[]>;
  updateParticipantProgress(
    participantId: string,
    progress: number,
  ): Promise<void>;

  // Responses
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesByParticipantId(participantId: string): Promise<Response[]>;
  getResponsesBySlideId(slideId: string): Promise<Response[]>;
  updateResponse(
    participantId: string,
    slideId: string,
    answerJson: any,
  ): Promise<Response>;

  // Analytics
  getAggregatedSessionAnalytics(sessionId: string): Promise<any>;

  // Package management for sommelier dashboard
  getAllPackages(): Promise<Package[]>;
  updatePackage(id: string, data: Partial<InsertPackage>): Promise<Package>;
  deletePackage(id: string): Promise<void>;
  getAllSessions(): Promise<Session[]>;

  // Wine management for sommelier dashboard
  createPackageWineFromDashboard(wine: InsertPackageWine): Promise<PackageWine>;
  updatePackageWine(id: string, data: Partial<InsertPackageWine>): Promise<PackageWine>;
  deletePackageWine(id: string): Promise<void>;

  // Slide management for slide editor
  updateSlide(id: string, data: Partial<InsertSlide>): Promise<Slide>;
  deleteSlide(id: string): Promise<void>;

  // Glossary
  getGlossaryTerms(): Promise<GlossaryTerm[]>;
  createGlossaryTerm(term: InsertGlossaryTerm): Promise<GlossaryTerm>;
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

    // Initialize glossary terms first
    await this.initializeGlossaryTerms();

    // Create the Bordeaux wine package
    const bordeauxPackage = await this.createPackage({
      code: "WINE01",
      name: "Bordeaux Discovery Collection",
      description:
        "Explore the finest wines from France's most prestigious region",
      sommelierId: null,
    });

    // Create additional packages
    const tuscanyPackage = await this.createPackage({
      code: "PABL01",
      name: "Tuscany Masterclass",
      description: "Journey through the rolling hills of Tuscany with exceptional Italian wines",
      sommelierId: null,
    });

    const napaPackage = await this.createPackage({
      code: "NAPA01",
      name: "Napa Valley Prestige",
      description: "Premium Californian wines from world-renowned Napa Valley",
      sommelierId: null,
    });

    // Create wines for Bordeaux package
    const chateauMargaux = await this.createPackageWine({
      packageId: bordeauxPackage.id,
      position: 1,
      wineName: "2018 Château Margaux",
      wineDescription: "A legendary Bordeaux from one of the most prestigious estates. Elegant and refined first growth with notes of blackcurrant, violets, and subtle oak.",
      wineImageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    const chateauLatour = await this.createPackageWine({
      packageId: bordeauxPackage.id,
      position: 2,
      wineName: "2019 Château Latour",
      wineDescription: "A powerful and elegant wine from Pauillac's premier grand cru classé. Dense, structured wine with cassis, cedar, and graphite minerality.",
      wineImageUrl: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    const chateauYquem = await this.createPackageWine({
      packageId: bordeauxPackage.id,
      position: 3,
      wineName: "2016 Château d'Yquem",
      wineDescription: "Legendary Sauternes dessert wine with honeyed apricot and botrytis complexity. A masterpiece of sweetness and acidity balance.",
      wineImageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    // Create wines for Tuscany package
    const brunello = await this.createPackageWine({
      packageId: tuscanyPackage.id,
      position: 1,
      wineName: "2017 Brunello di Montalcino",
      wineDescription: "Noble Sangiovese expressing the terroir of Montalcino with cherry, leather, and herbs. A wine of exceptional depth and complexity.",
      wineImageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    const chianti = await this.createPackageWine({
      packageId: tuscanyPackage.id,
      position: 2,
      wineName: "2019 Chianti Classico Riserva",
      wineDescription: "Traditional Tuscan blend with bright cherry, earth, and balanced oak aging. A perfect expression of Sangiovese.",
      wineImageUrl: "https://images.unsplash.com/photo-1547595628-c61a29f496f0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    // Create wines for Napa package
    const opusOne = await this.createPackageWine({
      packageId: napaPackage.id,
      position: 1,
      wineName: "2018 Opus One",
      wineDescription: "Iconic Bordeaux-style blend showcasing Napa's finest terroir with cassis and cedar. A collaboration between two wine legends.",
      wineImageUrl: "https://images.unsplash.com/photo-1474722883778-792e7990302f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    const screamingEagle = await this.createPackageWine({
      packageId: napaPackage.id,
      position: 2,
      wineName: "2019 Screaming Eagle Cabernet",
      wineDescription: "Cult Napa Cabernet with intense concentration and power. Dark fruits, chocolate, and spice in perfect harmony.",
      wineImageUrl: "https://images.unsplash.com/photo-1506377872b23-6629d73b7e06?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
    });

    // Define slide templates that will be used for both wines
    const slideTemplates = [
      {
        position: 1,
        type: "interlude",
        section_type: "intro",
        payloadJson: {
          title: "Welcome to Your Wine Tasting",
          description: "Let's begin our journey through this exceptional wine",
        },
      },
      {
        position: 2,
        type: "question",
        section_type: "intro",
        payloadJson: {
          title: "What aromas do you detect?",
          description:
            "Take a moment to swirl and smell. Select all the aromas you can identify.",
          question_type: "multiple_choice",
          category: "Aroma",
          options: [
            {
              id: "1",
              text: "Dark fruits (blackberry, plum)",
              description: "Rich, concentrated berry aromas",
            },
            {
              id: "2",
              text: "Vanilla and oak",
              description: "From barrel aging",
            },
            {
              id: "3",
              text: "Spices (pepper, clove)",
              description: "Complex spice notes",
            },
            {
              id: "4",
              text: "Floral notes",
              description: "Violet or rose petals",
            },
            {
              id: "5",
              text: "Earth and minerals",
              description: "Terroir characteristics",
            },
          ],
          allow_multiple: true,
          allow_notes: true,
        },
      },
      {
        position: 3,
        type: "question",
        section_type: "deep_dive",
        payloadJson: {
          title: "Rate the aroma intensity",
          description:
            "How strong are the aromas? 1 = Very light, 10 = Very intense",
          question_type: "scale",
          category: "Intensity",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Very Light", "Very Intense"],
          backgroundImage: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=400&fit=crop",
        },
      },
      {
        position: 4,
        type: "question",
        section_type: "deep_dive",
        payloadJson: {
          title: "Describe the taste profile",
          description: "Take a sip and identify the flavors you experience.",
          question_type: "multiple_choice",
          category: "Taste",
          backgroundImage: "https://images.unsplash.com/photo-1574982817-a0138501b8e7?w=600&h=400&fit=crop",
          options: [
            {
              id: "1",
              text: "Red fruits (cherry, raspberry)",
              description: "Bright fruit flavors",
            },
            {
              id: "2",
              text: "Dark fruits (blackcurrant, plum)",
              description: "Rich, deep fruit flavors",
            },
            {
              id: "3",
              text: "Chocolate and coffee",
              description: "Rich, roasted notes",
            },
            {
              id: "4",
              text: "Tobacco and leather",
              description: "Aged, complex flavors",
            },
            {
              id: "5",
              text: "Herbs and spices",
              description: "Savory elements",
            },
          ],
          allow_multiple: true,
          allow_notes: true,
        },
      },
      {
        position: 5,
        type: "question",
        section_type: "deep_dive",
        payloadJson: {
          title: "How would you describe the body?",
          description: "The weight and fullness of the wine in your mouth",
          question_type: "scale",
          category: "Body",
          scale_min: 1,
          scale_max: 5,
          scale_labels: ["Light Body", "Full Body"],
        },
      },
      {
        position: 6,
        type: "question",
        section_type: "deep_dive",
        payloadJson: {
          title: "Tannin level assessment",
          description:
            "How much dryness and grip do you feel on your gums and tongue?",
          question_type: "scale",
          category: "Tannins",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Soft Tannins", "Firm Tannins"],
        },
      },
      {
        position: 7,
        type: "question",
        section_type: "ending",
        payloadJson: {
          title: "How long is the finish?",
          description: "How long do the flavors linger after swallowing?",
          question_type: "scale",
          category: "Finish",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Short Finish", "Very Long Finish"],
        },
      },
      {
        position: 8,
        type: "video_message" as const,
        section_type: "ending",
        payloadJson: {
          title: "Sommelier's Tasting Notes",
          description: "Expert insights on this Bordeaux wine",
          video_url: "https://placeholder-video-url.com/bordeaux-tasting.mp4",
          poster_url: "https://placeholder-video-url.com/bordeaux-poster.jpg",
          autoplay: false,
          show_controls: true,
        },
      },
      {
        position: 9,
        type: "question" as const,
        payloadJson: {
          title: "Overall wine rating",
          description: "Your overall impression of this wine",
          question_type: "scale",
          category: "Overall",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Poor", "Excellent"],
        },
      },
    ];

    // Create slides for all wines
    for (const wine of [chateauMargaux, chateauLatour, chateauYquem, brunello, chianti, opusOne, screamingEagle]) {
      for (const slideTemplate of slideTemplates) {
        // Add wine context to slide payload
        let payloadJson = { ...slideTemplate.payloadJson };
        
        // For interlude slides, add wine image and name
        if (slideTemplate.type === "interlude") {
          payloadJson = {
            ...payloadJson,
            wine_name: wine.wineName,
            wine_image: wine.wineImageUrl
          } as any; // Type assertion for dynamic payload extension
        }

        await this.createSlide({
          packageWineId: wine.id,
          position: slideTemplate.position,
          type: slideTemplate.type as "question" | "media" | "interlude" | "video_message" | "audio_message",
          section_type: slideTemplate.section_type as "intro" | "deep_dive" | "ending" | null,
          payloadJson: payloadJson,
        });
      }
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
        description: pkg.description,
        sommelierId: pkg.sommelierId,
      })
      .returning();
    return result[0];
  }

  // Package Wine methods
  async createPackageWine(wine: InsertPackageWine): Promise<PackageWine> {
    const result = await db
      .insert(packageWines)
      .values({
        packageId: wine.packageId,
        position: wine.position,
        wineName: wine.wineName,
        wineDescription: wine.wineDescription,
        wineImageUrl: wine.wineImageUrl,
      })
      .returning();
    return result[0];
  }

  async getPackageWines(packageId: string): Promise<PackageWine[]> {
    const result = await db
      .select()
      .from(packageWines)
      .where(eq(packageWines.packageId, packageId))
      .orderBy(packageWines.position);
    return result;
  }

  // Slide methods
  async getSlidesByPackageWineId(packageWineId: string): Promise<Slide[]> {
    const result = await db
      .select()
      .from(slides)
      .where(eq(slides.packageWineId, packageWineId))
      .orderBy(slides.position);
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
        packageWineId: slide.packageWineId,
        position: slide.position,
        type: slide.type,
        section_type: slide.section_type,
        payloadJson: slide.payloadJson,
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
        status: session.status || "waiting", // Use provided status or default to 'waiting'
        completedAt: session.completedAt,
        activeParticipants: session.activeParticipants || 0,
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error("Failed to create session or return result.");
    }
    return result[0];
  }

  async getSessionById(
    id: string,
  ): Promise<(Session & { packageCode?: string }) | undefined> {
    let result: any[] = [];

    // Check if the ID looks like a UUID first
    const isUUID = id.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
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
          packageCode: packages.code,
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
          packageCode: packages.code,
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
          packageCode: packages.code,
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
      packageCode: sessionData.packageCode || undefined,
    };

    return session;
  }

  async updateSessionParticipantCount(
    sessionId: string,
    count: number,
  ): Promise<void> {
    await db
      .update(sessions)
      .set({ activeParticipants: count })
      .where(eq(sessions.id, sessionId));
  }

  async updateSessionStatus(
    sessionId: string,
    status: string,
  ): Promise<Session | undefined> {
    // Add validation for allowed status values
    const allowedStatuses = ["waiting", "active", "paused", "completed"];
    if (!allowedStatuses.includes(status)) {
      throw new Error(`Invalid session status: ${status}`);
    }

    const updatedSessions = await db
      .update(sessions)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    return updatedSessions[0];
  }

  // Participant methods
  async createParticipant(
    participant: InsertParticipant,
  ): Promise<Participant> {
    const result = await db
      .insert(participants)
      .values({
        sessionId: participant.sessionId,
        email: participant.email,
        displayName: participant.displayName,
        isHost: participant.isHost || false,
        progressPtr: participant.progressPtr || 0,
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

  async updateParticipantProgress(
    participantId: string,
    progress: number,
  ): Promise<void> {
    await db
      .update(participants)
      .set({
        progressPtr: progress,
        lastActive: new Date(),
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
        synced: response.synced || true,
      })
      .returning();
    return result[0];
  }

  async getResponsesByParticipantId(
    participantId: string,
  ): Promise<Response[]> {
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

  async updateResponse(
    participantId: string,
    slideId: string,
    answerJson: any,
  ): Promise<Response> {
    // First check if participant exists
    const participant = await this.getParticipantById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    // Use upsert with ON CONFLICT to handle race conditions
    const result = await db
      .insert(responses)
      .values({
        participantId,
        slideId,
        answerJson,
        synced: true,
      })
      .onConflictDoUpdate({
        target: [responses.participantId, responses.slideId],
        set: {
          answerJson,
          answeredAt: new Date(),
        },
      })
      .returning();

    return result[0];
  }

  // Analytics method
  async getAggregatedSessionAnalytics(sessionId: string): Promise<any> {
    // 1. Fetch session details and validate existence
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // 2. Get package details for the session
    const packageData = await db
      .select()
      .from(packages)
      .where(eq(packages.id, session.packageId!))
      .limit(1);

    // 3. Fetch all participants for this session
    const sessionParticipants =
      await this.getParticipantsBySessionId(sessionId);

    // 4. Fetch all package wines and their slides for this package
    const packageWines = await this.getPackageWines(session.packageId!);
    let sessionSlides: Slide[] = [];
    
    for (const wine of packageWines) {
      const wineSlides = await this.getSlidesByPackageWineId(wine.id);
      sessionSlides = sessionSlides.concat(wineSlides);
    }

    // 5. Fetch all responses for all participants in this session (optimized single query)
    const participantIds = sessionParticipants
      .map((p) => p.id)
      .filter((id) => id !== null);
    const sessionResponses =
      participantIds.length > 0
        ? await db
            .select()
            .from(responses)
            .where(inArray(responses.participantId, participantIds))
        : [];

    // Calculate overall session statistics
    const totalParticipants = sessionParticipants.length;
    const questionSlides = sessionSlides.filter(
      (slide) => slide.type === "question",
    );
    const totalQuestions = questionSlides.length;

    const completedParticipants = sessionParticipants.filter(
      (participant) => (participant.progressPtr || 0) >= totalQuestions,
    ).length;

    const averageProgressPercent =
      totalParticipants > 0
        ? Math.round(
            (sessionParticipants.reduce(
              (sum, p) => sum + (p.progressPtr || 0),
              0,
            ) /
              totalParticipants /
              totalQuestions) *
              100,
          )
        : 0;

    // Process slide-by-slide analytics
    const slidesAnalytics = [];

    for (const slide of questionSlides) {
      const slideResponses = sessionResponses.filter(
        (response) => response.slideId === slide.id,
      );
      const slidePayload = slide.payloadJson as any;

      let aggregatedData: any = {};

      if (slidePayload.question_type === "multiple_choice") {
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

          const percentage =
            slideResponses.length > 0
              ? Math.round((count / slideResponses.length) * 100)
              : 0;

          optionsSummary.push({
            optionId: option.id,
            optionText: option.text,
            count,
            percentage,
          });
        }

        // Count notes if allowed
        let notesSubmittedCount = 0;
        if (slidePayload.allow_notes) {
          notesSubmittedCount = slideResponses.filter((response) => {
            const answerData = response.answerJson as any;
            return (
              answerData &&
              answerData.notes &&
              answerData.notes.trim().length > 0
            );
          }).length;
        }

        aggregatedData = {
          optionsSummary,
          notesSubmittedCount,
        };
      } else if (slidePayload.question_type === "scale") {
        // Process scale questions
        const scores = slideResponses
          .map((response) => {
            const answerData = response.answerJson as any;
            // ROBUSTNESS FIX: Handle both numeric and object-based scale answers
            if (typeof answerData === "number") {
              return answerData;
            }
            if (typeof answerData === "object" && answerData !== null && typeof answerData.value === "number") {
              return answerData.value;
            }
            return null;
          })
          .filter((score): score is number => score !== null);

        if (scores.length > 0) {
          const averageScore =
            Math.round(
              (scores.reduce((sum, score) => sum + score, 0) / scores.length) *
                10,
            ) / 10;
          const minScore = Math.min(...scores);
          const maxScore = Math.max(...scores);

          // Create score distribution
          const scoreDistribution: { [key: string]: number } = {};
          for (const score of scores) {
            scoreDistribution[score.toString()] =
              (scoreDistribution[score.toString()] || 0) + 1;
          }

          aggregatedData = {
            averageScore,
            minScore,
            maxScore,
            scoreDistribution,
            totalResponses: scores.length,
          };
        } else {
          aggregatedData = {
            averageScore: 0,
            minScore: 0,
            maxScore: 0,
            scoreDistribution: {},
            totalResponses: 0,
          };
        }
      }

      slidesAnalytics.push({
        slideId: slide.id,
        slidePosition: slide.position,
        slideTitle: slidePayload.title || "Untitled Question",
        slideType: slide.type,
        questionType: slidePayload.question_type,
        totalResponses: slideResponses.length,
        aggregatedData,
      });
    }

    return {
      sessionId: session.id,
      sessionName: `Session ${session.id.substring(0, 8)}`, // Generate a session name
      packageName: packageData[0]?.name || "Unknown Package",
      packageCode: session.packageCode || "UNKNOWN",
      totalParticipants,
      completedParticipants,
      averageProgressPercent,
      totalQuestions,
      slidesAnalytics,
    };
  }

  private async initializeGlossaryTerms() {
    console.log("Initializing wine glossary terms...");
    
    const wineTerms = [
      {
        term: "tannins",
        variations: ["tannin", "tannic"],
        definition: "Natural compounds found in grape skins, seeds, and stems that create a dry, astringent sensation in your mouth. They provide structure and aging potential to red wines.",
        category: "Structure"
      },
      {
        term: "body",
        variations: ["full-bodied", "medium-bodied", "light-bodied"],
        definition: "The weight and fullness of wine in your mouth, ranging from light (like skim milk) to full (like cream). Influenced by alcohol content, tannins, and flavor concentration.",
        category: "Structure"
      },
      {
        term: "acidity",
        variations: ["acidic", "crisp", "bright"],
        definition: "The tartness or sharpness in wine that makes your mouth water. Good acidity provides freshness and helps wine pair well with food.",
        category: "Structure"
      },
      {
        term: "finish",
        variations: ["aftertaste", "length"],
        definition: "The lingering flavors and sensations that remain in your mouth after swallowing wine. A long finish is often a sign of quality.",
        category: "Tasting"
      },
      {
        term: "terroir",
        variations: [],
        definition: "The complete natural environment where grapes are grown, including soil, climate, and topography. It's what gives wine its sense of place.",
        category: "Viticulture"
      },
      {
        term: "vintage",
        variations: [],
        definition: "The year the grapes were harvested. Weather conditions during that year significantly impact the wine's character.",
        category: "Production"
      },
      {
        term: "oak",
        variations: ["oaked", "oaky"],
        definition: "Wood used for aging wine, imparting flavors like vanilla, spice, and toast while allowing subtle oxidation that softens the wine.",
        category: "Production"
      },
      {
        term: "bouquet",
        variations: ["nose", "aroma"],
        definition: "The complex scents that develop in wine as it ages, distinct from the primary fruit aromas of young wines.",
        category: "Aroma"
      },
      {
        term: "estate",
        variations: ["château", "domaine"],
        definition: "A winery that controls its own vineyards and winemaking process from grape to bottle, ensuring quality consistency.",
        category: "Production"
      },
      {
        term: "minerality",
        variations: ["mineral", "flinty"],
        definition: "A taste characteristic often described as wet stones or chalk, typically attributed to the soil composition where grapes are grown.",
        category: "Flavor"
      }
    ];

    for (const termData of wineTerms) {
      try {
        await this.createGlossaryTerm(termData);
      } catch (error) {
        // Term might already exist, skip
        console.log(`Glossary term "${termData.term}" already exists or failed to create`);
      }
    }
  }

  async getGlossaryTerms(): Promise<GlossaryTerm[]> {
    return await db.select().from(glossaryTerms).orderBy(glossaryTerms.term);
  }

  async createGlossaryTerm(term: InsertGlossaryTerm): Promise<GlossaryTerm> {
    const result = await db.insert(glossaryTerms).values(term).returning();
    return result[0];
  }

  // Package management methods for sommelier dashboard
  async getAllPackages(): Promise<Package[]> {
    const packagesData = await db.select().from(packages).orderBy(packages.createdAt);
    
    // For each package, fetch its wines
    const packagesWithWines = await Promise.all(
      packagesData.map(async (pkg) => {
        const wines = await this.getPackageWines(pkg.id);
        return {
          ...pkg,
          wines
        };
      })
    );
    
    return packagesWithWines;
  }

  async updatePackage(id: string, data: Partial<InsertPackage>): Promise<Package> {
    const [updatedPackage] = await db
      .update(packages)
      .set(data)
      .where(eq(packages.id, id))
      .returning();
    return updatedPackage;
  }

  async deletePackage(id: string): Promise<void> {
    await db.delete(packages).where(eq(packages.id, id));
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(sessions.id);
  }

  // Wine management methods for sommelier dashboard
  async createPackageWineFromDashboard(wine: InsertPackageWine): Promise<PackageWine> {
    // Get the next position for this package
    const existingWines = await this.getPackageWines(wine.packageId);
    const nextPosition = existingWines.length + 1;
    
    const wineData = {
      ...wine,
      position: nextPosition,
      wineType: wine.wineType || 'Red',
      vintage: wine.vintage || new Date().getFullYear() - 2,
      region: wine.region || 'Napa Valley',
      producer: wine.producer || 'Premium Winery',
      grapeVarietals: wine.grapeVarietals || ['Cabernet Sauvignon'],
      alcoholContent: wine.alcoholContent || '14.5%',
      expectedCharacteristics: wine.expectedCharacteristics || {
        aroma: ['Dark fruits', 'Oak', 'Vanilla'],
        taste: ['Bold', 'Full-bodied', 'Smooth tannins'],
        color: 'Deep ruby red',
        finish: 'Long and elegant'
      }
    };
    
    const [newWine] = await db.insert(packageWines).values(wineData).returning();
    return newWine;
  }

  async updatePackageWine(id: string, data: Partial<InsertPackageWine>): Promise<PackageWine> {
    const [updatedWine] = await db
      .update(packageWines)
      .set(data)
      .where(eq(packageWines.id, id))
      .returning();
    return updatedWine;
  }

  async deletePackageWine(id: string): Promise<void> {
    // First delete associated slides
    await db.delete(slides).where(eq(slides.packageWineId, id));
    // Then delete the wine
    await db.delete(packageWines).where(eq(packageWines.id, id));
  }

  async updateSlide(id: string, data: Partial<InsertSlide>): Promise<Slide> {
    const [updatedSlide] = await db
      .update(slides)
      .set(data)
      .where(eq(slides.id, id))
      .returning();
    return updatedSlide;
  }

  async deleteSlide(id: string): Promise<void> {
    await db.delete(slides).where(eq(slides.id, id));
  }

  // NEW: Get all packages with their associated wines for the dashboard
  async getAllPackagesWithWines(): Promise<(Package & { wines: PackageWine[] })[]> {
    const allPackages = await db.select().from(packages).orderBy(packages.createdAt);
    if (allPackages.length === 0) return [];

    const packageIds = allPackages.map(p => p.id);
    const allPackageWines = await db.select().from(packageWines)
      .where(inArray(packageWines.packageId, packageIds))
      .orderBy(packageWines.position);

    return allPackages.map(pkg => ({
      ...pkg,
      wines: allPackageWines.filter(wine => wine.packageId === pkg.id),
    }));
  }

  // NEW: Get a single package with all its wines and all their slides for the editor
  async getPackageWithWinesAndSlides(packageCode: string) {
    const pkg = await this.getPackageByCode(packageCode);
    if (!pkg) {
      return null;
    }

    const wines = await this.getPackageWines(pkg.id);
    if (wines.length === 0) {
      return { ...pkg, wines: [], slides: [] };
    }

    const wineIds = wines.map(w => w.id);
    const allSlidesForPackage = await db.select()
      .from(slides)
      .where(inArray(slides.packageWineId, wineIds))
      .orderBy(slides.position);

    return {
      ...pkg,
      wines,
      slides: allSlidesForPackage,
    };
  }

  // NEW: Update the order and wine assignment of multiple slides in a single transaction
  async updateSlidesOrder(slideUpdates: { slideId: string; packageWineId: string; position: number }[]) {
    if (slideUpdates.length === 0) return;
    return db.transaction(async (tx) => {
      await Promise.all(slideUpdates.map(update =>
        tx.update(slides)
          .set({ packageWineId: update.packageWineId, position: update.position })
          .where(eq(slides.id, update.slideId))
      ));
    });
  }
}

export const storage = new DatabaseStorage();
