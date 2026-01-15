#!/usr/bin/env tsx

import fetch from 'node-fetch';

async function testWineCreation() {
  console.log('🧪 Testing wine creation with deep dive slides\n');
  
  try {
    // Test creating a wine in an existing package
    const testPackageCode = 'ASWFCM'; // One of the existing packages with no deep dive slides
    
    console.log(`Testing wine creation in package: ${testPackageCode}\n`);
    
    // First get the package ID
    const packageResponse = await fetch(`http://localhost:5000/api/packages/${testPackageCode}`);
    const packageData = await packageResponse.json();
    
    if (!packageData.id) {
      console.error('Package not found');
      return;
    }
    
    console.log(`Package ID: ${packageData.id}`);
    
    // Create a new wine
    const wineData = {
      packageId: packageData.id,
      wineName: 'Test Wine with Deep Dive',
      wineDescription: 'A test wine to verify deep dive slide creation',
      wineType: 'red',
      vintage: 2021,
      region: 'Test Valley',
      producer: 'Test Winery'
    };
    
    console.log('Creating wine...');
    const createResponse = await fetch(`http://localhost:5000/api/packages/${packageData.id}/wines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wineData)
    });
    
    const newWine = await createResponse.json();
    console.log(`Created wine: ${newWine.wineName} (ID: ${newWine.id})\n`);
    
    // Check the slides created for this wine
    console.log('Checking slides created for this wine...');
    const slidesResponse = await fetch(`http://localhost:5000/api/slides/${newWine.id}`);
    const slides = await slidesResponse.json();
    
    console.log(`Total slides created: ${slides.length}\n`);
    
    // Group by section type
    const slidesBySection = slides.reduce((acc, slide) => {
      const section = slide.section_type || 'none';
      acc[section] = (acc[section] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Slides by section_type:');
    Object.entries(slidesBySection).forEach(([section, count]) => {
      console.log(`  - ${section}: ${count} slides`);
    });
    
    const deepDiveSlides = slides.filter(s => s.section_type === 'deep_dive');
    console.log(`\n✅ Deep dive slides created: ${deepDiveSlides.length}`);
    
    if (deepDiveSlides.length > 0) {
      console.log('Deep dive slide titles:');
      deepDiveSlides.forEach((slide, i) => {
        console.log(`  ${i + 1}. ${slide.payloadJson?.title || 'Untitled'}`);
      });
    }
    
    // Now test the API endpoint that TastingSession uses
    console.log('\n🔍 Testing TastingSession API endpoint...');
    const tastingResponse = await fetch(`http://localhost:5000/api/packages/${testPackageCode}/slides`);
    const tastingData = await tastingResponse.json();
    
    const allSlides = tastingData.slides || [];
    const totalDeepDive = allSlides.filter(s => s.section_type === 'deep_dive').length;
    
    console.log(`Total slides in package: ${allSlides.length}`);
    console.log(`Total deep dive slides: ${totalDeepDive}`);
    
    if (totalDeepDive > 0) {
      console.log('\n🎉 SUCCESS: Deep dive slides are now being created for new wines!');
    } else {
      console.log('\n❌ ISSUE: Still no deep dive slides found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

testWineCreation();