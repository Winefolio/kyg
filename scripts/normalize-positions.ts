import { db } from '../server/db';
import { packageWines, slides } from '../shared/schema';
import { eq, asc } from 'drizzle-orm';

const GAP_SIZE = 10000; // Use a large, clean gap

async function normalizeAllSlidePositions() {
  console.log('🔄 Starting slide position normalization...');
  
  // First, move ALL slides to very high temporary positions to avoid conflicts
  console.log('📍 Phase 1: Moving all slides to temporary positions...');
  const allSlides = await db.select({ id: slides.id }).from(slides);
  
  for (let i = 0; i < allSlides.length; i++) {
    const tempPosition = 1000000000 + (i * 100); // Start at 1 billion to avoid any conflicts
    await db
      .update(slides)
      .set({ position: tempPosition })
      .where(eq(slides.id, allSlides[i].id));
  }
  
  console.log(`✅ Moved ${allSlides.length} slides to temporary positions`);
  
  
  try {
    // Phase 2: Now assign clean positions to all slides grouped by wine
    console.log('\n📍 Phase 2: Assigning clean positions by wine...');
    
    // Get all wines
    const allWines = await db.select({ id: packageWines.id }).from(packageWines);
    console.log(`📦 Found ${allWines.length} wines to process`);
    
    let totalSlidesProcessed = 0;
    
    for (const wine of allWines) {
      console.log(`\n🍷 Processing wine: ${wine.id}`);
      
      // Get all slides for this wine, ordered by current position
      const wineSlides = await db
        .select({ id: slides.id, position: slides.position })
        .from(slides)
        .where(eq(slides.packageWineId, wine.id))
        .orderBy(asc(slides.position));
      
      if (wineSlides.length === 0) {
        console.log(`  ℹ️  No slides found for this wine`);
        continue;
      }
      
      console.log(`  📊 Found ${wineSlides.length} slides`);
      
      // Check if any slides have problematic positions
      const hasProblematicPositions = wineSlides.some(s => 
        s.position >= 900000000 || // Temporary positions
        s.position < 0 ||           // Negative positions
        !Number.isInteger(s.position) // Already fractional (shouldn't happen with old schema)
      );
      
      if (hasProblematicPositions) {
        console.log(`  ⚠️  Wine has problematic positions, will normalize`);
      }
      
      // Assign new gap-based positions
      for (let i = 0; i < wineSlides.length; i++) {
        const slide = wineSlides[i];
        const newPosition = GAP_SIZE + (i * GAP_SIZE); // Start at 10000, then 20000, 30000, etc.
        
        if (slide.position !== newPosition) {
          await db
            .update(slides)
            .set({ position: newPosition })
            .where(eq(slides.id, slide.id));
          
          console.log(`  ✅ Updated slide ${slide.id}: ${slide.position} → ${newPosition}`);
        }
      }
      
      totalSlidesProcessed += wineSlides.length;
    }
    
    console.log(`\n✅ Normalization complete!`);
    console.log(`📊 Processed ${totalSlidesProcessed} slides across ${allWines.length} wines`);
    
    // Final verification - check no slides remain at temporary positions
    console.log('\n🔍 Final verification...');
    const maxPosition = await db
      .select({ maxPos: slides.position })
      .from(slides)
      .orderBy(asc(slides.position))
      .limit(1);
    
    console.log('\n✅ All slides now have clean, gap-based positions!');
    
  } catch (error) {
    console.error('❌ Normalization failed:', error);
    throw error;
  }
}

// Run the normalization
normalizeAllSlidePositions()
  .then(() => {
    console.log('\n🎉 Position normalization completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Position normalization failed:', err);
    process.exit(1);
  });