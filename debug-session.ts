import { storage } from './server/storage';

(async () => {
  try {
    // Check for session VTIIZV
    const session = await storage.getSessionById('VTIIZV');
    if (!session) {
      console.log('Session VTIIZV not found');
      return;
    }
    
    console.log('Session VTIIZV:', {
      id: session.id,
      packageId: session.packageId,
      packageCode: session.packageCode,
      status: session.status
    });
    
    // Get package details
    const pkg = await storage.getPackageById(session.packageId!);
    console.log('Package:', {
      id: pkg?.id,
      code: pkg?.code,
      name: pkg?.name
    });
    
    // Get wines for the package
    const wines = await storage.getPackageWines(session.packageId!);
    console.log('Wines in package:', wines.length);
    
    // Get ALL slides for the package
    const allSlides = [];
    for (const wine of wines) {
      const wineSlides = await storage.getSlidesByPackageWineId(wine.id);
      allSlides.push(...wineSlides);
    }
    
    console.log('Total slides in package:', allSlides.length);
    
    // Sort by global position to check for duplicates
    allSlides.sort((a, b) => (a.globalPosition || 0) - (b.globalPosition || 0));
    
    // Check for duplicate global positions
    const positionCounts: Record<number, number> = {};
    for (const slide of allSlides) {
      const pos = slide.globalPosition || 0;
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    }
    
    console.log('\nGlobal position distribution:');
    Object.entries(positionCounts).forEach(([pos, count]) => {
      if (count > 1) {
        console.log('🚨 DUPLICATE position', pos, ':', count, 'slides');
      } else {
        console.log('✅ Position', pos, ':', count, 'slide');
      }
    });
    
    // Find the problematic position 2110 mentioned in other reports
    const duplicateSlides = allSlides.filter(s => (s.globalPosition || 0) === 2110);
    if (duplicateSlides.length > 0) {
      console.log('\n🚨 Slides with position 2110:');
      duplicateSlides.forEach((slide, i) => {
        console.log(`Slide ${i + 1}:`, {
          id: slide.id,
          type: slide.type,
          position: slide.position,
          globalPosition: slide.globalPosition,
          packageWineId: slide.packageWineId,
          title: slide.payloadJson?.title || 'No title'
        });
      });
    }
    
    // Show the actual ordered sequence of slides as they would appear in TastingSession
    console.log('\n📋 Slide sequence (first 15):');
    allSlides.slice(0, 15).forEach((slide, i) => {
      console.log(`Index ${i}:`, {
        globalPosition: slide.globalPosition,
        type: slide.type,
        title: slide.payloadJson?.title || 'No title',
        section: slide.section_type
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
})();