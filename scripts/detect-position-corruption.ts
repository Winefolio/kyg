import { db } from "../server/db";
import { slides, packageWines } from "../shared/schema";
import { eq, sql, desc, and, isNotNull } from "drizzle-orm";

async function detectPositionCorruption() {
  console.log("🔍 Detecting slide position corruption...\n");

  try {
    // 1. Find wines with abnormally high position values
    const corruptedWines = await db
      .select({
        packageWineId: slides.packageWineId,
        wineName: packageWines.wineName,
        slideCount: sql<number>`COUNT(*)::int`,
        minPosition: sql<number>`MIN(${slides.position})::int`,
        maxPosition: sql<number>`MAX(${slides.position})::int`,
        avgPosition: sql<number>`AVG(${slides.position})::int`,
        positionRange: sql<number>`(MAX(${slides.position}) - MIN(${slides.position}))::int`
      })
      .from(slides)
      .leftJoin(packageWines, eq(slides.packageWineId, packageWines.id))
      .where(isNotNull(slides.packageWineId))
      .groupBy(slides.packageWineId, packageWines.wineName)
      .having(sql`MAX(${slides.position}) > 1000`)
      .orderBy(desc(sql`MAX(${slides.position})`));

    if (corruptedWines.length === 0) {
      console.log("✅ No position corruption detected!");
      return;
    }

    console.log(`⚠️  Found ${corruptedWines.length} wines with position corruption:\n`);

    // 2. Display summary for each corrupted wine
    for (const wine of corruptedWines) {
      console.log(`Wine: ${wine.wineName || 'Unknown'} (ID: ${wine.packageWineId})`);
      console.log(`  - Slides: ${wine.slideCount}`);
      console.log(`  - Position range: ${wine.minPosition} to ${wine.maxPosition}`);
      console.log(`  - Average position: ${wine.avgPosition}`);
      console.log(`  - Gap size: ${wine.positionRange}`);
      
      // Get detailed slide positions for this wine
      const wineSlides = await db
        .select({
          id: slides.id,
          position: slides.position,
          type: slides.type,
          sectionType: slides.section_type,
          createdAt: slides.createdAt
        })
        .from(slides)
        .where(eq(slides.packageWineId, wine.packageWineId!))
        .orderBy(slides.position);

      // Detect patterns
      const timestamps = wineSlides.filter(s => s.position > 100000);
      const tempPositions = wineSlides.filter(s => s.position >= 100000 && s.position < 200000);
      const gaps = [];
      
      for (let i = 1; i < wineSlides.length; i++) {
        const gap = wineSlides[i].position - wineSlides[i-1].position;
        if (gap > 100) {
          gaps.push({
            from: wineSlides[i-1].position,
            to: wineSlides[i].position,
            gap: gap
          });
        }
      }

      if (timestamps.length > 0) {
        console.log(`  - ⚠️  ${timestamps.length} slides with timestamp-based positions (likely from fallback)`);
      }
      if (tempPositions.length > 0) {
        console.log(`  - ⚠️  ${tempPositions.length} slides with temporary positions (likely from failed batch update)`);
      }
      if (gaps.length > 0) {
        console.log(`  - ⚠️  ${gaps.length} large gaps detected:`);
        gaps.slice(0, 3).forEach(g => {
          console.log(`      ${g.from} → ${g.to} (gap: ${g.gap})`);
        });
        if (gaps.length > 3) console.log(`      ... and ${gaps.length - 3} more`);
      }

      // Show position distribution
      console.log(`  - Position distribution:`);
      const positions = wineSlides.map(s => s.position);
      console.log(`      Positions: [${positions.slice(0, 10).join(', ')}${positions.length > 10 ? ', ...' : ''}]`);
      console.log('');
    }

    // 3. Global statistics
    const globalStats = await db
      .select({
        totalSlides: sql<number>`COUNT(*)::int`,
        slidesWithHighPositions: sql<number>`COUNT(*) FILTER (WHERE position > 1000)::int`,
        slidesWithTempPositions: sql<number>`COUNT(*) FILTER (WHERE position >= 100000)::int`,
        maxPosition: sql<number>`MAX(position)::int`
      })
      .from(slides)
      .where(isNotNull(slides.packageWineId));

    const stats = globalStats[0];
    console.log("📊 Global Statistics:");
    console.log(`  - Total slides: ${stats.totalSlides}`);
    console.log(`  - Slides with position > 1000: ${stats.slidesWithHighPositions} (${((stats.slidesWithHighPositions / stats.totalSlides) * 100).toFixed(1)}%)`);
    console.log(`  - Slides with temp positions (≥100000): ${stats.slidesWithTempPositions}`);
    console.log(`  - Maximum position value: ${stats.maxPosition}`);

    // 4. Detect duplicate positions
    const duplicates = await db
      .select({
        packageWineId: slides.packageWineId,
        position: slides.position,
        count: sql<number>`COUNT(*)::int`
      })
      .from(slides)
      .where(isNotNull(slides.packageWineId))
      .groupBy(slides.packageWineId, slides.position)
      .having(sql`COUNT(*) > 1`);

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate position conflicts!`);
      duplicates.slice(0, 5).forEach(d => {
        console.log(`  - Wine ${d.packageWineId}: Position ${d.position} used ${d.count} times`);
      });
      if (duplicates.length > 5) console.log(`  ... and ${duplicates.length - 5} more conflicts`);
    }

  } catch (error) {
    console.error("❌ Error detecting corruption:", error);
  } finally {
    process.exit(0);
  }
}

// Run the detection
detectPositionCorruption();