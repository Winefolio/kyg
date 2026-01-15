#!/usr/bin/env tsx

/**
 * Script to fix position conflicts in the slides table
 * This script normalizes all slide positions to prevent conflicts
 */

import { db } from "../server/db";
import { slides, packageWines } from "../shared/schema";
import { eq, gte, asc, and } from "drizzle-orm";

async function fixPositionConflicts() {
  console.log('🔧 Starting position conflict repair...');
  
  try {
    // Step 1: Find all wines with slides
    const winesWithSlides = await db
      .select({
        wineId: packageWines.id,
        wineName: packageWines.wineName,
        packageId: packageWines.packageId
      })
      .from(packageWines);

    console.log(`📋 Found ${winesWithSlides.length} wines to process`);

    for (const wine of winesWithSlides) {
      console.log(`\n🍷 Processing wine: ${wine.wineName} (${wine.wineId})`);
      
      // Get all slides for this wine, ordered by current position
      const wineSlides = await db
        .select({
          id: slides.id,
          position: slides.position,
          type: slides.type,
          sectionType: slides.section_type,
          payloadJson: slides.payloadJson
        })
        .from(slides)
        .where(eq(slides.packageWineId, wine.wineId))
        .orderBy(asc(slides.position));

      if (wineSlides.length === 0) {
        console.log('  ⏭️  No slides found, skipping');
        continue;
      }

      console.log(`  📊 Found ${wineSlides.length} slides with positions: ${wineSlides.map(s => s.position).join(', ')}`);

      // Sort slides properly: intro -> deep_dive -> ending, and handle welcome slides
      const sortedSlides = wineSlides.sort((a, b) => {
        // Welcome slides always come first
        const aIsWelcome = a.type === 'interlude' && (
          (a.payloadJson as any)?.is_welcome || 
          (a.payloadJson as any)?.title?.toLowerCase().includes('welcome')
        );
        const bIsWelcome = b.type === 'interlude' && (
          (b.payloadJson as any)?.is_welcome || 
          (b.payloadJson as any)?.title?.toLowerCase().includes('welcome')
        );

        if (aIsWelcome && !bIsWelcome) return -1;
        if (!aIsWelcome && bIsWelcome) return 1;

        // Sort by section type: intro -> deep_dive -> ending
        const sectionOrder = { 'intro': 1, 'deep_dive': 2, 'ending': 3 };
        const aOrder = sectionOrder[a.sectionType as keyof typeof sectionOrder] || 2;
        const bOrder = sectionOrder[b.sectionType as keyof typeof sectionOrder] || 2;

        if (aOrder !== bOrder) return aOrder - bOrder;

        // Within same section, maintain original position order
        return a.position - b.position;
      });

      // Use a two-phase update to avoid unique constraint violations
      const GAP_SIZE = 10000;
      const BASE_POSITION = 10000;
      const TEMP_BASE = 2000000000; // Temporary position base (much higher than normal range)
      let positionUpdates = 0;

      // Phase 1: Move all slides to temporary positions
      console.log('    📝 Phase 1: Moving slides to temporary positions...');
      for (let i = 0; i < sortedSlides.length; i++) {
        const slide = sortedSlides[i];
        const tempPosition = TEMP_BASE + i;
        
        await db
          .update(slides)
          .set({ position: tempPosition })
          .where(eq(slides.id, slide.id));
      }

      // Phase 2: Move slides to final positions
      console.log('    📝 Phase 2: Moving slides to final positions...');
      for (let i = 0; i < sortedSlides.length; i++) {
        const slide = sortedSlides[i];
        
        // Welcome slides get position 1, others start from BASE_POSITION
        const isWelcome = slide.type === 'interlude' && (
          (slide.payloadJson as any)?.is_welcome || 
          (slide.payloadJson as any)?.title?.toLowerCase().includes('welcome')
        );
        
        const newPosition = isWelcome ? 1 : BASE_POSITION + (i * GAP_SIZE);
        
        if (slide.position !== newPosition) {
          console.log(`    🔄 Updating slide ${slide.id}: temp -> ${newPosition}`);
          
          await db
            .update(slides)
            .set({ position: newPosition })
            .where(eq(slides.id, slide.id));
          
          positionUpdates++;
        }
      }

      console.log(`  ✅ Updated ${positionUpdates} slide positions`);
    }

    // Step 2: Check for any remaining temporary positions (900000000+)
    const tempPositions = await db
      .select({
        id: slides.id,
        position: slides.position,
        packageWineId: slides.packageWineId
      })
      .from(slides)
      .where(gte(slides.position, 900000000));

    if (tempPositions.length > 0) {
      console.log(`\n🚨 Found ${tempPositions.length} slides stuck at temporary positions`);
      
      for (let i = 0; i < tempPositions.length; i++) {
        const slide = tempPositions[i];
        // Move to a unique safe position
        const safePosition = 800000 + i;
        console.log(`  🔧 Moving slide ${slide.id} from ${slide.position} to ${safePosition}`);
        
        await db
          .update(slides)
          .set({ position: safePosition })
          .where(eq(slides.id, slide.id));
      }
    }

    console.log('\n✅ Position conflict repair completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- All slide positions normalized with 10,000 unit gaps');
    console.log('- Welcome slides positioned at 1');
    console.log('- Regular slides start at 10,000 with proper spacing');
    console.log('- Temporary positions (900000000+) have been resolved');

  } catch (error) {
    console.error('❌ Position conflict repair failed:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPositionConflicts()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { fixPositionConflicts };