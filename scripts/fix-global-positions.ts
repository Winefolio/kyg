#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides, packageWines } from "../shared/schema";
import { eq, and } from "drizzle-orm/expressions";
import { calculateSlidePosition } from "../server/slide-positions";

async function fixGlobalPositions() {
  console.log("🔧 Fixing slides with globalPosition = 0...\n");

  try {
    // Get all slides with globalPosition = 0
    const zeroPositionSlides = await db
      .select()
      .from(slides)
      .where(eq(slides.globalPosition, 0));
    
    console.log(`Found ${zeroPositionSlides.length} slides to fix`);

    // Group by packageWineId
    const slidesByWine = new Map<string, typeof zeroPositionSlides>();
    
    for (const slide of zeroPositionSlides) {
      if (slide.packageWineId) {
        const wineId = slide.packageWineId;
        if (!slidesByWine.has(wineId)) {
          slidesByWine.set(wineId, []);
        }
        slidesByWine.get(wineId)!.push(slide);
      }
    }

    // Fix each wine's slides
    for (const [wineId, wineSlides] of slidesByWine) {
      console.log(`\nProcessing wine ${wineId}...`);
      
      // Get the wine details
      const wine = await db
        .select()
        .from(packageWines)
        .where(eq(packageWines.id, wineId))
        .limit(1);
      
      if (!wine[0]) {
        console.log(`⚠️  Wine not found for ID ${wineId}`);
        continue;
      }

      console.log(`  Wine: ${wine[0].wineName} (position: ${wine[0].position})`);

      // Calculate correct global positions
      for (const slide of wineSlides) {
        // For calculating global position, we need the slide's index within its section
        // The slide.position is 1-based, so we subtract 1 for 0-based index
        const slideIndexInSection = slide.position - 1;
        const correctGlobalPosition = calculateSlidePosition(
          wine[0].position,
          (slide.section_type || 'intro') as 'intro' | 'deep_dive' | 'ending',
          slideIndexInSection
        );

        console.log(`  Updating slide ${slide.id}:`);
        console.log(`    Section: ${slide.section_type}, Position: ${slide.position}`);
        console.log(`    Old globalPosition: ${slide.globalPosition} → New: ${correctGlobalPosition}`);

        // Update the slide
        await db
          .update(slides)
          .set({ globalPosition: correctGlobalPosition })
          .where(eq(slides.id, slide.id));
      }
    }

    console.log("\n✅ All slides updated successfully!");

    // Verify the fix
    const remainingZeroSlides = await db
      .select()
      .from(slides)
      .where(eq(slides.globalPosition, 0));
    
    if (remainingZeroSlides.length > 0) {
      console.log(`\n⚠️  Still ${remainingZeroSlides.length} slides with globalPosition = 0`);
    } else {
      console.log("\n✅ No more slides with globalPosition = 0!");
    }

  } catch (error) {
    console.error("❌ Error fixing positions:", error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixGlobalPositions();