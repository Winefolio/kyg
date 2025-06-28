import { storage } from './server/storage';

(async () => {
  try {
    // Get session VTIIZV
    const session = await storage.getSessionById('VTIIZV');
    const wines = await storage.getPackageWines(session.packageId!);
    
    console.log('WINE BREAKDOWN:');
    for (const wine of wines) {
      console.log(`\nWine: ${wine.wineName} (position: ${wine.position})`);
      const wineSlides = await storage.getSlidesByPackageWineId(wine.id);
      wineSlides.sort((a, b) => (a.globalPosition || 0) - (b.globalPosition || 0));
      
      wineSlides.forEach((slide, i) => {
        console.log(`  Slide ${i}:`, {
          globalPos: slide.globalPosition,
          localPos: slide.position,
          type: slide.type,
          section: slide.section_type,
          title: slide.payloadJson?.title?.substring(0, 50) || 'No title'
        });
      });
      
      console.log(`  Total slides for this wine: ${wineSlides.length}`);
    }
    
    // Calculate expected total
    let expectedTotal = 0;
    for (const wine of wines) {
      const wineSlides = await storage.getSlidesByPackageWineId(wine.id);
      expectedTotal += wineSlides.length;
    }
    
    console.log('\nEXPECTED vs ACTUAL:');
    console.log(`Expected total slides: ${expectedTotal}`);
    console.log('Actual slides found: 11');
    console.log('Frontend trying to access index 11 (12th slide)');
    
    // Check if any wine is missing slides (especially the third wine)
    console.log('\nWINE SLIDE DISTRIBUTION:');
    wines.forEach((wine, i) => {
      const expectedSlidesPerWine = 3; // Based on typical patterns
      console.log(`Wine ${i + 1} (${wine.wineName}): Expected ~${expectedSlidesPerWine} slides`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
})();