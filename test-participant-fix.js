// Test script to verify participant ID fix
const testCases = [
  { participantId: 'valid-uuid-123', expected: 'should work' },
  { participantId: 'undefined', expected: 'should return 400' },
  { participantId: 'null', expected: 'should return 400' },
  { participantId: '', expected: 'should return 400' },
  { participantId: undefined, expected: 'should be skipped' }
];

async function testEndpoint(participantId) {
  const url = participantId 
    ? `http://localhost:5000/api/packages/TEST/slides?participantId=${participantId}`
    : `http://localhost:5000/api/packages/TEST/slides`;
    
  try {
    const response = await fetch(url);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function runTests() {
  console.log('Testing participant ID validation...\n');
  
  for (const testCase of testCases) {
    console.log(`Testing participantId: "${testCase.participantId}"`);
    const result = await testEndpoint(testCase.participantId);
    console.log(`Result: ${result.status} - ${testCase.expected}`);
    console.log(`Response:`, result.data || result.error);
    console.log('---');
  }
}

// Note: This test requires the server to be running
console.log('Make sure the server is running on port 5000');
console.log('This test will check if invalid participant IDs are handled correctly\n');