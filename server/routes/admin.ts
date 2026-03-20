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
      // Total tastings = solo tastings + group session participations
      const [
        totalUsersResult,
        usersThisWeekResult,
        usersThisMonthResult,
        soloTastingsResult,
        soloTastingsThisWeekResult,
        soloTastingsThisMonthResult,
        groupTastingsResult,
        groupTastingsThisWeekResult,
        groupTastingsThisMonthResult,
        onboardingResult,
        recentUsersResult,
        activeJourneysResult,
        usersEnrolledResult,
        totalSessionsResult,
        totalParticipantsResult,
        sessionsThisMonthResult,
      ] = await Promise.all([
        // User counts
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfWeek)),
        db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfMonth)),

        // Solo tasting counts
        db.select({ count: count() }).from(tastings),
        db.select({ count: count() }).from(tastings).where(gte(tastings.tastedAt, startOfWeek)),
        db.select({ count: count() }).from(tastings).where(gte(tastings.tastedAt, startOfMonth)),

        // Group tasting counts (each participant in a session = 1 tasting)
        db.select({ count: count() }).from(participants),
        db.select({ count: count() }).from(participants).where(gte(participants.createdAt, startOfWeek)),
        db.select({ count: count() }).from(participants).where(gte(participants.createdAt, startOfMonth)),

        // Onboarding
        db.select({
          total: count(),
          completed: count(sql`CASE WHEN ${users.onboardingCompleted} = true THEN 1 END`),
        }).from(users),

        // Recent users: count solo + group tastings, sort by most recent activity
        db.execute(sql`
          SELECT
            u.email,
            u.created_at,
            (SELECT count(*) FROM tastings t WHERE t.user_id = u.id)::int as solo_tastings,
            (SELECT count(*) FROM participants p WHERE p.email = u.email)::int as group_tastings,
            u.tasting_level,
            u.onboarding_completed,
            GREATEST(
              (SELECT MAX(t.tasted_at) FROM tastings t WHERE t.user_id = u.id),
              (SELECT MAX(p.created_at) FROM participants p WHERE p.email = u.email)
            ) as last_tasting_date
          FROM users u
          ORDER BY COALESCE(
            GREATEST(
              (SELECT MAX(t.tasted_at) FROM tastings t WHERE t.user_id = u.id),
              (SELECT MAX(p.created_at) FROM participants p WHERE p.email = u.email)
            ),
            u.created_at
          ) DESC
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

      const soloTotal = Number(soloTastingsResult[0]?.count ?? 0);
      const groupTotal = Number(groupTastingsResult[0]?.count ?? 0);
      const soloWeek = Number(soloTastingsThisWeekResult[0]?.count ?? 0);
      const groupWeek = Number(groupTastingsThisWeekResult[0]?.count ?? 0);
      const soloMonth = Number(soloTastingsThisMonthResult[0]?.count ?? 0);
      const groupMonth = Number(groupTastingsThisMonthResult[0]?.count ?? 0);

      res.json({
        summary: {
          totalUsers: totalUsersResult[0]?.count ?? 0,
          usersThisWeek: usersThisWeekResult[0]?.count ?? 0,
          usersThisMonth: usersThisMonthResult[0]?.count ?? 0,
          totalTastings: soloTotal + groupTotal,
          tastingsThisWeek: soloWeek + groupWeek,
          tastingsThisMonth: soloMonth + groupMonth,
          soloTastings: soloTotal,
          groupTastings: groupTotal,
          onboardingCompletionRate: onboardingRate,
        },
        recentUsers: (recentUsersResult as any[]).map((row: any) => ({
          email: row.email,
          createdAt: row.created_at,
          soloTastings: row.solo_tastings,
          groupTastings: row.group_tastings,
          tastingsCompleted: Number(row.solo_tastings) + Number(row.group_tastings),
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

  // User detail: tasting history for a specific user
  app.get("/api/admin/user/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);

      const [soloTastings, groupSessions] = await Promise.all([
        // Solo tastings
        db.execute(sql`
          SELECT t.id, t.wine_name, t.wine_type, t.wine_region, t.tasted_at, t.tasting_mode,
                 'solo' as source
          FROM tastings t
          JOIN users u ON u.id = t.user_id
          WHERE u.email = ${email}
          ORDER BY t.tasted_at DESC
        `),
        // Group sessions
        db.execute(sql`
          SELECT p.id, p.display_name, p.created_at, p.is_host,
                 s.short_code, s.status as session_status,
                 pkg.name as package_name,
                 (SELECT count(*) FROM responses r WHERE r.participant_id = p.id)::int as responses_count,
                 'group' as source
          FROM participants p
          JOIN sessions s ON s.id = p.session_id
          LEFT JOIN packages pkg ON pkg.id = s.package_id
          WHERE p.email = ${email}
          ORDER BY p.created_at DESC
        `),
      ]);

      res.json({
        email,
        soloTastings: soloTastings as any[],
        groupSessions: groupSessions as any[],
      });
    } catch (error) {
      console.error("Error fetching user detail:", error);
      res.status(500).json({ message: "Failed to fetch user detail" });
    }
  });
}
