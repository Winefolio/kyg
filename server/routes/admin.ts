import type { Express } from "express";
import { db } from "../db";
import { users, tastings, userJourneys, sessions, participants, journeys } from "@shared/schema";
import { sql, count, eq, gte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";

export function registerAdminRoutes(app: Express) {
  console.log("📊 Registering admin engagement endpoints...");

  app.get("/api/admin/engagement", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Run all queries in parallel
      // Total tastings = solo tastings + group session participations
      const weekIso = startOfWeek.toISOString();
      const monthIso = startOfMonth.toISOString();

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
        pierreStatsResult,
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

        // Recent users: count solo + group tastings + Pierre stats, sort by most recent activity
        db.execute(sql`
          SELECT
            u.email,
            u.created_at,
            COALESCE(t_agg.cnt, 0)::int as solo_tastings,
            COALESCE(p_agg.cnt, 0)::int as group_tastings,
            COALESCE(sc_agg.cnt, 0)::int as pierre_chats,
            COALESCE(sm_agg.cnt, 0)::int as pierre_messages,
            u.tasting_level,
            u.onboarding_completed,
            GREATEST(t_agg.max_at, p_agg.max_at) as last_tasting_date,
            u.last_seen_at
          FROM users u
          LEFT JOIN (SELECT user_id, count(*) as cnt, MAX(tasted_at) as max_at FROM tastings GROUP BY user_id) t_agg ON t_agg.user_id = u.id
          LEFT JOIN (SELECT email, count(*) as cnt, MAX(created_at) as max_at FROM participants GROUP BY email) p_agg ON p_agg.email = u.email
          LEFT JOIN (SELECT user_id, count(*) as cnt FROM sommelier_chats GROUP BY user_id) sc_agg ON sc_agg.user_id = u.id
          LEFT JOIN (
            SELECT sc2.user_id, count(*) as cnt
            FROM sommelier_messages sm
            JOIN sommelier_chats sc2 ON sc2.id = sm.chat_id
            WHERE sm.role = 'user'
            GROUP BY sc2.user_id
          ) sm_agg ON sm_agg.user_id = u.id
          ORDER BY COALESCE(GREATEST(t_agg.max_at, p_agg.max_at), u.created_at) DESC
        `),

        // Journey stats
        db.select({ count: count() }).from(journeys).where(eq(journeys.isPublished, true)),
        db.select({ count: count() }).from(userJourneys),

        // Session stats
        db.select({ count: count() }).from(sessions),
        db.select({ count: count() }).from(participants),
        db.select({ count: count() }).from(sessions).where(gte(sessions.startedAt, startOfMonth)),

        // Pierre + recommendation stats — single query
        db.execute(sql`
          SELECT
            (SELECT count(*) FROM sommelier_chats)::int as total_chats,
            (SELECT count(*) FROM sommelier_chats WHERE created_at >= ${weekIso}::timestamp)::int as chats_week,
            (SELECT count(*) FROM sommelier_chats WHERE created_at >= ${monthIso}::timestamp)::int as chats_month,
            (SELECT count(*) FROM sommelier_messages WHERE role = 'user')::int as total_messages,
            (SELECT count(*) FROM sommelier_messages WHERE role = 'user' AND created_at >= ${weekIso}::timestamp)::int as messages_week,
            (SELECT count(*) FROM sommelier_messages WHERE role = 'user' AND created_at >= ${monthIso}::timestamp)::int as messages_month,
            (SELECT count(DISTINCT user_id) FROM sommelier_chats)::int as distinct_users,
            (SELECT count(*) FROM tastings WHERE recommendations IS NOT NULL)::int as recs_total,
            (SELECT count(*) FROM tastings WHERE recommendations IS NOT NULL AND tasted_at >= ${weekIso}::timestamp)::int as recs_week,
            (SELECT count(*) FROM tastings WHERE recommendations IS NOT NULL AND tasted_at >= ${monthIso}::timestamp)::int as recs_month
        `),
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

      const ps = (pierreStatsResult as any[])[0] ?? {};
      const totalUsersCount = Number(totalUsersResult[0]?.count ?? 0);
      const pierreUsersCount = Number(ps.distinct_users ?? 0);
      const pierreUsersPct = totalUsersCount > 0
        ? Math.round((pierreUsersCount / totalUsersCount) * 100)
        : 0;

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
        pierre: {
          totalChats: Number(ps.total_chats ?? 0),
          chatsThisWeek: Number(ps.chats_week ?? 0),
          chatsThisMonth: Number(ps.chats_month ?? 0),
          totalMessages: Number(ps.total_messages ?? 0),
          messagesThisWeek: Number(ps.messages_week ?? 0),
          messagesThisMonth: Number(ps.messages_month ?? 0),
          distinctUsers: pierreUsersCount,
          distinctUsersPct: pierreUsersPct,
        },
        recommendations: {
          total: Number(ps.recs_total ?? 0),
          thisWeek: Number(ps.recs_week ?? 0),
          thisMonth: Number(ps.recs_month ?? 0),
        },
        recentUsers: (recentUsersResult as any[]).map((row: any) => ({
          email: row.email,
          createdAt: row.created_at,
          soloTastings: row.solo_tastings,
          groupTastings: row.group_tastings,
          pierreChats: Number(row.pierre_chats ?? 0),
          pierreMessages: Number(row.pierre_messages ?? 0),
          tastingsCompleted: Number(row.solo_tastings) + Number(row.group_tastings),
          lastTastingDate: row.last_tasting_date,
          tastingLevel: row.tasting_level,
          onboardingCompleted: row.onboarding_completed,
          lastSeenAt: row.last_seen_at,
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
  app.get("/api/admin/user/:email", requireAuth, requireAdmin, async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);

      const [soloTastings, groupSessions, pierreChats] = await Promise.all([
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
        // Pierre chats
        db.execute(sql`
          SELECT sc.id, sc.title, sc.message_count,
                 sc.created_at, sc.updated_at,
                 (SELECT MAX(sm.created_at) FROM sommelier_messages sm WHERE sm.chat_id = sc.id) as last_message_at
          FROM sommelier_chats sc
          JOIN users u ON u.id = sc.user_id
          WHERE u.email = ${email}
          ORDER BY sc.updated_at DESC
        `),
      ]);

      res.json({
        email,
        soloTastings: soloTastings as any[],
        groupSessions: groupSessions as any[],
        pierreChats: pierreChats as any[],
      });
    } catch (error) {
      console.error("Error fetching user detail:", error);
      res.status(500).json({ message: "Failed to fetch user detail" });
    }
  });
}
