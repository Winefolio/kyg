#!/usr/bin/env node

/**
 * Test script to reproduce session join 500 error
 * Tests various scenarios to identify the root cause
 */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

// Test configuration
const API_BASE = 'http://localhost:5000';
const TEST_SCENARIOS = [
  {
    name: 'Join with valid UUID',
    sessionId: null, // Will be populated from active session
    isUUID: true
  },
  {
    name: 'Join with valid short code',
    sessionId: null, // Will be populated from active session
    isShortCode: true
  },
  {
    name: 'Join with invalid UUID',
    sessionId: 'invalid-uuid-format',
    isInvalid: true
  },
  {
    name: 'Join with non-existent UUID',
    sessionId: '00000000-0000-0000-0000-000000000000',
    isNonExistent: true
  },
  {
    name: 'Join with invalid short code',
    sessionId: 'INVAL1',
    isInvalid: true
  },
  {
    name: 'Join with lowercase short code',
    sessionId: null, // Will be converted from uppercase
    isLowercase: true
  }
];

async function getActiveSession() {
  console.log('\n📋 Fetching active session...');
  
  try {
    const response = await fetch(`${API_BASE}/api/sessions/active`);
    if (!response.ok) {
      console.log('No active sessions found via API, checking database directly...');
      
      // Direct database query
      const { Client } = await import('pg');
      const client = new Client({ connectionString: DATABASE_URL });
      await client.connect();
      
      const result = await client.query(`
        SELECT s.id, s.short_code, s.status, p.code as package_code
        FROM sessions s
        JOIN packages p ON s.package_id = p.id
        WHERE s.status = 'active'
        ORDER BY s.updated_at DESC
        LIMIT 1
      `);
      
      await client.end();
      
      if (result.rows.length === 0) {
        throw new Error('No active sessions in database');
      }
      
      return result.rows[0];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to get active session:', error.message);
    throw error;
  }
}

async function createTestSession() {
  console.log('\n🎯 Creating test session...');
  
  try {
    // First, get a package code
    const packagesResponse = await fetch(`${API_BASE}/api/packages`);
    if (!packagesResponse.ok) {
      throw new Error('Failed to fetch packages');
    }
    
    const packages = await packagesResponse.json();
    if (packages.length === 0) {
      throw new Error('No packages available');
    }
    
    const packageCode = packages[0].code;
    console.log(`Using package: ${packageCode}`);
    
    // Create session
    const sessionResponse = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageCode })
    });
    
    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Failed to create session: ${error}`);
    }
    
    const session = await sessionResponse.json();
    console.log(`Created session: ${session.id} (${session.short_code})`);
    
    // Add host
    const hostResponse = await fetch(`${API_BASE}/api/sessions/${session.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Test Host',
        email: 'host@test.com',
        isHost: true
      })
    });
    
    if (!hostResponse.ok) {
      const error = await hostResponse.text();
      throw new Error(`Failed to add host: ${error}`);
    }
    
    // Activate session
    const activateResponse = await fetch(`${API_BASE}/api/sessions/${session.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' })
    });
    
    if (!activateResponse.ok) {
      const error = await activateResponse.text();
      throw new Error(`Failed to activate session: ${error}`);
    }
    
    return session;
  } catch (error) {
    console.error('Failed to create test session:', error.message);
    throw error;
  }
}

async function testJoinScenario(scenario, activeSession) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log('━'.repeat(50));
  
  let sessionId = scenario.sessionId;
  
  // Prepare session ID based on scenario
  if (scenario.isUUID && activeSession) {
    sessionId = activeSession.id;
  } else if (scenario.isShortCode && activeSession) {
    sessionId = activeSession.short_code;
  } else if (scenario.isLowercase && activeSession) {
    sessionId = activeSession.short_code.toLowerCase();
  }
  
  console.log(`Session ID: ${sessionId}`);
  console.log(`ID Type: ${getIdType(sessionId)}`);
  
  const participantData = {
    displayName: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    isHost: false
  };
  
  console.log(`Participant: ${JSON.stringify(participantData, null, 2)}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participantData)
    });
    
    const duration = Date.now() - startTime;
    console.log(`Response Time: ${duration}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    if (!response.ok) {
      console.log(`❌ Error Response:`, JSON.stringify(responseData, null, 2));
      
      // Check server logs
      console.log('\n📝 Checking server logs...');
      await checkServerLogs();
    } else {
      console.log(`✅ Success:`, JSON.stringify(responseData, null, 2));
    }
    
    return { success: response.ok, status: response.status, data: responseData };
  } catch (error) {
    console.log(`❌ Network Error:`, error.message);
    return { success: false, error: error.message };
  }
}

function getIdType(id) {
  if (!id) return 'null';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return 'UUID';
  }
  if (id.length === 6 && /^[A-Z0-9]{6}$/.test(id)) {
    return 'Short Code (uppercase)';
  }
  if (id.length === 6 && /^[a-z0-9]{6}$/.test(id)) {
    return 'Short Code (lowercase)';
  }
  return 'Invalid Format';
}

async function checkServerLogs() {
  // This would need to check actual server logs or database error logs
  console.log('(Server log checking would be implemented here)');
}

async function runTests() {
  console.log('🚀 Session Join Error Test Suite');
  console.log('═'.repeat(50));
  
  try {
    // Get or create active session
    let activeSession;
    try {
      activeSession = await getActiveSession();
      console.log(`\n✅ Found active session: ${activeSession.id} (${activeSession.short_code})`);
    } catch (error) {
      console.log('\n⚠️  No active session found, creating one...');
      activeSession = await createTestSession();
    }
    
    // Run test scenarios
    const results = [];
    for (const scenario of TEST_SCENARIOS) {
      const result = await testJoinScenario(scenario, activeSession);
      results.push({ scenario: scenario.name, ...result });
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('═'.repeat(50));
    results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.scenario}: ${result.status || result.error}`);
    });
    
    // Check for 500 errors
    const errors500 = results.filter(r => r.status === 500);
    if (errors500.length > 0) {
      console.log(`\n⚠️  Found ${errors500.length} scenarios with 500 errors!`);
      errors500.forEach(error => {
        console.log(`\n500 Error Details for "${error.scenario}":`);
        console.log(JSON.stringify(error.data, null, 2));
      });
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runTests().then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testJoinScenario };