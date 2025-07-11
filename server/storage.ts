import {
  type Package,
  type InsertPackage,
  type PackageWine,
  type InsertPackageWine,
  type Slide,
  type InsertSlide,
  type Session,
  type InsertSession,
  type SessionWineSelection,
  type InsertSessionWineSelection,
  type Participant,
  type InsertParticipant,
  type Response,
  type InsertResponse,
  type Media,
  type InsertMedia,
  type GlossaryTerm,
  type InsertGlossaryTerm,
  packages,
  packageWines,
  slides,
  sessions,
  sessionWineSelections,
  participants,
  responses,
  media,
  glossaryTerms,
  wineCharacteristics,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, gte, lt, asc, ne, sql, gt, isNull, isNotNull } from "drizzle-orm";
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
  getPackageById(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  generateUniqueShortCode(length: number): Promise<string>;

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

  // Session Wine Selections
  createSessionWineSelections(sessionId: string, selections: InsertSessionWineSelection[]): Promise<SessionWineSelection[]>;
  getSessionWineSelections(sessionId: string): Promise<(SessionWineSelection & { wine: PackageWine })[]>;
  updateSessionWineSelections(sessionId: string, selections: InsertSessionWineSelection[]): Promise<SessionWineSelection[]>;
  deleteSessionWineSelections(sessionId: string): Promise<void>;

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
  getParticipantAnalytics(sessionId: string, participantId: string): Promise<any>;
  getSessionResponses(sessionId: string): Promise<any[]>;

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

  // Wine Characteristics
  getWineCharacteristics(): Promise<any[]>;
  
  // Slide position operations
  updateSlidePosition(slideId: string, newPosition: number): Promise<void>;
  normalizeSlidePositions(packageWineId: string): Promise<void>;
  
  // Slide duplication
  duplicateWineSlides(sourceWineId: string, targetWineId: string, replaceExisting: boolean): Promise<{ count: number; slides: Slide[] }>;
  
  // Media
  createMedia(media: InsertMedia): Promise<Media>;
  getMediaByPublicId(publicId: string): Promise<Media | undefined>;
  getMediaById(id: string): Promise<Media | undefined>;
  updateMediaLastAccessed(id: string): Promise<void>;
  deleteMedia(id: string): Promise<void>;
  generateUniqueMediaPublicId(): Promise<string>;
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
        section_type: "ending",
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

    // Create package introduction slide for the first wine (acts as package intro)
    const firstWine = [chateauMargaux, chateauLatour, chateauYquem, brunello, chianti, opusOne, screamingEagle][0];
    
    // Create package introduction slide (position 1)
    await this.createSlide({
      packageWineId: firstWine.id,
      position: 1,
      type: "interlude",
      section_type: "intro",
      payloadJson: {
        title: "Welcome to Your Wine Tasting Experience",
        description: "You're about to embark on a journey through exceptional wines. Each wine has been carefully selected to showcase unique characteristics and flavors.",
        is_package_intro: true,
        package_name: "Premium Wine Tasting Collection",
        background_image: "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800&h=600&fit=crop"
      },
    });

    // Create slides for all wines with proper positioning
    let globalPosition = 2; // Start after package intro
    
    for (const wine of [chateauMargaux, chateauLatour, chateauYquem, brunello, chianti, opusOne, screamingEagle]) {
      // Create wine introduction slide first
      await this.createSlide({
        packageWineId: wine.id,
        position: globalPosition++,
        type: "interlude",
        section_type: "intro",
        payloadJson: {
          title: `Meet ${wine.wineName}`,
          description: wine.wineDescription || `Discover the unique characteristics of this exceptional ${wine.wineType} wine.`,
          wine_name: wine.wineName,
          wine_image: wine.wineImageUrl,
          wine_type: wine.wineType,
          wine_region: wine.region,
          wine_vintage: wine.vintage,
          is_welcome: true,
          is_wine_intro: true
        },
      });

      // Create remaining slides for this wine
      for (const slideTemplate of slideTemplates.slice(1)) { // Skip the first template since we created wine intro
        let payloadJson = { ...slideTemplate.payloadJson };
        
        // Add wine context to all slides
        payloadJson = {
          ...payloadJson,
          wine_name: wine.wineName,
          wine_image: wine.wineImageUrl,
          wine_type: wine.wineType
        } as any;

        await this.createSlide({
          packageWineId: wine.id,
          position: globalPosition++,
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

  async getPackageById(id: string): Promise<Package | undefined> {
    const result = await db
      .select()
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);
    return result[0];
  }

  async generateUniqueShortCode(length: number = 6): Promise<string> {
    const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"; // Removed O, 0 to avoid confusion
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }

      // Check if this code already exists in packages table
      const existingPackage = await db.query.packages.findFirst({
        columns: { id: true },
        where: eq(packages.code, result),
      });

      if (!existingPackage) {
        return result;
      }
      attempts++;
    }
    
    // Fallback if a unique code can't be generated
    console.error(
      `Failed to generate a unique ${length}-char code after ${maxAttempts} attempts. Falling back.`,
    );
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString("hex")
      .slice(0, length)
      .toUpperCase();
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const result = await db
      .insert(packages)
      .values({
        code: pkg.code.toUpperCase(),
        name: pkg.name,
        description: pkg.description,
        imageUrl: pkg.imageUrl,
        sommelierId: pkg.sommelierId,
      })
      .returning();
    
    const newPackage = result[0];
    
    // Create package introduction slide directly attached to the package
    await this.createPackageSlide({
      packageId: newPackage.id,
      position: 1,
      type: "interlude",
      section_type: "intro",
      payloadJson: {
        title: `Welcome to ${pkg.name}`,
        description: pkg.description || "You're about to embark on an exceptional wine tasting journey.",
        is_package_intro: true,
        package_name: pkg.name,
        package_image: (pkg as any).imageUrl || "",
        background_image: (pkg as any).imageUrl || ""
      },
    });
    
    return newPackage;
  }

  // Package Wine methods
  async createPackageWine(wine: InsertPackageWine): Promise<PackageWine> {
    const result = await db
      .insert(packageWines)
      .values({
        packageId: wine.packageId,
        position: wine.position || 0, // Provide default value for undefined position
        wineName: wine.wineName,
        wineDescription: wine.wineDescription,
        wineImageUrl: wine.wineImageUrl,
        wineType: wine.wineType,
        region: wine.region,
        vintage: wine.vintage,
      })
      .returning();
    
    const newWine = result[0];
    
    // Don't create intro slide for the special "Package Introduction" wine
    if (wine.wineName !== "Package Introduction") {
      // Create wine introduction slide
      await this.createSlide({
        packageWineId: newWine.id,
        position: 1,
        type: "interlude",
        section_type: "intro",
        payloadJson: {
          title: `Meet ${wine.wineName}`,
          description: wine.wineDescription || `Discover the unique characteristics of this exceptional wine.`,
          wine_name: wine.wineName,
          wine_image: wine.wineImageUrl || "",
          wine_type: wine.wineType || "",
          wine_region: wine.region || "",
          wine_vintage: wine.vintage || "",
          is_welcome: true,
          is_wine_intro: true
        },
      });
    }
    
    return newWine;
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
      .orderBy(slides.globalPosition);
    return result;
  }

  async getSlidesByPackageWineIds(packageWineIds: string[]): Promise<Slide[]> {
    if (packageWineIds.length === 0) return [];
    return await db
      .select()
      .from(slides)
      .where(inArray(slides.packageWineId, packageWineIds))
      .orderBy(slides.globalPosition);
  }

  async getSlidesByPackageId(packageId: string): Promise<Slide[]> {
    const result = await db
      .select()
      .from(slides)
      .where(eq(slides.packageId, packageId))
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

  async createPackageSlide(slide: Omit<InsertSlide, 'packageWineId'> & { packageId: string }): Promise<Slide> {
    // Auto-assign position if not provided
    let targetPosition = slide.position;
    if (!targetPosition) {
      const existingSlides = await db.select({ position: slides.position })
        .from(slides)
        .where(eq(slides.packageId, slide.packageId))
        .orderBy(desc(slides.position))
        .limit(1);
      
      targetPosition = (existingSlides[0]?.position || 0) + 1;
    }

    // Package-level slides use negative global positions to ensure they come before wine slides
    const targetGlobalPosition = -targetPosition;

    const result = await db
      .insert(slides)
      .values({
        packageId: slide.packageId,
        packageWineId: null, // Package-level slides don't belong to a wine
        position: targetPosition,
        globalPosition: targetGlobalPosition,
        type: slide.type,
        section_type: slide.section_type,
        payloadJson: slide.payloadJson,
        genericQuestions: slide.genericQuestions,
      })
      .returning();
    
    return result[0];
  }

  async createSlide(slide: InsertSlide): Promise<Slide> {
    // Validate payload type and provide defaults
    if (!slide.payloadJson || typeof slide.payloadJson !== 'object') {
      console.log('[SLIDE_CREATE] No payload provided, using minimal default for slide type:', slide.type);
      // Provide minimal default payload based on slide type
      slide.payloadJson = this.getDefaultPayloadForSlideType(slide.type);
    } else if (Object.keys(slide.payloadJson).length === 0) {
      console.log('[SLIDE_CREATE] Empty payload provided, using minimal default for slide type:', slide.type);
      // Provide minimal default payload for empty objects
      slide.payloadJson = this.getDefaultPayloadForSlideType(slide.type);
    }
    
    // Log slide creation for debugging
    console.log('[SLIDE_CREATE] Creating slide:', {
      type: slide.type,
      section_type: slide.section_type,
      position: slide.position,
      payloadKeys: Object.keys(slide.payloadJson)
    });
    
    // For wine-specific slides, get the wine to determine global position
    if (!slide.packageWineId) {
      throw new Error('createSlide requires packageWineId. Use createPackageSlide for package-level slides.');
    }
    
    const wine = await db
      .select()
      .from(packageWines)
      .where(eq(packageWines.id, slide.packageWineId))
      .limit(1);
    
    if (!wine[0]) {
      throw new Error('Wine not found');
    }

    // Calculate global position based on wine position
    let targetGlobalPosition: number;
    
    // Special handling for package intro (position 0)
    if (slide.payloadJson?.is_package_intro) {
      targetGlobalPosition = 0;
    } else {
      // Calculate base position for this wine
      const wineBasePosition = wine[0].position * 1000;
      
      // Add section offset
      let sectionOffset = 0;
      const sectionType = slide.section_type || 'intro'; // Default to intro if not specified
      
      if (sectionType === 'intro') {
        sectionOffset = slide.payloadJson?.is_wine_intro ? 10 : 50; // Wine intro at 10, other intros after
      } else if (sectionType === 'deep_dive') {
        sectionOffset = 100;
      } else if (sectionType === 'ending' || sectionType === 'conclusion') {
        sectionOffset = 200;
      }
      
      // Find the next available position in this section
      const existingSlides = await db
        .select({ globalPosition: slides.globalPosition })
        .from(slides)
        .where(
          and(
            eq(slides.packageWineId, slide.packageWineId),
            gte(slides.globalPosition, wineBasePosition + sectionOffset),
            lt(slides.globalPosition, wineBasePosition + sectionOffset + 100)
          )
        )
        .orderBy(desc(slides.globalPosition))
        .limit(1);
      
      const lastPositionInSection = existingSlides[0]?.globalPosition || (wineBasePosition + sectionOffset);
      targetGlobalPosition = lastPositionInSection + 10; // Use 10 as gap
    }

    // Auto-assign local position if not provided
    let targetPosition = slide.position;
    if (!targetPosition) {
      const existingSlides = await db.select({ position: slides.position })
        .from(slides)
        .where(eq(slides.packageWineId, slide.packageWineId!))
        .orderBy(desc(slides.position))
        .limit(1);
      
      targetPosition = (existingSlides[0]?.position || 0) + 1;
    }

    const result = await db
      .insert(slides)
      .values({
        packageWineId: slide.packageWineId,
        position: targetPosition,
        globalPosition: targetGlobalPosition,
        type: slide.type,
        section_type: slide.section_type,
        payloadJson: slide.payloadJson,
        genericQuestions: slide.genericQuestions,
      })
      .returning();
    
    const newSlide = result[0];
    
    // Check for orphaned media records that need to be linked to this slide
    // Look for temporary IDs in the payload that might have associated media
    const payloadStr = JSON.stringify(slide.payloadJson);
    const tempIdPattern = /temp-question-\d+/g;
    const tempIds = payloadStr.match(tempIdPattern) || [];
    
    if (tempIds.length > 0) {
      console.log(`[SLIDE_CREATE] Found temporary IDs in payload, checking for orphaned media: ${tempIds.join(', ')}`);
      
      for (const tempId of tempIds) {
        await this.updateMediaEntityId(tempId, newSlide.id, 'slide');
      }
    }
    
    // Also check for media with publicId references in the payload
    if (slide.payloadJson) {
      const publicIds: string[] = [];
      
      // Check for video/audio publicId fields
      if (slide.payloadJson.video_publicId) publicIds.push(slide.payloadJson.video_publicId);
      if (slide.payloadJson.audio_publicId) publicIds.push(slide.payloadJson.audio_publicId);
      
      if (publicIds.length > 0) {
        console.log(`[SLIDE_CREATE] Found media publicIds in payload, updating entity references: ${publicIds.join(', ')}`);
        
        for (const publicId of publicIds) {
          await this.updateMediaByPublicId(publicId, newSlide.id);
        }
      }
    }
    
    return newSlide;
  }

  async updateMediaEntityId(originalEntityId: string, newEntityId: string, entityType: 'slide' | 'wine' | 'package'): Promise<void> {
    try {
      // Find media records with the temporary ID in metadata
      const orphanedMedia = await db
        .select()
        .from(media)
        .where(
          and(
            eq(media.entityType, entityType),
            eq(sql`metadata->>'originalEntityId'`, originalEntityId)
          )
        );
      
      if (orphanedMedia.length > 0) {
        console.log(`[MEDIA_UPDATE] Found ${orphanedMedia.length} orphaned media records for ${originalEntityId}`);
        
        // Update each media record with the real entity ID
        for (const record of orphanedMedia) {
          await db
            .update(media)
            .set({ 
              entityId: newEntityId,
              metadata: {
                ...(record.metadata || {}),
                originalEntityId,
                updatedAt: new Date().toISOString(),
                linkedAt: new Date().toISOString()
              }
            })
            .where(eq(media.id, record.id));
          
          console.log(`[MEDIA_UPDATE] Updated media ${record.publicId} from temp ID ${originalEntityId} to slide ${newEntityId}`);
        }
      }
    } catch (error) {
      console.error(`[MEDIA_UPDATE] Error updating media records:`, error);
      // Don't throw - this is a best-effort operation
    }
  }

  async updateMediaByPublicId(publicId: string, newEntityId: string): Promise<void> {
    try {
      const result = await db
        .update(media)
        .set({ 
          entityId: newEntityId,
          metadata: sql`jsonb_set(metadata, '{linkedAt}', to_jsonb(now()::text))`
        })
        .where(
          and(
            eq(media.publicId, publicId),
            isNull(media.entityId) // Only update if not already linked
          )
        );
      
      console.log(`[MEDIA_UPDATE] Updated media ${publicId} to entity ${newEntityId}`);
    } catch (error) {
      console.error(`[MEDIA_UPDATE] Error updating media by publicId:`, error);
      // Don't throw - this is a best-effort operation
    }
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
    // Enhanced logging for debugging
    console.log(`[STORAGE_TRACE] createParticipant called with:`, {
      sessionId: participant.sessionId,
      sessionIdType: typeof participant.sessionId,
      sessionIdLength: participant.sessionId?.length,
      email: participant.email,
      displayName: participant.displayName,
      isHost: participant.isHost
    });
    
    // Validate sessionId is a proper UUID before insertion
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!participant.sessionId || !uuidRegex.test(participant.sessionId)) {
      console.error(`[STORAGE_ERROR] Invalid sessionId format for participant creation:`, {
        sessionId: participant.sessionId,
        sessionIdType: typeof participant.sessionId,
        isValidFormat: participant.sessionId ? uuidRegex.test(participant.sessionId) : false
      });
      throw new Error(`Invalid sessionId format: ${participant.sessionId}. Expected UUID format.`);
    }
    
    try {
      console.log(`[STORAGE] Creating participant with data:`, JSON.stringify({
        sessionId: participant.sessionId,
        email: participant.email,
        displayName: participant.displayName,
        isHost: participant.isHost || false
      }, null, 2));
      
      // Log the exact values being inserted
      const insertValues = {
        sessionId: participant.sessionId,
        email: participant.email,
        displayName: participant.displayName,
        isHost: participant.isHost || false,
        progressPtr: participant.progressPtr || 0,
      };
      
      console.log(`[STORAGE_TRACE] About to insert participant with values:`, JSON.stringify(insertValues, null, 2));
      
      const result = await db
        .insert(participants)
        .values(insertValues)
        .returning();
        
      if (!result || result.length === 0) {
        throw new Error('Failed to create participant - no record returned from database');
      }
        
      console.log(`[STORAGE] Successfully created participant: ${result[0].id}`);
      return result[0];
    } catch (error: any) {
      console.error(`[STORAGE_ERROR] Failed to create participant:`, {
        error: error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetail: error?.detail,
        errorTable: error?.table,
        errorColumn: error?.column,
        errorConstraint: error?.constraint,
        participantData: participant
      });
      throw error; // Re-throw to be handled by the route
    }
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

  async getParticipantByEmailInSession(sessionId: string, email: string): Promise<Participant | undefined> {
    const result = await db
      .select()
      .from(participants)
      .where(and(
        eq(participants.sessionId, sessionId),
        eq(participants.email, email)
      ))
      .limit(1);
    return result[0];
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

  async updateParticipantDisplayName(
    participantId: string,
    displayName: string,
  ): Promise<void> {
    await db
      .update(participants)
      .set({
        displayName,
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

    // 4. Fetch all package wines and their slides for this package (optimized)
    const packageWines = await this.getPackageWines(session.packageId!);
    const wineIds = packageWines.map(w => w.id);
    
    // Get all slides for all wines in one query
    const sessionSlides = wineIds.length > 0 
      ? await db
          .select()
          .from(slides)
          .where(inArray(slides.packageWineId, wineIds))
          .orderBy(slides.globalPosition)
      : [];

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
        // Process scale questions with validation
        const scaleMin = slidePayload.scale_min || slidePayload.min_value || 1;
        const scaleMax = slidePayload.scale_max || slidePayload.max_value || 10;
        
        const scores = slideResponses
          .map((response) => {
            const answerData = response.answerJson as any;
            let rawValue: number | null = null;
            
            // Extract numeric value from different answer formats
            if (typeof answerData === "number") {
              rawValue = answerData;
            } else if (typeof answerData === "object" && answerData !== null && typeof answerData.value === "number") {
              rawValue = answerData.value;
            }
            
            // Validate and clamp the value to scale bounds
            if (rawValue !== null) {
              const clampedValue = Math.max(scaleMin, Math.min(scaleMax, rawValue));
              
              // Log if we had to clamp the value (indicates data corruption)
              if (clampedValue !== rawValue) {
                console.warn(`🔧 Analytics: Scale value clamped from ${rawValue} to ${clampedValue} (scale: ${scaleMin}-${scaleMax})`);
              }
              
              return clampedValue;
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

  // Participant-specific analytics for enhanced completion experience
  async getParticipantAnalytics(sessionId: string, participantId: string): Promise<any> {
    // 1. Validate session and participant existence
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const participant = await this.getParticipantById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }
    
    // CRITICAL FIX: Compare against resolved session.id, not input sessionId
    if (participant.sessionId !== session.id) {
      throw new Error("Participant not found");
    }

    // 2. Get aggregated session data for group comparisons
    const sessionAnalytics = await this.getAggregatedSessionAnalytics(session.id);

    // 3. Get participant's individual responses
    const participantResponses = await this.getResponsesByParticipantId(participantId);

    // 4. Get package and wine data
    const packageWines = await this.getPackageWines(session.packageId!);
    // Fetch all slides for all wines in a single query (optimized)
    const wineIds = packageWines.map(w => w.id);
    const allSlides: Slide[] = wineIds.length > 0
      ? await db
          .select()
          .from(slides)
          .where(inArray(slides.packageWineId, wineIds))
          .orderBy(slides.globalPosition)
      : [];

    const questionSlides = allSlides.filter(slide => slide.type === "question");

    // 5. Calculate participant-specific metrics
    const personalSummary = {
      questionsAnswered: participantResponses.length,
      completionPercentage: Math.round((participantResponses.length / questionSlides.length) * 100),
      winesExplored: packageWines.length,
      notesWritten: participantResponses.filter(r => {
        const answer = r.answerJson as any;
        return answer && answer.notes && answer.notes.trim().length > 0;
      }).length,
      sessionDuration: participant.lastActive && session.startedAt 
        ? Math.round((new Date(participant.lastActive).getTime() - new Date(session.startedAt).getTime()) / 60000)
        : 0
    };

    // 6. Generate wine-by-wine breakdown with comparisons
    const wineBreakdowns = packageWines.map(wine => {
      const wineSlides = allSlides.filter(slide => slide.packageWineId === wine.id && slide.type === "question");
      const wineResponses = participantResponses.filter(response => 
        wineSlides.some(slide => slide.id === response.slideId)
      );

      const questionAnalysis = wineSlides.map(slide => {
        const participantResponse = participantResponses.find(r => r.slideId === slide.id);
        const slideAnalytics = sessionAnalytics.slidesAnalytics.find((s: any) => s.slideId === slide.id);
        const slidePayload = slide.payloadJson as any;

        let comparison = null;
        
        // Always create a comparison object if user has answered, even without group data
        if (participantResponse) {
          if (slidePayload.question_type === "scale") {
            const userAnswer = typeof participantResponse.answerJson === "number" 
              ? participantResponse.answerJson 
              : (participantResponse.answerJson as any)?.value || 0;
            
            if (slideAnalytics && slideAnalytics.aggregatedData.averageScore !== undefined) {
              // Group data available - calculate comparison
              const groupAverage = slideAnalytics.aggregatedData.averageScore;
              const difference = Math.abs(userAnswer - groupAverage);
              
              // More nuanced alignment calculation
              let alignment: string;
              let alignmentLevel: string;
              if (difference === 0) {
                alignment = "perfect";
                alignmentLevel = "Perfectly Aligned";
              } else if (difference <= 1) {
                alignment = "close";
                alignmentLevel = "Closely Aligned";
              } else if (difference <= 2) {
                alignment = "somewhat";
                alignmentLevel = "Somewhat Aligned";
              } else if (difference <= 4) {
                alignment = "different";
                alignmentLevel = "Different";
              } else {
                alignment = "unique";
                alignmentLevel = "Unique Perspective";
              }
              
              comparison = {
                yourAnswer: userAnswer,
                groupAverage: groupAverage,
                differenceFromGroup: userAnswer - groupAverage,
                alignment: alignment,
                alignmentLevel: alignmentLevel,
                percentageMatch: Math.max(0, 100 - (difference * 10)), // 0-100% match score
                hasGroupData: true
              };
            } else {
              // No group data - show skeleton with user's answer only
              comparison = {
                yourAnswer: userAnswer,
                groupAverage: null,
                differenceFromGroup: null,
                alignment: "no_data",
                alignmentLevel: "No Group Data Yet",
                percentageMatch: null,
                hasGroupData: false
              };
            }
          } else if (slidePayload.question_type === "multiple_choice") {
            const userSelections = (participantResponse.answerJson as any)?.selected || [];
            const userSelectionsArray = Array.isArray(userSelections) ? userSelections : [userSelections];
            const optionsSummary = slideAnalytics?.aggregatedData?.optionsSummary || [];
            
            if (optionsSummary.length === 0 || !slideAnalytics) {
              // No group data - show skeleton with user's answer only
              // Get option text from slide payload
              const options = slidePayload.options || [];
              const userAnswerTexts = userSelectionsArray.map((id: string) => {
                const option = options.find((opt: any) => opt.id === id);
                return option?.text || id;
              });
              
              comparison = {
                yourAnswer: userSelectionsArray,
                yourAnswerText: userAnswerTexts,
                mostPopular: "No group data yet",
                mostPopularPercentage: 0,
                alignment: "no_data",
                alignmentLevel: "No Group Data Yet",
                consensusScore: 0,
                hasGroupData: false
              };
            } else {
              // Sort options by popularity
              const sortedOptions = optionsSummary.sort((a: any, b: any) => b.percentage - a.percentage);
              const topTwoOptions = sortedOptions.slice(0, 2);
              const top50PercentOptions = sortedOptions.filter((opt: any) => opt.percentage >= 10); // At least 10% popularity
              
              // Calculate alignment score
              let matchedPopularChoices = 0;
              let totalPopularityMatched = 0;
              
              userSelectionsArray.forEach((userChoice: string) => {
                const matchedOption = sortedOptions.find((opt: any) => opt.optionId === userChoice);
                if (matchedOption) {
                  totalPopularityMatched += matchedOption.percentage;
                  if (topTwoOptions.find((opt: any) => opt.optionId === userChoice)) {
                    matchedPopularChoices++;
                  }
                }
              });
              
              // Determine alignment level
              let alignment: string;
              let alignmentLevel: string;
              
              if (matchedPopularChoices >= 2) {
                alignment = "strong_consensus";
                alignmentLevel = "Strong Consensus";
              } else if (userSelectionsArray.includes(sortedOptions[0]?.optionId)) {
                alignment = "agrees";
                alignmentLevel = "Aligned";
              } else if (userSelectionsArray.some((choice: string) => 
                top50PercentOptions.find((opt: any) => opt.optionId === choice))) {
                alignment = "partial";
                alignmentLevel = "Partial Alignment";
              } else {
                alignment = "unique";
                alignmentLevel = "Unique Taste";
              }
              
              comparison = {
                yourAnswer: userSelectionsArray,
                mostPopular: sortedOptions[0]?.optionText || "N/A",
                mostPopularPercentage: sortedOptions[0]?.percentage || 0,
                alignment: alignment,
                alignmentLevel: alignmentLevel,
                consensusScore: Math.round(totalPopularityMatched), // Total % popularity of user's choices
                matchedPopularChoices: matchedPopularChoices,
                hasGroupData: true
              };
            }
          }
        }

        return {
          question: slidePayload.title || "Question",
          questionType: slidePayload.question_type,
          answered: !!participantResponse,
          comparison,
          insight: this.generateQuestionInsight(comparison, slidePayload)
        };
      });

      return {
        wineId: wine.id,
        wineName: wine.wineName,
        wineDescription: wine.wineDescription,
        wineImageUrl: wine.wineImageUrl,
        questionsAnswered: wineResponses.length,
        totalQuestions: wineSlides.length,
        questionAnalysis
      };
    });

    // 7. Generate tasting personality based on answer patterns
    const tastingPersonality = this.generateTastingPersonality(participantResponses, questionSlides);

    // 8. Calculate achievements
    const achievements = this.calculateAchievements(participantResponses, questionSlides, sessionAnalytics);

    // 9. Generate insights and recommendations
    const insights = this.generatePersonalInsights(participantResponses, sessionAnalytics, wineBreakdowns);

    return {
      participantId,
      sessionId,
      personalSummary,
      wineBreakdowns,
      tastingPersonality,
      achievements,
      insights,
      recommendations: this.generateWineRecommendations(tastingPersonality, participantResponses)
    };
  }

  // Helper method to generate question-specific insights
  private generateQuestionInsight(comparison: any, slidePayload: any): string {
    if (!comparison) return "No comparison data available";

    if (slidePayload.question_type === "scale") {
      const diff = Math.abs(comparison.differenceFromGroup);
      if (diff <= 0.5) return "You aligned closely with the group average";
      if (diff <= 1.5) return comparison.differenceFromGroup > 0 
        ? "You rated this higher than most" 
        : "You rated this lower than most";
      return comparison.differenceFromGroup > 0 
        ? "You detected much stronger intensity than others" 
        : "You found this more subtle than most participants";
    }

    if (slidePayload.question_type === "multiple_choice") {
      return comparison.alignment === "agrees" 
        ? "You agreed with the majority choice" 
        : "You had a unique perspective compared to others";
    }

    return "Response recorded";
  }

  // Helper method to generate tasting personality
  private generateTastingPersonality(responses: Response[], slides: Slide[]): any {
    // Analyze answer patterns to determine personality type
    const scaleResponses = responses.filter(r => {
      const slide = slides.find(s => s.id === r.slideId);
      return slide && (slide.payloadJson as any).question_type === "scale";
    });

    if (scaleResponses.length === 0) {
      return {
        type: "Emerging Taster",
        description: "Just beginning your wine journey",
        characteristics: ["Open to learning", "Developing palate"]
      };
    }

    const averageRating = scaleResponses.reduce((sum, r) => {
      let rawValue = typeof r.answerJson === "number" ? r.answerJson : (r.answerJson as any)?.value || 5;
      
      // Validate and clamp scale values to expected range (1-10)
      const clampedValue = Math.max(1, Math.min(10, rawValue));
      
      // Log if we had to clamp the value (indicates data corruption)
      if (clampedValue !== rawValue) {
        console.warn(`🔧 Personality: Scale value clamped from ${rawValue} to ${clampedValue}`);
      }
      
      return sum + clampedValue;
    }, 0) / scaleResponses.length;

    const hasNotes = responses.some(r => (r.answerJson as any)?.notes?.trim().length > 0);

    if (averageRating >= 7.5) {
      return {
        type: "Bold Explorer",
        description: "You appreciate intense, full-bodied wines with strong characteristics",
        characteristics: ["Seeks bold flavors", "Appreciates intensity", "Confident palate"]
      };
    } else if (averageRating <= 4.5) {
      return {
        type: "Subtle Sophisticate", 
        description: "You prefer elegant, nuanced wines with delicate complexity",
        characteristics: ["Values subtlety", "Appreciates nuance", "Refined taste"]
      };
    } else if (hasNotes) {
      return {
        type: "Detail Detective",
        description: "You pay close attention to wine characteristics and love to analyze",
        characteristics: ["Analytical approach", "Detailed observations", "Thorough taster"]
      };
    } else {
      return {
        type: "Balanced Appreciator",
        description: "You enjoy a wide range of wine styles with balanced preferences",
        characteristics: ["Open-minded", "Balanced palate", "Versatile preferences"]
      };
    }
  }

  // Helper method to calculate achievements
  private calculateAchievements(responses: Response[], slides: Slide[], sessionAnalytics: any): any[] {
    const achievements = [];

    // Completion achievements
    if (responses.length === slides.length) {
      achievements.push({
        id: "perfect_completion",
        name: "Perfect Completion",
        description: "Answered every question in the tasting",
        icon: "🎯",
        rarity: "common"
      });
    }

    // Notes achievement
    const notesCount = responses.filter(r => (r.answerJson as any)?.notes?.trim().length > 0).length;
    if (notesCount >= 3) {
      achievements.push({
        id: "detailed_notes",
        name: "Detail Master", 
        description: "Added personal notes to multiple questions",
        icon: "📝",
        rarity: "rare"
      });
    }

    // Accuracy achievements (would need expert answer comparison)
    // For now, placeholder logic based on group alignment
    const scaleResponses = responses.filter(r => {
      const slide = slides.find(s => s.id === r.slideId);
      return slide && (slide.payloadJson as any).question_type === "scale";
    });

    let alignmentCount = 0;
    scaleResponses.forEach(response => {
      const slideAnalytics = sessionAnalytics.slidesAnalytics.find((s: any) => s.slideId === response.slideId);
      if (slideAnalytics) {
        let rawUserAnswer = typeof response.answerJson === "number" ? response.answerJson : (response.answerJson as any)?.value || 0;
        
        // Validate and clamp user answer to expected scale range (1-10)
        const userAnswer = Math.max(1, Math.min(10, rawUserAnswer));
        
        // Log if we had to clamp the value (indicates data corruption)
        if (userAnswer !== rawUserAnswer) {
          console.warn(`🔧 Achievements: Scale value clamped from ${rawUserAnswer} to ${userAnswer}`);
        }
        
        const groupAverage = slideAnalytics.aggregatedData.averageScore || 0;
        if (Math.abs(userAnswer - groupAverage) <= 1) {
          alignmentCount++;
        }
      }
    });

    if (alignmentCount >= scaleResponses.length * 0.8) {
      achievements.push({
        id: "group_harmony",
        name: "Consensus Builder",
        description: "Your assessments aligned closely with the group",
        icon: "🤝",
        rarity: "uncommon"
      });
    }

    return achievements;
  }

  // Helper method to generate personal insights
  private generatePersonalInsights(responses: Response[], sessionAnalytics: any, wineBreakdowns: any[]): string[] {
    const insights = [];

    // Tannin sensitivity insight
    const tanninResponses = responses.filter(r => {
      const slideAnalytics = sessionAnalytics.slidesAnalytics.find((s: any) => s.slideId === r.slideId);
      return slideAnalytics && slideAnalytics.slideTitle.toLowerCase().includes("tannin");
    });

    if (tanninResponses.length > 0) {
      const avgTanninRating = tanninResponses.reduce((sum, r) => {
        let rawValue = typeof r.answerJson === "number" ? r.answerJson : (r.answerJson as any)?.value || 5;
        
        // Validate and clamp tannin values to expected scale (1-10)
        const clampedValue = Math.max(1, Math.min(10, rawValue));
        
        // Log if we had to clamp the value (indicates data corruption)
        if (clampedValue !== rawValue) {
          console.warn(`🔧 Tannin insight: Scale value clamped from ${rawValue} to ${clampedValue}`);
        }
        
        return sum + clampedValue;
      }, 0) / tanninResponses.length;

      if (avgTanninRating >= 7) {
        insights.push("You have a keen sensitivity to tannins and appreciate structure in wine");
      } else if (avgTanninRating <= 4) {
        insights.push("You prefer wines with softer, more approachable tannins");
      }
    }

    // Notes quality insight
    const notesCount = responses.filter(r => (r.answerJson as any)?.notes?.trim().length > 0).length;
    if (notesCount >= responses.length * 0.5) {
      insights.push("Your detailed note-taking shows excellent attention to wine characteristics");
    }

    // Consistency insight
    const scaleResponses = responses.filter(r => {
      const slideAnalytics = sessionAnalytics.slidesAnalytics.find((s: any) => s.slideId === r.slideId);
      return slideAnalytics && slideAnalytics.questionType === "scale";
    });

    if (scaleResponses.length >= 3) {
      const values = scaleResponses.map(r => {
        let rawValue = typeof r.answerJson === "number" ? r.answerJson : (r.answerJson as any)?.value || 5;
        
        // Validate and clamp scale values to expected range (1-10)
        const clampedValue = Math.max(1, Math.min(10, rawValue));
        
        // Log if we had to clamp the value (indicates data corruption)
        if (clampedValue !== rawValue) {
          console.warn(`🔧 Insights: Scale value clamped from ${rawValue} to ${clampedValue}`);
        }
        
        return clampedValue;
      });
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      
      if (variance < 2) {
        insights.push("You have a consistent tasting approach across different characteristics");
      } else {
        insights.push("You appreciate diverse wine characteristics and show varied preferences");
      }
    }

    return insights.slice(0, 3); // Return top 3 insights
  }

  // Helper method to generate wine recommendations
  private generateWineRecommendations(personality: any, responses: Response[]): string[] {
    const recommendations = [];

    switch (personality.type) {
      case "Bold Explorer":
        recommendations.push("Try robust Cabernet Sauvignon from Napa Valley");
        recommendations.push("Explore powerful Barolo from Piedmont, Italy");
        recommendations.push("Sample rich Châteauneuf-du-Pape from Rhône Valley");
        break;
      case "Subtle Sophisticate":
        recommendations.push("Discover elegant Pinot Noir from Burgundy");
        recommendations.push("Try delicate Riesling from Mosel, Germany");
        recommendations.push("Explore refined Chablis for mineral complexity");
        break;
      case "Detail Detective":
        recommendations.push("Join a structured wine education course");
        recommendations.push("Try vertical tastings to compare vintages");
        recommendations.push("Explore single-vineyard wines for terroir comparison");
        break;
      default:
        recommendations.push("Continue exploring different wine regions");
        recommendations.push("Try wines from various grape varieties");
        recommendations.push("Join wine tastings to expand your palate");
    }

    return recommendations;
  }

  private async initializeGlossaryTerms() {
    console.log("Initializing wine glossary terms...");
    
    const wineTerms = [
      // General Wine Terminology
      {
        term: "sommelier",
        variations: ["somm", "wine steward"],
        definition: "A wine steward; a tour guide; or, some lucky schmuck who gets paid to drink and talk about wine.",
        category: "General"
      },
      {
        term: "acidity",
        variations: ["acidic", "crisp", "bright", "zippy"],
        definition: "How much the wine makes your mouth water. High acid = zippy, bright, refreshing. Low acid = smoother, softer. It's about the feeling—and whether you liked it.",
        category: "Structure"
      },
      {
        term: "body",
        variations: ["full-bodied", "medium-bodied", "light-bodied", "weight"],
        definition: "A wine's 'weight' on your palate. Light-bodied wines feel like water or juice; full-bodied wines feel more like whole milk or a smoothie.",
        category: "Structure"
      },
      {
        term: "tannin",
        variations: ["tannins", "tannic"],
        definition: "That drying, grippy sensation in red wines—think about how fuzzy your teeth feel. Light tannins = like thin socks; heavy tannins = thick wool socks. Comes from grape skins, seeds, stems, and oak.",
        category: "Structure"
      },
      {
        term: "primary flavors",
        variations: ["primary notes", "fruit flavors"],
        definition: "The fruit, herbs, and floral notes straight from the grape. Red wines might show cherry, plum, or pepper; whites might show citrus, green apple, or tropical fruit. Fresh and upfront.",
        category: "Flavor"
      },
      {
        term: "secondary flavors",
        variations: ["secondary notes", "winemaking flavors"],
        definition: "Flavors from winemaking (not the grape). Think butter (from malolactic fermentation), yeasty notes (from lees), and oak spices like vanilla, clove, or toast.",
        category: "Flavor"
      },
      {
        term: "tertiary flavors",
        variations: ["tertiary notes", "aged flavors"],
        definition: "Flavors that come with age. Red wines shift to dried fruit, tobacco, and leather; whites to honey, nuts, or Sherry-like qualities. Earthy, savory, and complex.",
        category: "Flavor"
      },
      // Fruit & Flavor Categories
      {
        term: "stone fruit",
        variations: ["stone fruits"],
        definition: "Peach, apricot, nectarine—fleshy fruits with a single pit.",
        category: "Flavor"
      },
      {
        term: "tree fruit",
        variations: ["tree fruits", "orchard fruit"],
        definition: "Apples, pears, quince—crisp, orchard-grown fruits.",
        category: "Flavor"
      },
      {
        term: "citrus fruit",
        variations: ["citrus fruits", "citrus"],
        definition: "Lemon, lime, grapefruit, orange—zesty and bright.",
        category: "Flavor"
      },
      {
        term: "tropical fruit",
        variations: ["tropical fruits"],
        definition: "Pineapple, mango, banana, passionfruit—ripe, exotic, sunshine-y.",
        category: "Flavor"
      },
      {
        term: "minerality",
        variations: ["mineral", "flinty", "chalky", "stony"],
        definition: "A sense of wet stone, chalk, flint, or saline. Not fruity, not spicy—more like licking a rock in the best way.",
        category: "Flavor"
      },
      {
        term: "vessel",
        variations: ["fermentation vessel", "aging vessel"],
        definition: "The container used for fermentation or aging—stainless steel (neutral), oak (adds spice and texture), or amphora/concrete (adds structure or subtle earthiness).",
        category: "Production"
      },
      // Traditional wine terms to maintain compatibility
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

  async getWineCharacteristics(): Promise<any[]> {
    return await db.select().from(wineCharacteristics).where(eq(wineCharacteristics.isActive, true)).orderBy(wineCharacteristics.category, wineCharacteristics.name);
  }

  // Get all responses for a session (for CSV export)
  async getSessionResponses(sessionId: string): Promise<any[]> {
    // Get all responses with participant and slide details
    const allResponses = await db
      .select({
        participantId: responses.participantId,
        participantName: participants.displayName,
        participantEmail: participants.email,
        slideId: responses.slideId,
        slidePayload: slides.payloadJson,
        slidePosition: slides.position,
        answerJson: responses.answerJson,
        answeredAt: responses.answeredAt,
      })
      .from(responses)
      .innerJoin(participants, eq(responses.participantId, participants.id))
      .innerJoin(slides, eq(responses.slideId, slides.id))
      .where(
        and(
          eq(participants.sessionId, sessionId),
          eq(participants.isHost, false) // Exclude host responses
        )
      )
      .orderBy(participants.displayName, slides.position);

    // Process the response data to extract meaningful information
    return allResponses.map((response) => {
      const slidePayload = response.slidePayload as any;
      const answerJson = response.answerJson as any;
      const questionType = slidePayload?.questionType || 'unknown';
      const slideTitle = slidePayload?.title || slidePayload?.question || 'Untitled Question';
      
      // Extract answer based on question type
      let selectedOptionText = '';
      let scaleValue = null;
      let notes = '';
      
      if (answerJson) {
        if (questionType === 'multiple_choice' && answerJson.selectedOptionId) {
          const selectedOption = slidePayload?.options?.find((opt: any) => opt.id === answerJson.selectedOptionId);
          selectedOptionText = selectedOption?.text || answerJson.selectedOptionId;
        } else if (questionType === 'scale' && answerJson.selectedScore !== undefined) {
          scaleValue = answerJson.selectedScore;
        }
        notes = answerJson.notes || '';
      }
      
      return {
        participantName: response.participantName,
        participantEmail: response.participantEmail,
        slideTitle,
        slidePosition: response.slidePosition,
        responseType: questionType,
        selectedOptionText,
        scaleValue,
        notes,
        answeredAt: response.answeredAt,
      };
    });
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
    // Enhanced query to include package details and participant count
    const result = await db
      .select({
        id: sessions.id,
        packageId: sessions.packageId,
        short_code: sessions.short_code,
        status: sessions.status,
        startedAt: sessions.startedAt,
        completedAt: sessions.completedAt,
        activeParticipants: sessions.activeParticipants,
        updatedAt: sessions.updatedAt,
        // Include package information
        packageName: packages.name,
        packageCode: packages.code,
      })
      .from(sessions)
      .leftJoin(packages, eq(sessions.packageId, packages.id))
      .orderBy(desc(sessions.updatedAt)); // Most recent first

    // Get participant counts for each session
    const sessionsWithCounts = await Promise.all(
      result.map(async (session) => {
        const participants = await this.getParticipantsBySessionId(session.id);
        return {
          ...session,
          participantCount: participants.length,
        } as any;
      })
    );

    return sessionsWithCounts;
  }

  // Wine management methods for sommelier dashboard
  private getDefaultSlideTemplates() {
    return [
      {
        position: 1,
        type: "interlude" as const,
        section_type: "intro" as const,
        payloadJson: {
          title: "Welcome to Your Wine Tasting",
          description: "Let's begin our journey through this exceptional wine",
        },
      },
      {
        position: 2,
        type: "question" as const,
        section_type: "intro" as const,
        payloadJson: {
          title: "What aromas do you detect?",
          description: "Take a moment to swirl and smell. Select all the aromas you can identify.",
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
        type: "question" as const,
        section_type: "deep_dive" as const,
        payloadJson: {
          title: "Rate the aroma intensity",
          description: "How strong are the aromas? 1 = Very light, 10 = Very intense",
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
        type: "question" as const,
        section_type: "deep_dive" as const,
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
        type: "question" as const,
        section_type: "deep_dive" as const,
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
        type: "question" as const,
        section_type: "deep_dive" as const,
        payloadJson: {
          title: "Tannin level assessment",
          description: "How much dryness and grip do you feel on your gums and tongue?",
          question_type: "scale",
          category: "Tannins",
          scale_min: 1,
          scale_max: 10,
          scale_labels: ["Soft Tannins", "Firm Tannins"],
        },
      },
      {
        position: 7,
        type: "question" as const,
        section_type: "ending" as const,
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
        type: "question" as const,
        section_type: "ending" as const,
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
  }

  async createPackageWineFromDashboard(wine: InsertPackageWine): Promise<PackageWine> {
    // Get the next position for this package
    const existingWines = await this.getPackageWines(wine.packageId);
    const nextPosition = existingWines.length + 1;
    
    const wineData = {
      ...wine,
      position: nextPosition,
      wineType: wine.wineType || 'red',
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
    
    // Create wine introduction slide with wine-specific information
    await this.createSlide({
      packageWineId: newWine.id,
      position: 1,
      type: "interlude",
      section_type: "intro",
      payloadJson: {
        title: `Meet ${newWine.wineName}`,
        description: newWine.wineDescription || `Discover the unique characteristics of this exceptional wine.`,
        wine_name: newWine.wineName,
        wine_image: newWine.wineImageUrl || "",
        wine_type: newWine.wineType || "",
        wine_region: newWine.region || "",
        wine_vintage: newWine.vintage || "",
        is_welcome: true,
        is_wine_intro: true
      },
    });
    
    // Create default slide templates for this wine
    const slideTemplates = this.getDefaultSlideTemplates();
    let position = 2; // Start after the wine intro slide
    
    for (const template of slideTemplates.slice(1)) { // Skip the first template (intro) since we already created wine intro
      // Add wine context to all slides while preserving template structure
      const payloadJson = {
        ...template.payloadJson,
        // Add wine context as additional fields without overwriting existing structure
        wine_name: newWine.wineName,
        wine_image: newWine.wineImageUrl || "",
        wine_type: newWine.wineType || ""
      };

      // Validate payload before creating slide
      if (!payloadJson || Object.keys(payloadJson).length === 0) {
        console.error('[SLIDE_CREATE_ERROR] Empty payload detected for slide:', {
          type: template.type,
          section_type: template.section_type,
          position
        });
        continue; // Skip this slide to prevent empty data
      }

      await this.createSlide({
        packageWineId: newWine.id,
        position: position++,
        type: template.type,
        section_type: template.section_type,
        payloadJson: payloadJson,
      });
    }
    
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
    // Get the wine to be deleted to know its package and position
    const wineToDelete = await db.select().from(packageWines)
      .where(eq(packageWines.id, id)).limit(1);
    
    if (wineToDelete.length === 0) return;
    
    const { packageId, position } = wineToDelete[0];
    
    // First delete associated slides
    await db.delete(slides).where(eq(slides.packageWineId, id));
    
    // Then delete the wine
    await db.delete(packageWines).where(eq(packageWines.id, id));
    
    // Update positions of wines that came after the deleted one
    await db.update(packageWines)
      .set({ position: sql`position - 1` })
      .where(and(
        eq(packageWines.packageId, packageId),
        gt(packageWines.position, position)
      ));
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

  // Session Wine Selections - Host wine selection feature
  async createSessionWineSelections(sessionId: string, selections: InsertSessionWineSelection[]): Promise<SessionWineSelection[]> {
    // First delete existing selections for this session
    await this.deleteSessionWineSelections(sessionId);
    
    // Insert new selections
    const insertData = selections.map(selection => ({
      ...selection,
      sessionId
    }));
    
    const newSelections = await db
      .insert(sessionWineSelections)
      .values(insertData)
      .returning();
    
    return newSelections;
  }

  async getSessionWineSelections(sessionId: string): Promise<(SessionWineSelection & { wine: PackageWine })[]> {
    const selections = await db
      .select({
        id: sessionWineSelections.id,
        sessionId: sessionWineSelections.sessionId,
        packageWineId: sessionWineSelections.packageWineId,
        position: sessionWineSelections.position,
        isIncluded: sessionWineSelections.isIncluded,
        createdAt: sessionWineSelections.createdAt,
        wine: {
          id: packageWines.id,
          packageId: packageWines.packageId,
          wineName: packageWines.wineName,
          wineDescription: packageWines.wineDescription,
          wineImageUrl: packageWines.wineImageUrl,
          wineType: packageWines.wineType,
          vintage: packageWines.vintage,
          region: packageWines.region,
          producer: packageWines.producer,
          grapeVarietals: packageWines.grapeVarietals,
          alcoholContent: packageWines.alcoholContent,
          position: packageWines.position,
          expectedCharacteristics: packageWines.expectedCharacteristics,
          createdAt: packageWines.createdAt
        }
      })
      .from(sessionWineSelections)
      .innerJoin(packageWines, eq(sessionWineSelections.packageWineId, packageWines.id))
      .where(eq(sessionWineSelections.sessionId, sessionId))
      .orderBy(sessionWineSelections.position);

    return selections.map(selection => ({
      ...selection,
      wine: selection.wine as PackageWine
    }));
  }

  async updateSessionWineSelections(sessionId: string, selections: InsertSessionWineSelection[]): Promise<SessionWineSelection[]> {
    return this.createSessionWineSelections(sessionId, selections);
  }

  async deleteSessionWineSelections(sessionId: string): Promise<void> {
    await db
      .delete(sessionWineSelections)
      .where(eq(sessionWineSelections.sessionId, sessionId));
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
    
    // Fetch package-level slides
    const packageSlides = await db.select()
      .from(slides)
      .where(eq(slides.packageId, pkg.id))
      .orderBy(slides.position);
    
    // Fetch wine-level slides
    const wineSlides = await db.select()
      .from(slides)
      .where(inArray(slides.packageWineId, wineIds))
      .orderBy(slides.position);

    // Combine all slides and sort by global position
    const allSlidesForPackage = [...packageSlides, ...wineSlides]
      .sort((a, b) => (a.globalPosition || 0) - (b.globalPosition || 0));

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
  
  // NEW: Normalize slide positions for a wine to ensure clean sequential numbering
  async normalizeSlidePositions(packageWineId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get all slides for this wine ordered by current position
      const wineSlides = await tx
        .select({
          id: slides.id,
          position: slides.position
        })
        .from(slides)
        .where(eq(slides.packageWineId, packageWineId))
        .orderBy(asc(slides.position));

      // Renumber slides sequentially starting from 1
      for (let i = 0; i < wineSlides.length; i++) {
        const newPosition = i + 1;
        await tx
          .update(slides)
          .set({ position: newPosition })
          .where(eq(slides.id, wineSlides[i].id));
      }
    });
  }
  
  // Simple single slide position update - using fractional indexing
  async updateSlidePosition(slideId: string, newPosition: number): Promise<void> {
    console.log(`🔄 Updating slide ${slideId} to position ${newPosition}`);
    
    try {
      await db
        .update(slides)
        .set({ position: newPosition })
        .where(eq(slides.id, slideId));
      
      console.log(`✅ Successfully updated slide ${slideId} position to ${newPosition}`);
    } catch (error) {
      console.error(`❌ Failed to update slide position:`, error);
      throw error;
    }
  }

  async duplicateWineSlides(sourceWineId: string, targetWineId: string, replaceExisting: boolean): Promise<{ count: number; slides: Slide[] }> {
    try {
      // 1. Validate both wines exist and are in the same package
      const [sourceWine, targetWine] = await Promise.all([
        db.select().from(packageWines).where(eq(packageWines.id, sourceWineId)).limit(1),
        db.select().from(packageWines).where(eq(packageWines.id, targetWineId)).limit(1)
      ]);

      if (sourceWine.length === 0 || targetWine.length === 0) {
        throw new Error('Source or target wine not found');
      }

      if (sourceWine[0].packageId !== targetWine[0].packageId) {
        throw new Error('Wines must be in the same package');
      }

      // 2. Fetch source slides (EXCLUDE intro slides - only copy deep dive, ending, etc.)
      const sourceSlides = await db.select()
        .from(slides)
        .where(eq(slides.packageWineId, sourceWineId))
        .orderBy(slides.position);

      // Filter out only wine-specific intro slides, but keep intro questions and assessments
      const slidesToCopy = sourceSlides.filter(slide => {
        const payloadJson = slide.payloadJson as any;
        
        // EXCLUDE wine-specific intro slides (those that introduce a specific wine)
        if (payloadJson?.is_wine_intro === true) {
          console.log(`Excluding wine-specific intro: ${payloadJson.title}`);
          return false;
        }
        
        // EXCLUDE package-level intro slides (general package welcome)
        if (payloadJson?.is_package_intro === true) {
          console.log(`Excluding package intro: ${payloadJson.title}`);
          return false;
        }
        
        // EXCLUDE slides with wine-specific titles as a fallback check
        if (payloadJson?.title && sourceWine[0]) {
          const title = payloadJson.title.toLowerCase();
          const wineName = sourceWine[0].wineName.toLowerCase();
          
          // Check for common wine-specific intro patterns
          if (title.includes(`meet ${wineName}`) || 
              title.includes(`introduction to ${wineName}`) ||
              title.includes(`welcome to ${wineName}`) ||
              title === wineName) {
            console.log(`Excluding wine-specific title: ${payloadJson.title}`);
            return false;
          }
        }
        
        // INCLUDE everything else - intro questions, deep dive, ending, etc.
        return true;
      });

      if (slidesToCopy.length === 0) {
        return { count: 0, slides: [] };
      }

      // 3. Handle target wine slides if replacing
      if (replaceExisting) {
        // Delete all slides from target wine EXCEPT its own intro slide
        // This preserves the "Meet [Wine Name]" slide that belongs to the target wine
        // We use COALESCE to handle NULL/undefined values in JSON
        await db.delete(slides).where(
          and(
            eq(slides.packageWineId, targetWineId),
            sql`COALESCE(${slides.payloadJson}->>'is_wine_intro', 'false') != 'true'`
          )
        );
        console.log(`Deleted non-intro slides from target wine, preserving wine intro slide`);
      }

      // 4. Use database transaction to ensure data consistency
      const duplicatedSlides: Slide[] = [];
      
      await db.transaction(async (tx) => {
        // Get all existing slides for target wine within transaction
        const existingSlides = await tx.select()
          .from(slides)
          .where(eq(slides.packageWineId, targetWineId))
          .orderBy(slides.position);

        let startingPosition = 1;
        
        // In replace mode, we may have preserved the wine intro slide
        // We need to account for it when assigning positions
        if (replaceExisting && existingSlides.length > 0) {
          // Check if any of the existing slides is a wine intro (should be at position 1)
          const hasPreservedIntro = existingSlides.some(slide => {
            const payload = slide.payloadJson as any;
            return payload?.is_wine_intro === true;
          });
          
          if (hasPreservedIntro) {
            // Start copying at position 2 to avoid conflict with preserved intro
            startingPosition = 2;
          }
        } else if (!replaceExisting && existingSlides.length > 0) {
          // For append mode, find the highest position and start from there
          const maxPosition = Math.max(...existingSlides.map(s => s.position));
          startingPosition = maxPosition + 10; // Leave gap to avoid conflicts
        }

        // 5. Create duplicated slides within transaction
        for (let i = 0; i < slidesToCopy.length; i++) {
          const sourceSlide = slidesToCopy[i];
          let newPosition: number;

          if (replaceExisting) {
            // For replace mode, assign sequential positions starting from startingPosition
            // This handles the case where we preserved the intro at position 1
            newPosition = startingPosition + i;
          } else {
            // For append mode, use sequential positions starting from safe position
            newPosition = startingPosition + (i * 10); // Use gaps of 10 for future insertions
          }

          // Update wine context in payloadJson if present
          let updatedPayloadJson = { ...(sourceSlide.payloadJson || {}) } as any;
          
          // If the slide contains wine-specific context, update it to target wine
          if (updatedPayloadJson.wine_name || updatedPayloadJson.wine_context || 
              updatedPayloadJson.wine_type || updatedPayloadJson.wine_region) {
            updatedPayloadJson = {
              ...updatedPayloadJson,
              wine_name: targetWine[0].wineName,
              wine_type: targetWine[0].wineType || updatedPayloadJson.wine_type,
              wine_region: targetWine[0].region || updatedPayloadJson.wine_region,
              wine_vintage: targetWine[0].vintage || updatedPayloadJson.wine_vintage,
              wine_image: targetWine[0].wineImageUrl || updatedPayloadJson.wine_image
            };
          }
          
          const newSlideData = {
            packageWineId: targetWineId,
            type: sourceSlide.type,
            payloadJson: updatedPayloadJson,
            position: newPosition,
            section_type: sourceSlide.section_type
          };

          try {
            const [createdSlide] = await tx.insert(slides)
              .values(newSlideData)
              .returning();

            duplicatedSlides.push(createdSlide);
          } catch (error) {
            // If position conflict still occurs, find the next available position
            if (error instanceof Error && error.message.includes('duplicate key')) {
              console.warn(`Position conflict for slide ${sourceSlide.type} at position ${newPosition}, finding next available position`);
              
              // Find the highest position currently in use for this wine
              const currentSlides = await tx.select({ position: slides.position })
                .from(slides)
                .where(eq(slides.packageWineId, targetWineId))
                .orderBy(desc(slides.position))
                .limit(1);
              
              const nextAvailablePosition = (currentSlides[0]?.position || 0) + 1;
              
              const fallbackSlideData = {
                ...newSlideData,
                position: nextAvailablePosition
              };
              
              const [createdSlide] = await tx.insert(slides)
                .values(fallbackSlideData)
                .returning();

              duplicatedSlides.push(createdSlide);
              console.log(`Assigned fallback position ${nextAvailablePosition} to slide ${sourceSlide.type}`);
            } else {
              throw error;
            }
          }
        }
      });

      // Log detailed information about the duplication
      console.log(`\n📋 Slide Duplication Summary:`);
      console.log(`  Source Wine: ${sourceWine[0].wineName} (${sourceWineId})`);
      console.log(`  Target Wine: ${targetWine[0].wineName} (${targetWineId})`);
      console.log(`  Total source slides: ${sourceSlides.length}`);
      console.log(`  Slides after filtering: ${slidesToCopy.length}`);
      console.log(`  Excluded slides: ${sourceSlides.length - slidesToCopy.length}`);
      console.log(`  Mode: ${replaceExisting ? 'Replace' : 'Append'}`);
      console.log(`✅ Successfully duplicated ${duplicatedSlides.length} slides\n`);
      
      // Normalize positions after duplication to ensure clean sequential numbering
      await this.normalizeSlidePositions(targetWineId);
      
      return {
        count: duplicatedSlides.length,
        slides: duplicatedSlides
      };

    } catch (error) {
      console.error('❌ Error duplicating wine slides:', error);
      throw error;
    }
  }

  // Media methods
  async generateUniqueMediaPublicId(): Promise<string> {
    const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      let result = "";
      for (let i = 0; i < 10; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
      }

      const existingMedia = await db.query.media.findFirst({
        columns: { id: true },
        where: eq(media.publicId, result),
      });

      if (!existingMedia) {
        return result;
      }
      attempts++;
    }

    // Fallback with crypto
    return crypto.randomBytes(5).toString("hex").toUpperCase();
  }

  async createMedia(mediaData: InsertMedia): Promise<Media> {
    const [created] = await db.insert(media).values(mediaData).returning();
    return created;
  }

  async getMediaByPublicId(publicId: string): Promise<Media | undefined> {
    return db.query.media.findFirst({
      where: eq(media.publicId, publicId),
    });
  }

  async getMediaById(id: string): Promise<Media | undefined> {
    return db.query.media.findFirst({
      where: eq(media.id, id),
    });
  }

  async updateMediaLastAccessed(id: string): Promise<void> {
    await db
      .update(media)
      .set({ lastAccessedAt: new Date() })
      .where(eq(media.id, id));
  }

  async deleteMedia(id: string): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }

  // Position Recovery and Smart Reordering Functions
  
  /**
   * Detects and fixes slides stuck at temporary positions (900000000+)
   * This happens when the two-phase reorder process fails, leaving slides at temp positions
   */
  async detectAndFixTemporaryPositions(): Promise<{ fixedCount: number; wines: string[] }> {
    console.log('🔍 Checking for slides stuck at temporary positions...');
    
    const TEMP_BASE_POSITION = 900000000;
    
    // Find all slides stuck at temporary positions
    const stuckSlides = await db
      .select({
        id: slides.id,
        packageWineId: slides.packageWineId,
        position: slides.position,
        type: slides.type,
        payloadJson: slides.payloadJson
      })
      .from(slides)
      .where(gte(slides.position, TEMP_BASE_POSITION));
    
    if (stuckSlides.length === 0) {
      console.log('✅ No slides found at temporary positions');
      return { fixedCount: 0, wines: [] };
    }
    
    console.log(`🚨 Found ${stuckSlides.length} slides stuck at temporary positions`);
    
    // Group slides by wine
    const slidesByWine = new Map<string, typeof stuckSlides>();
    stuckSlides.forEach(slide => {
      const wineId = slide.packageWineId!;
      if (!slidesByWine.has(wineId)) {
        slidesByWine.set(wineId, []);
      }
      slidesByWine.get(wineId)!.push(slide);
    });
    
    const fixedWines: string[] = [];
    let totalFixed = 0;
    
    // Fix each wine's positions
    for (const [wineId, wineStuckSlides] of Array.from(slidesByWine.entries())) {
      console.log(`🔧 Fixing ${wineStuckSlides.length} stuck slides for wine ${wineId}`);
      
      // Get all slides for this wine (including non-stuck ones)
      const allWineSlides = await db
        .select()
        .from(slides)
        .where(eq(slides.packageWineId, wineId))
        .orderBy(slides.position);
      
      // Normalize all positions for this wine
      const fixedCount = await this.normalizeWinePositions(wineId, allWineSlides);
      
      if (fixedCount > 0) {
        fixedWines.push(wineId);
        totalFixed += fixedCount;
      }
    }
    
    console.log(`✅ Fixed ${totalFixed} slides across ${fixedWines.length} wines`);
    return { fixedCount: totalFixed, wines: fixedWines };
  }
  
  /**
   * Normalizes all slide positions for a wine to use sequential gap-based positions
   */
  async normalizeWinePositions(wineId: string, wineSlides?: any[]): Promise<number> {
    if (!wineSlides) {
      wineSlides = await db
        .select()
        .from(slides)
        .where(eq(slides.packageWineId, wineId))
        .orderBy(slides.position);
    }
    
    if (wineSlides.length === 0) {
      return 0;
    }
    
    console.log(`🔄 Normalizing positions for ${wineSlides.length} slides in wine ${wineId}`);
    
    const GAP_SIZE = 1000;
    const BASE_POSITION = 100000;
    let fixedCount = 0;
    
    // Sort slides by current position to maintain relative order
    const sortedSlides = [...wineSlides].sort((a, b) => {
      // Handle temporary positions - sort them last but maintain their relative order
      if (a.position >= 900000000 && b.position >= 900000000) {
        return a.position - b.position;
      }
      if (a.position >= 900000000) return 1;
      if (b.position >= 900000000) return -1;
      return a.position - b.position;
    });
    
    // Assign new sequential positions
    for (let i = 0; i < sortedSlides.length; i++) {
      const slide = sortedSlides[i];
      const newPosition = BASE_POSITION + (i * GAP_SIZE);
      
      if (slide.position !== newPosition) {
        await db
          .update(slides)
          .set({ position: newPosition })
          .where(eq(slides.id, slide.id));
        
        console.log(`📍 Fixed slide ${slide.id}: ${slide.position} → ${newPosition}`);
        fixedCount++;
      }
    }
    
    return fixedCount;
  }
  
  /**
   * Smart swap function that only swaps two adjacent slides without using temporary positions
   */
  async smartSwapSlides(slideId1: string, slideId2: string): Promise<void> {
    console.log(`🔄 Smart swapping slides ${slideId1} ↔ ${slideId2}`);
    
    await db.transaction(async (tx) => {
      // Get both slides
      const slide1 = await tx.select().from(slides).where(eq(slides.id, slideId1)).limit(1);
      const slide2 = await tx.select().from(slides).where(eq(slides.id, slideId2)).limit(1);
      
      if (slide1.length === 0 || slide2.length === 0) {
        throw new Error('One or both slides not found');
      }
      
      const pos1 = slide1[0].position;
      const pos2 = slide2[0].position;
      
      // Use temporary position to avoid unique constraint violation
      const tempPosition = Math.max(pos1, pos2) + 1000000; // Temporary position way above normal range
      
      // Three-step swap to avoid constraint violation:
      // 1. Move slide1 to temp position
      await tx.update(slides).set({ position: tempPosition }).where(eq(slides.id, slideId1));
      // 2. Move slide2 to slide1's original position
      await tx.update(slides).set({ position: pos1 }).where(eq(slides.id, slideId2));
      // 3. Move slide1 to slide2's original position
      await tx.update(slides).set({ position: pos2 }).where(eq(slides.id, slideId1));
      
      console.log(`✅ Swapped positions: ${slideId1}(${pos1}) ↔ ${slideId2}(${pos2})`);
    });
  }
  
  /**
   * Direct position assignment with conflict resolution
   */
  async assignSlidePosition(slideId: string, targetPosition: number, packageWineId?: string): Promise<void> {
    console.log(`🎯 Assigning slide ${slideId} to position ${targetPosition}`);
    
    await db.transaction(async (tx) => {
      // Get the slide to move
      const slideToMove = await tx.select().from(slides).where(eq(slides.id, slideId)).limit(1);
      if (slideToMove.length === 0) {
        throw new Error('Slide not found');
      }
      
      const currentWineId = packageWineId || slideToMove[0].packageWineId!;
      
      // Check if target position is occupied
      const conflictingSlide = await tx
        .select()
        .from(slides)
        .where(and(
          eq(slides.packageWineId, currentWineId),
          eq(slides.position, targetPosition),
          ne(slides.id, slideId)
        ))
        .limit(1);
      
      if (conflictingSlide.length > 0) {
        // Find next available position
        const nextAvailablePosition = await this.findNextAvailablePosition(currentWineId, targetPosition, tx);
        
        // Move the conflicting slide to the available position
        await tx
          .update(slides)
          .set({ position: nextAvailablePosition })
          .where(eq(slides.id, conflictingSlide[0].id));
        
        console.log(`📍 Moved conflicting slide ${conflictingSlide[0].id} to position ${nextAvailablePosition}`);
      }
      
      // Now assign the target position
      await tx
        .update(slides)
        .set({ 
          position: targetPosition,
          ...(packageWineId && { packageWineId })
        })
        .where(eq(slides.id, slideId));
      
      console.log(`✅ Assigned slide ${slideId} to position ${targetPosition}`);
    });
  }
  
  /**
   * Batch update slide positions - updates all positions in a single transaction
   */
  async batchUpdateSlidePositions(updates: Array<{ slideId: string; position: number; section_type?: string }>): Promise<void> {
    console.log(`📦 Batch updating ${updates.length} slide positions`);
    
    await db.transaction(async (tx) => {
      // First, move all slides to temporary positions to avoid conflicts
      const tempPositionBase = 900000000;
      
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        await tx
          .update(slides)
          .set({ position: tempPositionBase + i })
          .where(eq(slides.id, update.slideId));
      }
      
      // Then assign final positions and section types
      for (const update of updates) {
        const updateData: any = { position: update.position };
        if (update.section_type) {
          updateData.section_type = update.section_type;
        }
        
        await tx
          .update(slides)
          .set(updateData)
          .where(eq(slides.id, update.slideId));
      }
      
      console.log(`✅ Batch updated ${updates.length} slide positions successfully`);
    });
  }
  
  /**
   * Find the next available position for a wine, starting from a given position
   */
  private async findNextAvailablePosition(wineId: string, startPosition: number, tx?: any): Promise<number> {
    const dbToUse = tx || db;
    const GAP_SIZE = 1000;
    let position = startPosition + GAP_SIZE;
    
    while (true) {
      const existing = await dbToUse
        .select()
        .from(slides)
        .where(and(
          eq(slides.packageWineId, wineId),
          eq(slides.position, position)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        return position;
      }
      
      position += GAP_SIZE;
    }
  }
  
  /**
   * Recovery function to check and fix any position conflicts in the database
   */
  async performPositionRecovery(): Promise<{ recovered: boolean; details: string }> {
    console.log('🔍 Starting comprehensive position recovery...');
    
    try {
      // Step 1: Fix temporary positions
      const tempFix = await this.detectAndFixTemporaryPositions();
      
      // Step 2: Check for duplicate positions within wines
      const duplicates = await db
        .select({
          packageWineId: slides.packageWineId,
          position: slides.position,
          count: sql<number>`count(*)`.as('count')
        })
        .from(slides)
        .where(isNotNull(slides.packageWineId))
        .groupBy(slides.packageWineId, slides.position)
        .having(sql`count(*) > 1`);
      
      if (duplicates.length > 0) {
        console.log(`🚨 Found ${duplicates.length} position conflicts to resolve`);
        
        for (const duplicate of duplicates) {
          const conflictingSlides = await db
            .select()
            .from(slides)
            .where(and(
              eq(slides.packageWineId, duplicate.packageWineId!),
              eq(slides.position, duplicate.position)
            ));
          
          // Keep the first slide at the original position, move others
          for (let i = 1; i < conflictingSlides.length; i++) {
            const newPosition = await this.findNextAvailablePosition(duplicate.packageWineId!, duplicate.position);
            await db
              .update(slides)
              .set({ position: newPosition })
              .where(eq(slides.id, conflictingSlides[i].id));
            
            console.log(`📍 Resolved conflict: moved slide ${conflictingSlides[i].id} to position ${newPosition}`);
          }
        }
      }
      
      const details = `Fixed ${tempFix.fixedCount} temporary positions, resolved ${duplicates.length} conflicts`;
      console.log(`✅ Position recovery completed: ${details}`);
      
      return { 
        recovered: tempFix.fixedCount > 0 || duplicates.length > 0, 
        details 
      };
      
    } catch (error) {
      console.error('❌ Position recovery failed:', error);
      return { 
        recovered: false, 
        details: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Provides minimal default payload for each slide type to allow creation of basic slides
   */
  private getDefaultPayloadForSlideType(slideType: string): any {
    switch (slideType) {
      case 'question':
        return {
          question_type: 'text',
          title: 'New Question',
          question: 'New Question',
          description: '',
          placeholder: 'Enter your answer here...',
          timeLimit: 60,
          points: 10
        };
      
      case 'video_message':
        return {
          title: 'New Video Message',
          description: '',
          video_url: '',
          autoplay: false,
          show_controls: true
        };
      
      case 'audio_message':
        return {
          title: 'New Audio Message',
          description: '',
          audio_url: '',
          autoplay: false,
          show_controls: true
        };
      
      case 'interlude':
        return {
          title: 'New Interlude',
          description: '',
          duration: 5000,
          backgroundImage: '',
          animation: 'fade'
        };
      
      case 'transition':
        return {
          title: 'New Transition',
          description: '',
          duration: 2500,
          showContinueButton: false,
          animation_type: 'fade',
          backgroundImage: ''
        };
      
      default:
        return {
          title: 'New Slide',
          description: ''
        };
    }
  }
}

export const storage = new DatabaseStorage();
