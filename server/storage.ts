import { 
  type Package, type InsertPackage,
  type Slide, type InsertSlide,
  type Session, type InsertSession,
  type Participant, type InsertParticipant,
  type Response, type InsertResponse
} from "@shared/schema";

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

export class WorkingStorage implements IStorage {
  private packages: Map<string, Package> = new Map();
  private slides: Map<string, Slide> = new Map();
  private sessions: Map<string, Session> = new Map();
  private participants: Map<string, Participant> = new Map();
  private responses: Map<string, Response> = new Map();

  constructor() {
    this.initializeWineTastingData();
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private initializeWineTastingData() {
    // Create the Bordeaux wine package
    const bordeauxPackage: Package = {
      id: this.generateId(),
      code: "WINE01",
      name: "Bordeaux Discovery Collection",
      description: "Explore the finest wines from France's most prestigious region",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.packages.set(bordeauxPackage.id, bordeauxPackage);

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

    slideData.forEach(slideInfo => {
      const slide: Slide = {
        id: this.generateId(),
        packageId: bordeauxPackage.id,
        position: slideInfo.position,
        type: slideInfo.type,
        payloadJson: slideInfo.payloadJson,
        createdAt: new Date()
      };
      this.slides.set(slide.id, slide);
    });
  }

  // Package methods
  async getPackageByCode(code: string): Promise<Package | undefined> {
    return Array.from(this.packages.values()).find(pkg => pkg.code === code.toUpperCase());
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const id = this.generateId();
    const newPackage: Package = {
      id,
      code: pkg.code,
      name: pkg.name,
      description: pkg.description || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.packages.set(id, newPackage);
    return newPackage;
  }

  // Slide methods
  async getSlidesByPackageId(packageId: string, isHost = false): Promise<Slide[]> {
    let slides = Array.from(this.slides.values())
      .filter(slide => slide.packageId === packageId)
      .sort((a, b) => a.position - b.position);

    if (!isHost) {
      slides = slides.filter(slide => {
        const payload = slide.payloadJson as any;
        return !payload.for_host;
      });
    }

    return slides;
  }

  async getSlideById(id: string): Promise<Slide | undefined> {
    return this.slides.get(id);
  }

  async createSlide(slide: InsertSlide): Promise<Slide> {
    const id = this.generateId();
    const newSlide: Slide = {
      id,
      packageId: slide.packageId || null,
      position: slide.position,
      type: slide.type,
      payloadJson: slide.payloadJson,
      createdAt: new Date()
    };
    this.slides.set(id, newSlide);
    return newSlide;
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const id = this.generateId();
    const newSession: Session = {
      id,
      packageId: session.packageId || null,
      startedAt: new Date(),
      completedAt: session.completedAt || null,
      activeParticipants: session.activeParticipants || 0
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async updateSessionParticipantCount(sessionId: string, count: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.activeParticipants = count;
      this.sessions.set(sessionId, session);
    }
  }

  // Participant methods
  async createParticipant(participant: InsertParticipant): Promise<Participant> {
    const id = this.generateId();
    const newParticipant: Participant = {
      id,
      sessionId: participant.sessionId || null,
      email: participant.email || null,
      displayName: participant.displayName,
      isHost: participant.isHost || false,
      progressPtr: participant.progressPtr || 0,
      lastActive: new Date(),
      createdAt: new Date()
    };
    this.participants.set(id, newParticipant);
    return newParticipant;
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    return this.participants.get(id);
  }

  async getParticipantsBySessionId(sessionId: string): Promise<Participant[]> {
    return Array.from(this.participants.values())
      .filter(participant => participant.sessionId === sessionId);
  }

  async updateParticipantProgress(participantId: string, progress: number): Promise<void> {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.progressPtr = progress;
      participant.lastActive = new Date();
      this.participants.set(participantId, participant);
    }
  }

  // Response methods
  async createResponse(response: InsertResponse): Promise<Response> {
    const id = this.generateId();
    const newResponse: Response = {
      id,
      participantId: response.participantId || null,
      slideId: response.slideId || null,
      answerJson: response.answerJson,
      answeredAt: new Date(),
      synced: response.synced || true
    };
    this.responses.set(id, newResponse);
    return newResponse;
  }

  async getResponsesByParticipantId(participantId: string): Promise<Response[]> {
    return Array.from(this.responses.values())
      .filter(response => response.participantId === participantId);
  }

  async getResponsesBySlideId(slideId: string): Promise<Response[]> {
    return Array.from(this.responses.values())
      .filter(response => response.slideId === slideId);
  }

  async updateResponse(participantId: string, slideId: string, answerJson: any): Promise<Response> {
    const existingResponse = Array.from(this.responses.values())
      .find(r => r.participantId === participantId && r.slideId === slideId);

    if (existingResponse) {
      existingResponse.answerJson = answerJson;
      existingResponse.answeredAt = new Date();
      this.responses.set(existingResponse.id, existingResponse);
      return existingResponse;
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

export const storage = new WorkingStorage();
