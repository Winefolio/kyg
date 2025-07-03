#!/usr/bin/env node

// Diagnostic script to check for session-related issues in the database
// Run this with: node diagnose-sessions.js

const { db } = require('./server/db');
const { sessions, participants, packages } = require('./shared/schema');
const { eq, isNull, sql } = require('drizzle-orm');

async function diagnoseSessions() {
  console.log('🔍 Session Diagnostics');
  console.log('=====================\n');
  
  try {
    // 1. Check for sessions with invalid UUIDs
    console.log('1. Checking session UUID formats...');
    const allSessions = await db.select().from(sessions);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    const invalidUuidSessions = allSessions.filter(s => !uuidRegex.test(s.id));
    if (invalidUuidSessions.length > 0) {
      console.log(`   ❌ Found ${invalidUuidSessions.length} sessions with invalid UUID format:`);
      invalidUuidSessions.forEach(s => {
        console.log(`      - ID: ${s.id}, Short Code: ${s.short_code}`);
      });
    } else {
      console.log('   ✅ All sessions have valid UUID format');
    }
    
    // 2. Check for duplicate short codes
    console.log('\n2. Checking for duplicate short codes...');
    const shortCodeCounts = await db
      .select({
        short_code: sessions.short_code,
        count: sql`count(*)::int`
      })
      .from(sessions)
      .where(sql`${sessions.short_code} IS NOT NULL`)
      .groupBy(sessions.short_code)
      .having(sql`count(*) > 1`);
    
    if (shortCodeCounts.length > 0) {
      console.log(`   ❌ Found duplicate short codes:`);
      shortCodeCounts.forEach(({ short_code, count }) => {
        console.log(`      - "${short_code}" appears ${count} times`);
      });
    } else {
      console.log('   ✅ No duplicate short codes found');
    }
    
    // 3. Check for orphaned participants
    console.log('\n3. Checking for orphaned participants...');
    const orphanedParticipants = await db
      .select({
        participant_id: participants.id,
        participant_name: participants.displayName,
        session_id: participants.sessionId
      })
      .from(participants)
      .leftJoin(sessions, eq(participants.sessionId, sessions.id))
      .where(isNull(sessions.id));
    
    if (orphanedParticipants.length > 0) {
      console.log(`   ❌ Found ${orphanedParticipants.length} orphaned participants:`);
      orphanedParticipants.forEach(p => {
        console.log(`      - ${p.participant_name} (ID: ${p.participant_id}) references non-existent session: ${p.session_id}`);
      });
    } else {
      console.log('   ✅ No orphaned participants found');
    }
    
    // 4. Check for sessions without hosts
    console.log('\n4. Checking for sessions without hosts...');
    const sessionsWithoutHosts = await db
      .select({
        session_id: sessions.id,
        short_code: sessions.short_code,
        status: sessions.status,
        participant_count: sql`count(${participants.id})::int`
      })
      .from(sessions)
      .leftJoin(participants, eq(sessions.id, participants.sessionId))
      .groupBy(sessions.id, sessions.short_code, sessions.status)
      .having(sql`count(case when ${participants.isHost} = true then 1 end) = 0`);
    
    if (sessionsWithoutHosts.length > 0) {
      console.log(`   ⚠️  Found ${sessionsWithoutHosts.length} sessions without hosts:`);
      sessionsWithoutHosts.forEach(s => {
        console.log(`      - Session ${s.short_code || s.session_id} (${s.status}) has ${s.participant_count} participants but no host`);
      });
    } else {
      console.log('   ✅ All sessions have hosts');
    }
    
    // 5. Check for active sessions
    console.log('\n5. Active sessions summary:');
    const activeSessions = await db
      .select({
        session_id: sessions.id,
        short_code: sessions.short_code,
        package_name: packages.name,
        participant_count: sql`count(${participants.id})::int`,
        host_count: sql`count(case when ${participants.isHost} = true then 1 end)::int`
      })
      .from(sessions)
      .leftJoin(packages, eq(sessions.packageId, packages.id))
      .leftJoin(participants, eq(sessions.id, participants.sessionId))
      .where(eq(sessions.status, 'active'))
      .groupBy(sessions.id, sessions.short_code, packages.name);
    
    if (activeSessions.length > 0) {
      console.log(`   Found ${activeSessions.length} active sessions:`);
      activeSessions.forEach(s => {
        console.log(`      - ${s.short_code || s.session_id}: "${s.package_name}" with ${s.participant_count} participants (${s.host_count} hosts)`);
      });
    } else {
      console.log('   No active sessions found');
    }
    
    // 6. Recent error patterns (if we had logs)
    console.log('\n6. Session join patterns (last 10 sessions):');
    const recentSessions = await db
      .select({
        session_id: sessions.id,
        short_code: sessions.short_code,
        created_at: sessions.updatedAt,
        participant_count: sql`count(${participants.id})::int`
      })
      .from(sessions)
      .leftJoin(participants, eq(sessions.id, participants.sessionId))
      .groupBy(sessions.id, sessions.short_code, sessions.updatedAt)
      .orderBy(sql`${sessions.updatedAt} desc`)
      .limit(10);
    
    recentSessions.forEach(s => {
      console.log(`      - ${s.short_code || s.session_id}: ${s.participant_count} participants (created: ${new Date(s.created_at).toLocaleString()})`);
    });
    
  } catch (error) {
    console.error('❌ Error running diagnostics:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run diagnostics
diagnoseSessions();