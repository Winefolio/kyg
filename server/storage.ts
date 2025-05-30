import { 
  packages, slides, sessions, participants, responses,
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

export class MemStorage implements IStorage {
  private packages: Map<string, Package>;
  private slides: Map<string, Slide>;
  private sessions: Map<string, Session>;
  private participants: Map<string, Participant>;
  private responses: Map<string, Response>;

  constructor() {
    this.packages = new Map();
    this.slides = new Map();
    this.sessions = new Map();
    this.participants = new Map();
    this.responses = new Map();
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private initializeSampleData() {
    // Create sample package
    const samplePackage: Package = {
      id: this.generateId(),
      code: "WINE01",
      name: "Bordeaux Discovery Collection",
      description: "Explore the finest wines from France's most prestigious region",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.packages.set(samplePackage.id, samplePackage);

    // Create sample slides
    const slides = [
      {
        id: this.generateId(),
        packageId: samplePackage.id,
        position: 1,
        type: "interlude",
        payloadJson: {
          title: "Welcome to Your Wine Tasting",
          description: "Let's begin our journey through Bordeaux",
          wine_name: "2018 Château Margaux",
          wine_image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=600"
        },
        createdAt: new Date()
      },
      {
        id: this.generateId(),
        packageId: samplePackage.id,
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
            { id: "4", text: "Floral notes", description: "Violet or rose petals" }
          ],
          allow_multiple: true,
          allow_notes: true
        },
        createdAt: new Date()
      },
      {
        id: this.generateId(),
        packageId: samplePackage.id,
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
        },
        createdAt: new Date()
      }
    ];

    slides.forEach(slide => {
      this.slides.set(slide.id, slide as Slide);
    });
  }

  // Package methods
  async getPackageByCode(code: string): Promise<Package | undefined> {
    return Array.from(this.packages.values()).find(pkg => pkg.code === code);
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const id = this.generateId();
    const newPackage: Package = {
      ...pkg,
      id,
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

    // Filter based on host status
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
      ...slide,
      id,
      createdAt: new Date()
    };
    this.slides.set(id, newSlide);
    return newSlide;
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const id = this.generateId();
    const newSession: Session = {
      ...session,
      id,
      startedAt: new Date()
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
      ...participant,
      id,
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
      ...response,
      id,
      answeredAt: new Date()
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
    // Find existing response
    const existingResponse = Array.from(this.responses.values())
      .find(r => r.participantId === participantId && r.slideId === slideId);

    if (existingResponse) {
      existingResponse.answerJson = answerJson;
      existingResponse.answeredAt = new Date();
      this.responses.set(existingResponse.id, existingResponse);
      return existingResponse;
    } else {
      return this.createResponse({ participantId, slideId, answerJson, synced: true });
    }
  }
}

export const storage = new MemStorage();
