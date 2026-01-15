#!/usr/bin/env node

// Test script to verify session join fix
// This script tests various scenarios that could cause 500 errors

const baseUrl = process.env.API_URL || 'http://localhost:5000';

// Test cases for session join
const testCases = [
  {
    name: 'Valid UUID session ID',
    sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Example UUID
    participant: {
      displayName: 'Test User 1',
      email: 'test1@example.com',
      isHost: false
    },
    expectedStatus: [404, 200] // 404 if session doesn't exist, 200 if it does
  },
  {
    name: 'Short code (6 chars)',
    sessionId: 'ABC123',
    participant: {
      displayName: 'Test User 2',
      email: 'test2@example.com',
      isHost: false
    },
    expectedStatus: [404, 200] // Should work if getSessionById handles short codes
  },
  {
    name: 'Invalid identifier - undefined',
    sessionId: 'undefined',
    participant: {
      displayName: 'Test User 3',
      email: 'test3@example.com',
      isHost: false
    },
    expectedStatus: 400 // Should return 400 for invalid identifier
  },
  {
    name: 'Invalid identifier - null',
    sessionId: 'null',
    participant: {
      displayName: 'Test User 4',
      email: 'test4@example.com',
      isHost: false
    },
    expectedStatus: 400 // Should return 400 for invalid identifier
  },
  {
    name: 'Empty identifier',
    sessionId: '',
    participant: {
      displayName: 'Test User 5',
      email: 'test5@example.com',
      isHost: false
    },
    expectedStatus: 404 // Express will handle empty param as 404
  },
  {
    name: 'Missing required fields',
    sessionId: 'TEST123',
    participant: {
      // Missing displayName
      email: 'test6@example.com',
      isHost: false
    },
    expectedStatus: 400 // Should return 400 for validation error
  },
  {
    name: 'Invalid email format',
    sessionId: 'TEST123',
    participant: {
      displayName: 'Test User 7',
      email: 'not-an-email',
      isHost: false
    },
    expectedStatus: 400 // Should return 400 for validation error
  }
];

async function testSessionJoin(testCase) {
  const url = `${baseUrl}/api/sessions/${testCase.sessionId}/participants`;
  
  console.log(`\n📝 Testing: ${testCase.name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Payload:`, JSON.stringify(testCase.participant, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCase.participant)
    });
    
    const data = await response.json();
    const statusOk = Array.isArray(testCase.expectedStatus) 
      ? testCase.expectedStatus.includes(response.status)
      : response.status === testCase.expectedStatus;
    
    console.log(`   Status: ${response.status} ${statusOk ? '✅' : '❌'}`);
    console.log(`   Response:`, data);
    
    if (!statusOk) {
      console.log(`   ⚠️  Expected status: ${testCase.expectedStatus}`);
    }
    
    // Check for specific error codes in 500 responses
    if (response.status === 500 && data.errorCode) {
      console.log(`   Error Code: ${data.errorCode}`);
      console.log(`   This helps identify the specific issue!`);
    }
    
    return { ...testCase, status: response.status, success: statusOk };
  } catch (error) {
    console.log(`   ❌ Network error:`, error.message);
    return { ...testCase, status: 'error', success: false };
  }
}

async function runTests() {
  console.log('🧪 Session Join Fix Test Suite');
  console.log('==============================');
  console.log(`Testing against: ${baseUrl}`);
  console.log('');
  console.log('Make sure the server is running!');
  console.log('');
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testSessionJoin(testCase);
    results.push(result);
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name} (got ${r.status}, expected ${r.expectedStatus})`);
    });
  }
}

// Run the tests
runTests().catch(console.error);