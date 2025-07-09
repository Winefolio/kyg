#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides } from "../shared/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm/expressions";

async function fixPackageSlides() {
  console.log("🔧 Fixing package-level slides...\n");

  try {
    // Get all package-level slides (packageId is set, packageWineId is null)
    const packageSlides = await db
      .select()
      .from(slides)
      .where(and(
        isNotNull(slides.packageId),
        isNull(slides.packageWineId)
      ));
    
    console.log(`Found ${packageSlides.length} package-level slides`);

    for (const slide of packageSlides) {
      const payload = slide.payloadJson as any;
      console.log(`\nProcessing: ${payload?.title || 'Untitled'}`);
      console.log(`  Current position: ${slide.position}`);
      console.log(`  Current globalPosition: ${slide.globalPosition}`);
      
      // Package intros should be at position 0
      if (payload?.is_package_intro || slide.type === 'interlude') {
        console.log(`  → Setting to position: 0, globalPosition: 0`);
        
        await db
          .update(slides)
          .set({ 
            position: 0,
            globalPosition: 0 
          })
          .where(eq(slides.id, slide.id));
      }
    }

    console.log("\n✅ Package slides fixed!");

    // Verify
    const stillZero = await db
      .select()
      .from(slides)
      .where(eq(slides.globalPosition, 0));
    
    console.log(`\n📊 Slides with globalPosition = 0: ${stillZero.length}`);
    stillZero.forEach(slide => {
      const payload = slide.payloadJson as any;
      console.log(`  - ${payload?.title || 'Untitled'} (${slide.packageId ? 'package' : 'wine'} level)`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

fixPackageSlides();