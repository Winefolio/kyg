// Test script for generateSommelierTips function
// Run with: npx tsx test-sommelier-tips.ts

import { generateSommelierTips } from './server/storage';

async function testSommelierTips() {
  try {
    console.log('🍷 Testing generateSommelierTips function...\n');
    
    // Test with a sample email
    const testEmail = 'test@example.com';
    
    console.log(`Testing with email: ${testEmail}`);
    console.log('⏳ Generating sommelier tips...\n');
    
    const tips = await generateSommelierTips(testEmail);
    
    console.log('✅ Successfully generated sommelier tips!\n');
    console.log('📋 Results:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('🎯 Preference Profile:');
    console.log(`"${tips.preferenceProfile}"\n`);
    
    console.log('🍷 Red Wine Description:');
    console.log(`"${tips.redDescription}"\n`);
    
    console.log('🥂 White Wine Description:');
    console.log(`"${tips.whiteDescription}"\n`);
    
    console.log('❓ Questions to Ask Sommeliers:');
    tips.questions.forEach((question, index) => {
      console.log(`${index + 1}. ${question}`);
    });
    console.log('');
    
    console.log('💰 Price Guidance:');
    console.log(`"${tips.priceGuidance}"\n`);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testSommelierTips();
