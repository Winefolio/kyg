import { eq, and } from "drizzle-orm";
import { db } from "./db";
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

export class DatabaseStorage implements IStorage {
  // Package methods
  async getPackageByCode(code: string): Promise<Package | undefined> {
    const result = await db.select().from(packages).where(eq(packages.code, code.toUpperCase())).limit(1);
    return result[0];
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const result = await db.insert(packages).values(pkg).returning();
    return result[0];
  }

  // Slide methods
  async getSlidesByPackageId(packageId: string, isHost = false): Promise<Slide[]> {
    let result = await db.select()
      .from(slides)
      .where(eq(slides.packageId, packageId))
      .orderBy(slides.position);

    // Filter based on host status
    if (!isHost) {
      result = result.filter(slide => {
        const payload = slide.payloadJson as any;
        return !payload.for_host;
      });
    }

    return result;
  }

  async getSlideById(id: string): Promise<Slide | undefined> {
    const result = await db.select().from(slides).where(eq(slides.id, id)).limit(1);
    return result[0];
  }

  async createSlide(slide: InsertSlide): Promise<Slide> {
    const result = await db.insert(slides).values(slide).returning();
    return result[0];
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values(session).returning();
    return result[0];
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0];
  }

  async updateSessionParticipantCount(sessionId: string, count: number): Promise<void> {
    await db.update(sessions)
      .set({ activeParticipants: count })
      .where(eq(sessions.id, sessionId));
  }

  // Participant methods
  async createParticipant(participant: InsertParticipant): Promise<Participant> {
    const result = await db.insert(participants).values(participant).returning();
    return result[0];
  }

  async getParticipantById(id: string): Promise<Participant | undefined> {
    const result = await db.select().from(participants).where(eq(participants.id, id)).limit(1);
    return result[0];
  }

  async getParticipantsBySessionId(sessionId: string): Promise<Participant[]> {
    return await db.select()
      .from(participants)
      .where(eq(participants.sessionId, sessionId));
  }

  async updateParticipantProgress(participantId: string, progress: number): Promise<void> {
    await db.update(participants)
      .set({ 
        progressPtr: progress,
        lastActive: new Date()
      })
      .where(eq(participants.id, participantId));
  }

  // Response methods
  async createResponse(response: InsertResponse): Promise<Response> {
    const result = await db.insert(responses).values(response).returning();
    return result[0];
  }

  async getResponsesByParticipantId(participantId: string): Promise<Response[]> {
    return await db.select()
      .from(responses)
      .where(eq(responses.participantId, participantId));
  }

  async getResponsesBySlideId(slideId: string): Promise<Response[]> {
    return await db.select()
      .from(responses)
      .where(eq(responses.slideId, slideId));
  }

  async updateResponse(participantId: string, slideId: string, answerJson: any): Promise<Response> {
    // Try to update existing response first
    const existing = await db.select()
      .from(responses)
      .where(and(
        eq(responses.participantId, participantId),
        eq(responses.slideId, slideId)
      ))
      .limit(1);

    if (existing.length > 0) {
      const result = await db.update(responses)
        .set({ 
          answerJson,
          answeredAt: new Date()
        })
        .where(and(
          eq(responses.participantId, participantId),
          eq(responses.slideId, slideId)
        ))
        .returning();
      return result[0];
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
