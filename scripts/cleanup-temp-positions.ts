#!/usr/bin/env tsx

/**
 * Simple cleanup script for temporary positions
 */

import { db } from "../server/db";
import { slides } from "../shared/schema";
import { eq, gte, or } from "drizzle-orm";

async function cleanupTempPositions() {
  console.log('🧹 Cleaning up temporary positions...');
  
  try {
    // Find all slides with problematic positions
    const problemSlides = await db
      .select({
        id: slides.id,
        position: slides.position,
        packageWineId: slides.packageWineId
      })
      .from(slides)
      .where(or(
        gte(slides.position, 1000000000), // Very high positions
        eq(slides.position, 1000004400)   // Specific problematic position
      ));

    console.log(`🔍 Found ${problemSlides.length} slides with temporary positions`);

    if (problemSlides.length === 0) {
      console.log('✅ No temporary positions found!');
      return;
    }

    // Group by wine for processing
    const slidesByWine = new Map<string, typeof problemSlides>();
    problemSlides.forEach(slide => {
      const wineId = slide.packageWineId!;
      if (!slidesByWine.has(wineId)) {
        slidesByWine.set(wineId, []);
      }
      slidesByWine.get(wineId)!.push(slide);
    });

    // For each wine, assign safe positions
    for (const [wineId, wineSlides] of slidesByWine) {
      console.log(`\n🍷 Processing wine ${wineId}: ${wineSlides.length} problematic slides`);
      
      // Find the highest existing normal position for this wine
      const normalSlides = await db
        .select({ position: slides.position })
        .from(slides)
        .where(eq(slides.packageWineId, wineId));
      
      const normalPositions = normalSlides
        .map(s => s.position)
        .filter(p => p < 1000000000);
      
      const maxNormalPosition = Math.max(...normalPositions, 0);
      const startPosition = Math.max(maxNormalPosition + 10000, 100000);
      
      console.log(`  📊 Max normal position: ${maxNormalPosition}, starting from: ${startPosition}`);

      // Assign new positions
      for (let i = 0; i < wineSlides.length; i++) {
        const slide = wineSlides[i];
        const newPosition = startPosition + (i * 10000);
        
        console.log(`  🔄 Moving slide ${slide.id}: ${slide.position} -> ${newPosition}`);
        
        await db
          .update(slides)
          .set({ position: newPosition })
          .where(eq(slides.id, slide.id));
      }
    }

    console.log('\n✅ Temporary position cleanup completed!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run the cleanup
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupTempPositions()
    .then(() => {
      console.log('\n🎉 Cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupTempPositions };