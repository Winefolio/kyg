#!/usr/bin/env node

/**
 * Simulates exact client behavior when joining a session
 */

async function simulateClientJoin() {
  console.log('🎯 Simulating Client Join Flow');
  console.log('==============================\n');
  
  const API_BASE = 'http://localhost:5000';
  
  try {
    // Step 1: Get active sessions to find one to join
    console.log('1️⃣ Fetching active sessions...');
    const sessionsResponse = await fetch(`${API_BASE}/api/sessions`);
    const sessions = await sessionsResponse.json();
    const activeSession = sessions.find(s => s.status === 'active');
    
    if (!activeSession) {
      console.log('❌ No active sessions found');
      return;
    }
    
    console.log(`✅ Found active session: ${activeSession.short_code} (${activeSession.id})`);
    
    // Step 2: Simulate joining via short code (most common user flow)
    console.log(`\n2️⃣ Simulating join via short code: ${activeSession.short_code}`);
    
    // First, fetch session details (like SessionJoin.tsx does)
    console.log('   Fetching session details...');
    const sessionDetailsResponse = await fetch(`${API_BASE}/api/sessions/${activeSession.short_code}`);
    
    if (!sessionDetailsResponse.ok) {
      const error = await sessionDetailsResponse.text();
      console.log(`   ❌ Failed to fetch session: ${sessionDetailsResponse.status} - ${error}`);
      return;
    }
    
    const sessionDetails = await sessionDetailsResponse.json();
    console.log(`   ✅ Got session details:`, {
      id: sessionDetails.id,
      short_code: sessionDetails.short_code,
      status: sessionDetails.status
    });
    
    // Step 3: Join as participant
    console.log('\n3️⃣ Joining session as participant...');
    
    const participantData = {
      displayName: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      isHost: false
    };
    
    console.log('   Request URL:', `${API_BASE}/api/sessions/${activeSession.short_code}/participants`);
    console.log('   Request body:', JSON.stringify(participantData, null, 2));
    
    const joinResponse = await fetch(`${API_BASE}/api/sessions/${activeSession.short_code}/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(participantData)
    });
    
    const responseText = await joinResponse.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    console.log(`\n   Response Status: ${joinResponse.status} ${joinResponse.statusText}`);
    console.log('   Response Headers:', Object.fromEntries(joinResponse.headers.entries()));
    console.log('   Response Body:', JSON.stringify(responseData, null, 2));
    
    if (!joinResponse.ok) {
      console.log('\n❌ Join failed!');
      
      // Try to extract error details
      if (responseData && typeof responseData === 'object') {
        console.log('\n📋 Error Details:');
        console.log('   Message:', responseData.message);
        console.log('   Error Code:', responseData.errorCode);
        console.log('   Timestamp:', responseData.timestamp);
      }
      
      // Try joining with UUID instead
      console.log('\n4️⃣ Retrying with UUID instead of short code...');
      
      const uuidJoinResponse = await fetch(`${API_BASE}/api/sessions/${activeSession.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...participantData,
          email: `test-uuid${Date.now()}@example.com` // Different email to avoid duplicates
        })
      });
      
      const uuidResponseText = await uuidJoinResponse.text();
      let uuidResponseData;
      
      try {
        uuidResponseData = JSON.parse(uuidResponseText);
      } catch (e) {
        uuidResponseData = uuidResponseText;
      }
      
      console.log(`\n   UUID Response Status: ${uuidJoinResponse.status}`);
      console.log('   UUID Response:', JSON.stringify(uuidResponseData, null, 2));
      
      if (uuidJoinResponse.ok) {
        console.log('\n⚠️  IMPORTANT: Join works with UUID but fails with short code!');
      }
      
    } else {
      console.log('\n✅ Successfully joined session!');
      console.log('   Participant ID:', responseData.id);
      console.log('   Display Name:', responseData.displayName);
    }
    
  } catch (error) {
    console.error('\n❌ Simulation error:', error);
  }
}

// Run simulation
simulateClientJoin().then(() => {
  console.log('\n✅ Simulation complete');
}).catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});