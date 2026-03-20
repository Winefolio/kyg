import type { Express } from "express";
import { db } from "../db";
import { users, tastings, userJourneys, sessions, participants, journeys } from "@shared/schema";
import { sql, count, eq, gte } from "drizzle-orm";

export function registerAdminRoutes(app: Express) {
  console.log("📊 Registering admin engagement endpoints...");

  app.get("/api/admin/engagement", async (_req, res) => {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Run all queries in parallel
      const [
        totalUsersResult,
        usersThisWeekResult,
        usersThisMonthResult,
        totalTastingsResult,
        tastingsThisWeekResult,
        tastingsThisMonthResult,
        onboardingResult,
        recentUsersResult,
        activeJourneysResult,
        usersEnrolledResult,
        totalSessionsResult,
        totalParticipantsResult,
        sessionsThisMonthResult,
      ] = await Promise.all([
        // Summary counts
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfWeek)),
        db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfMonth)),
        db.select({ count: count() }).from(tastings),
        db.select({ count: count() }).from(tastings).where(gte(tastings.tastedAt, startOfWeek)),
        db.select({ count: count() }).from(tastings).where(gte(tastings.tastedAt, startOfMonth)),
        db.select({
          total: count(),
          completed: count(sql`CASE WHEN ${users.onboardingCompleted} = true THEN 1 END`),
        }).from(users),

        // Recent users with tasting counts
        db.execute(sql`
          SELECT
            u.email,
            u.created_at,
            u.tastings_completed,
            u.tasting_level,
            u.onboarding_completed,
            (SELECT MAX(t.tasted_at) FROM tastings t WHERE t.user_id = u.id) as last_tasting_date
          FROM users u
          ORDER BY u.created_at DESC
          LIMIT 20
        `),

        // Journey stats
        db.select({ count: count() }).from(journeys).where(eq(journeys.isPublished, true)),
        db.select({ count: count() }).from(userJourneys),

        // Session stats
        db.select({ count: count() }).from(sessions),
        db.select({ count: count() }).from(participants),
        db.select({ count: count() }).from(sessions).where(gte(sessions.startedAt, startOfMonth)),
      ]);

      // chapter_completions table may not exist yet — query safely
      let chapterCompletionsCount = 0;
      try {
        const result = await db.execute(sql`SELECT count(*)::int as count FROM chapter_completions`);
        chapterCompletionsCount = (result as any[])[0]?.count ?? 0;
      } catch {
        // Table doesn't exist yet, that's fine
      }

      const onboardingTotal = onboardingResult[0]?.total ?? 0;
      const onboardingCompleted = onboardingResult[0]?.completed ?? 0;
      const onboardingRate = Number(onboardingTotal) > 0
        ? Math.round((Number(onboardingCompleted) / Number(onboardingTotal)) * 100)
        : 0;

      res.json({
        summary: {
          totalUsers: totalUsersResult[0]?.count ?? 0,
          usersThisWeek: usersThisWeekResult[0]?.count ?? 0,
          usersThisMonth: usersThisMonthResult[0]?.count ?? 0,
          totalTastings: totalTastingsResult[0]?.count ?? 0,
          tastingsThisWeek: tastingsThisWeekResult[0]?.count ?? 0,
          tastingsThisMonth: tastingsThisMonthResult[0]?.count ?? 0,
          onboardingCompletionRate: onboardingRate,
        },
        recentUsers: (recentUsersResult as any[]).map((row: any) => ({
          email: row.email,
          createdAt: row.created_at,
          tastingsCompleted: row.tastings_completed,
          lastTastingDate: row.last_tasting_date,
          tastingLevel: row.tasting_level,
          onboardingCompleted: row.onboarding_completed,
        })),
        journeys: {
          activeJourneys: activeJourneysResult[0]?.count ?? 0,
          usersEnrolled: usersEnrolledResult[0]?.count ?? 0,
          chapterCompletions: chapterCompletionsCount,
        },
        sessions: {
          totalSessions: totalSessionsResult[0]?.count ?? 0,
          totalParticipants: totalParticipantsResult[0]?.count ?? 0,
          sessionsThisMonth: sessionsThisMonthResult[0]?.count ?? 0,
        },
      });
    } catch (error) {
      console.error("Error fetching engagement metrics:", error);
      res.status(500).json({ message: "Failed to fetch engagement metrics" });
    }
  });
}
