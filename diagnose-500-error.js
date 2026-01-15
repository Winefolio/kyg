#!/usr/bin/env node

/**
 * Diagnostic script to pinpoint the exact 500 error
 */

const { Client } = require('pg');

async function diagnoseError() {
  console.log('🔍 Session Join 500 Error Diagnostic');
  console.log('===================================\n');
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    // 1. Get an active session
    console.log('1️⃣ Getting active session...');
    const sessionResult = await client.query(`
      SELECT s.*, p.code as package_code
      FROM sessions s
      JOIN packages p ON s.package_id = p.id
      WHERE s.status = 'active'
      ORDER BY s.updated_at DESC
      LIMIT 1
    `);
    
    if (sessionResult.rows.length === 0) {
      console.log('❌ No active sessions found');
      return;
    }
    
    const session = sessionResult.rows[0];
    console.log('✅ Found session:', {
      id: session.id,
      short_code: session.short_code,
      package_id: session.package_id,
      package_code: session.package_code
    });
    
    // 2. Check if session has a host
    console.log('\n2️⃣ Checking for host...');
    const hostResult = await client.query(`
      SELECT id, display_name, is_host
      FROM participants
      WHERE session_id = $1 AND is_host = true
    `, [session.id]);
    
    console.log(`✅ Found ${hostResult.rows.length} host(s)`);
    
    // 3. Test different identifier formats
    console.log('\n3️⃣ Testing identifier lookups...');
    
    // Test UUID lookup
    const uuidLookup = await client.query(`
      SELECT id, short_code FROM sessions WHERE id = $1
    `, [session.id]);
    console.log('UUID lookup:', uuidLookup.rows.length > 0 ? '✅ Works' : '❌ Failed');
    
    // Test short code lookup
    const shortCodeLookup = await client.query(`
      SELECT id, short_code FROM sessions WHERE short_code = $1
    `, [session.short_code]);
    console.log('Short code lookup:', shortCodeLookup.rows.length > 0 ? '✅ Works' : '❌ Failed');
    
    // 4. Test participant insertion directly
    console.log('\n4️⃣ Testing direct participant insertion...');
    
    const testParticipant = {
      sessionId: session.id,
      email: `test${Date.now()}@example.com`,
      displayName: `Test User ${Date.now()}`,
      isHost: false
    };
    
    console.log('Inserting with data:', testParticipant);
    
    try {
      const insertResult = await client.query(`
        INSERT INTO participants (session_id, email, display_name, is_host, progress_ptr)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        testParticipant.sessionId,
        testParticipant.email,
        testParticipant.displayName,
        testParticipant.isHost,
        0
      ]);
      
      console.log('✅ Direct insert successful:', insertResult.rows[0].id);
      
      // Clean up
      await client.query('DELETE FROM participants WHERE id = $1', [insertResult.rows[0].id]);
      
    } catch (error) {
      console.log('❌ Direct insert failed:', {
        code: error.code,
        message: error.message,
        detail: error.detail,
        table: error.table,
        constraint: error.constraint
      });
    }
    
    // 5. Check for any database triggers or rules
    console.log('\n5️⃣ Checking for triggers...');
    const triggerResult = await client.query(`
      SELECT 
        t.tgname as trigger_name,
        p.proname as function_name,
        pg_get_triggerdef(t.oid) as definition
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE t.tgrelid = 'participants'::regclass
        AND NOT t.tgisinternal
    `);
    
    if (triggerResult.rows.length > 0) {
      console.log('⚠️  Found triggers on participants table:');
      triggerResult.rows.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name}: ${trigger.function_name}`);
      });
    } else {
      console.log('✅ No custom triggers found');
    }
    
    // 6. Check for any check constraints
    console.log('\n6️⃣ Checking constraints...');
    const constraintResult = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'participants'::regclass
        AND contype = 'c'
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log('⚠️  Found check constraints:');
      constraintResult.rows.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.definition}`);
      });
    } else {
      console.log('✅ No check constraints found');
    }
    
    // 7. Test with API endpoint
    console.log('\n7️⃣ Testing via API endpoint...');
    console.log('Run this curl command to test:');
    console.log(`
curl -X POST http://localhost:5000/api/sessions/${session.short_code}/participants \\
  -H "Content-Type: application/json" \\
  -d '{
    "displayName": "API Test User",
    "email": "apitest@example.com",
    "isHost": false
  }' -v
    `);
    
  } catch (error) {
    console.error('Diagnostic error:', error);
  } finally {
    await client.end();
  }
}

// Run diagnostic
diagnoseError().then(() => {
  console.log('\n✅ Diagnostic complete');
}).catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});