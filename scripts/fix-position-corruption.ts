import { db } from "../server/db";
import { slides, packageWines } from "../shared/schema";
import { eq, isNotNull, asc, sql } from "drizzle-orm";

async function normalizeSlidePositions(packageWineId: string, wineName: string) {
  console.log(`🔧 Normalizing positions for wine: ${wineName}`);
  
  try {
    await db.transaction(async (tx) => {
      // Get all slides for this wine ordered by current position
      const wineSlides = await tx
        .select({
          id: slides.id,
          position: slides.position,
          type: slides.type,
          sectionType: slides.section_type,
          createdAt: slides.createdAt
        })
        .from(slides)
        .where(eq(slides.packageWineId, packageWineId))
        .orderBy(asc(slides.position));

      console.log(`  - Found ${wineSlides.length} slides to renumber`);
      console.log(`  - Current positions: [${wineSlides.map(s => s.position).join(', ')}]`);

      // Renumber slides sequentially starting from 1
      for (let i = 0; i < wineSlides.length; i++) {
        const newPosition = i + 1;
        const slide = wineSlides[i];
        
        await tx
          .update(slides)
          .set({ position: newPosition })
          .where(eq(slides.id, slide.id));
      }

      // Verify the update
      const updatedSlides = await tx
        .select({ position: slides.position })
        .from(slides)
        .where(eq(slides.packageWineId, packageWineId))
        .orderBy(asc(slides.position));

      console.log(`  - New positions: [${updatedSlides.map(s => s.position).join(', ')}]`);
      console.log(`  ✅ Successfully normalized ${wineSlides.length} slides\n`);
    });
  } catch (error) {
    console.error(`  ❌ Error normalizing wine ${wineName}:`, error);
    throw error;
  }
}

async function fixPositionCorruption() {
  console.log("🔧 Starting slide position corruption fix...\n");

  try {
    // Get all wines that have slides
    const winesWithSlides = await db
      .select({
        packageWineId: slides.packageWineId,
        wineName: packageWines.wineName,
        slideCount: sql<number>`COUNT(*)::int`
      })
      .from(slides)
      .leftJoin(packageWines, eq(slides.packageWineId, packageWines.id))
      .where(isNotNull(slides.packageWineId))
      .groupBy(slides.packageWineId, packageWines.wineName)
      .orderBy(packageWines.wineName);

    console.log(`Found ${winesWithSlides.length} wines with slides to process\n`);

    // Process each wine
    for (const wine of winesWithSlides) {
      await normalizeSlidePositions(
        wine.packageWineId!, 
        wine.wineName || `Unknown Wine (${wine.packageWineId})`
      );
    }

    // Verify the fix
    console.log("🔍 Verification - checking for remaining corruption...\n");
    
    const remainingCorruption = await db
      .select({
        packageWineId: slides.packageWineId,
        wineName: packageWines.wineName,
        maxPosition: sql<number>`MAX(${slides.position})::int`
      })
      .from(slides)
      .leftJoin(packageWines, eq(slides.packageWineId, packageWines.id))
      .where(isNotNull(slides.packageWineId))
      .groupBy(slides.packageWineId, packageWines.wineName)
      .having(sql`MAX(${slides.position}) > 1000`)
      .orderBy(sql`MAX(${slides.position}) DESC`);

    if (remainingCorruption.length === 0) {
      console.log("✅ All position corruption has been fixed!");
    } else {
      console.log(`⚠️  Still found ${remainingCorruption.length} wines with high positions:`);
      remainingCorruption.forEach(wine => {
        console.log(`  - ${wine.wineName}: max position ${wine.maxPosition}`);
      });
    }

    // Show final statistics
    const finalStats = await db
      .select({
        totalSlides: sql<number>`COUNT(*)::int`,
        maxPosition: sql<number>`MAX(${slides.position})::int`,
        minPosition: sql<number>`MIN(${slides.position})::int`
      })
      .from(slides)
      .where(isNotNull(slides.packageWineId));

    const stats = finalStats[0];
    console.log("\n📊 Final Statistics:");
    console.log(`  - Total slides processed: ${stats.totalSlides}`);
    console.log(`  - Position range: ${stats.minPosition} to ${stats.maxPosition}`);
    console.log(`  - Maximum position should be ≤ number of slides in largest wine`);

  } catch (error) {
    console.error("❌ Error during position corruption fix:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixPositionCorruption();