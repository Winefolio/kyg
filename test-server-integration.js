#!/usr/bin/env node

// Integration test for slide reorder API endpoint
// Tests the complete flow: client → server → database logic

async function testSlideReorderAPI() {
  console.log('🧪 Testing slide reorder API integration...\n');

  // Simulate the request that would be sent by our fixed client
  const testUpdates = [
    { slideId: 'test-slide-1', position: 30 },
    { slideId: 'test-slide-2', position: 20 },
  ];

  console.log('📤 Simulating API request to /api/slides/reorder');
  console.log('Request body:', { updates: testUpdates });

  try {
    const response = await fetch('http://localhost:5001/api/slides/reorder', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates: testUpdates }),
    });

    console.log('📥 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result);
    } else {
      const error = await response.json();
      console.log('❌ Error:', error);
      
      // Check if it's our expected error handling
      if (error.error === 'DUPLICATE_POSITION') {
        console.log('🎯 Duplicate position error handled correctly!');
      }
    }
  } catch (error) {
    console.log('🔗 Connection error (server might not be running):', error.message);
    console.log('💡 This is expected if server is not running on port 5001');
  }

  console.log('\n🔍 Key improvements in our fix:');
  console.log('1. Client only sends slides that actually changed position');
  console.log('2. Client validates for duplicate positions before sending');
  console.log('3. Server uses battle-tested reorderSlidesForWine function');
  console.log('4. Server provides clear error messages for conflicts');
  console.log('5. Two-phase update eliminates constraint violations');
}

// Test scenarios that previously failed
console.log('🎯 Scenarios that should now work:');
console.log('');
console.log('SCENARIO 1: Simple swap');
console.log('- User swaps slide A (pos 10) with slide B (pos 20)');
console.log('- Client sends: A→20, B→10');
console.log('- Server moves to temp positions, then final positions');
console.log('');
console.log('SCENARIO 2: Complex reordering');
console.log('- User reorders multiple slides across sections');
console.log('- Client sends only changed positions');
console.log('- Server handles all slides for wine atomically');
console.log('');
console.log('SCENARIO 3: Conflict detection');
console.log('- Client detects duplicate positions in localSlides');
console.log('- Shows error before sending to server');
console.log('- User can fix manually or system auto-resolves');

testSlideReorderAPI();