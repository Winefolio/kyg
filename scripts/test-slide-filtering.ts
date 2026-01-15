#!/usr/bin/env tsx

import fetch from 'node-fetch';

async function testSlideFiltering() {
  console.log('🧪 Testing slide filtering logic for deep dive slides\n');
  
  try {
    // Simulate exactly what TastingSession does
    const response = await fetch('http://localhost:5000/api/packages/LM1GAA/slides');
    const slidesData = await response.json();
    
    const allSlides = slidesData.slides || [];
    const wines = slidesData.wines || [];
    
    console.log(`Total slides from API: ${allSlides.length}`);
    console.log(`Total wines: ${wines.length}\n`);
    
    // Separate package-level slides from wine-level slides (same as TastingSession)
    const packageLevelSlides = allSlides.filter(slide => slide.packageId && !slide.packageWineId);
    const wineLevelSlides = allSlides.filter(slide => slide.packageWineId);
    
    console.log(`Package-level slides: ${packageLevelSlides.length}`);
    console.log(`Wine-level slides: ${wineLevelSlides.length}\n`);
    
    // Group wine-level slides by wine (same as TastingSession)
    const slidesByWine = wineLevelSlides.reduce((acc, slide) => {
      const wineId = slide.packageWineId;
      if (!wineId) return acc;
      if (!acc[wineId]) {
        acc[wineId] = [];
      }
      acc[wineId].push(slide);
      return acc;
    }, {});
    
    // Process each wine (same logic as TastingSession)
    Object.keys(slidesByWine).forEach(wineId => {
      const wineSlides = slidesByWine[wineId];
      const wine = wines.find(w => w.id === wineId);
      
      console.log(`\n🍷 Wine: ${wine?.wineName || 'Unknown'} (${wineSlides.length} slides)`);
      
      // Sort slides by position (same as TastingSession)
      const sortedWineSlides = wineSlides.sort((a, b) => a.position - b.position);
      
      // Separate slides by database section_type (EXACTLY same as TastingSession)
      const getSlideSection = (slide) => {
        return slide.section_type || slide.payloadJson?.section_type || 'intro';
      };
      
      const introSlides = wineSlides.filter(slide => {
        const sectionType = slide.section_type || slide.payloadJson?.section_type;
        return sectionType === 'intro';
      }).sort((a, b) => a.position - b.position);
      
      const deepDiveSlides = wineSlides.filter(slide => {
        const sectionType = slide.section_type || slide.payloadJson?.section_type;
        return sectionType === 'deep_dive' || sectionType === 'tasting';
      }).sort((a, b) => a.position - b.position);
      
      const endingSlides = wineSlides.filter(slide => {
        const sectionType = slide.section_type || slide.payloadJson?.section_type;
        return sectionType === 'ending' || sectionType === 'conclusion';
      }).sort((a, b) => a.position - b.position);
      
      console.log(`  📂 Intro: ${introSlides.length} slides`);
      console.log(`  📂 Deep Dive: ${deepDiveSlides.length} slides`);  // THIS IS THE KEY CHECK
      console.log(`  📂 Ending: ${endingSlides.length} slides`);
      
      if (deepDiveSlides.length === 0) {
        console.log(`  ❌ NO DEEP DIVE SLIDES WOULD BE RENDERED!`);
        
        // Debug - show what section_types we actually have
        const actualSections = wineSlides.map(s => ({
          id: s.id,
          section_type: s.section_type,
          payloadSection: s.payloadJson?.section_type,
          title: s.payloadJson?.title
        }));
        console.log(`  🐛 Debug - actual section types:`, actualSections);
      } else {
        console.log(`  ✅ ${deepDiveSlides.length} deep dive slides would be rendered`);
        deepDiveSlides.forEach((slide, i) => {
          console.log(`     ${i + 1}. ${slide.payloadJson?.title || 'Untitled'}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

testSlideFiltering();