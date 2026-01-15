#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides, packages, packageWines, sessions, participants } from "../shared/schema";
import { eq, and, isNull, inArray } from "drizzle-orm/expressions";

async function analyzeDataIssues() {
  console.log("🔍 Analyzing potential data consistency issues...\n");

  try {
    // 1. Check for slides with globalPosition = 0
    console.log("1️⃣ Checking for slides with globalPosition = 0:");
    const zeroPositionSlides = await db
      .select()
      .from(slides)
      .where(eq(slides.globalPosition, 0));
    
    if (zeroPositionSlides.length > 0) {
      console.log(`   ⚠️  Found ${zeroPositionSlides.length} slides with globalPosition = 0`);
      const byPackage = new Map<string, any[]>();
      
      for (const slide of zeroPositionSlides) {
        if (slide.packageWineId) {
          const wine = await db
            .select()
            .from(packageWines)
            .where(eq(packageWines.id, slide.packageWineId))
            .limit(1);
          
          if (wine[0]) {
            const pkg = await db
              .select()
              .from(packages)
              .where(eq(packages.id, wine[0].packageId))
              .limit(1);
            
            if (pkg[0]) {
              const key = `${pkg[0].name} (${pkg[0].code})`;
              if (!byPackage.has(key)) byPackage.set(key, []);
              byPackage.get(key)!.push({
                slide,
                wine: wine[0],
                payload: slide.payloadJson
              });
            }
          }
        }
      }
      
      byPackage.forEach((slideInfo, pkgName) => {
        console.log(`   📦 ${pkgName}: ${slideInfo.length} slides`);
        slideInfo.forEach(({ slide, wine, payload }) => {
          console.log(`      - Wine: ${wine.wineName}, Type: ${slide.type}, Section: ${slide.section_type}`);
          console.log(`        Title: ${payload?.title || payload?.question || 'Untitled'}`);
        });
      });
    } else {
      console.log("   ✅ All slides have proper globalPosition values");
    }

    // 2. Check for slides with both DB section_type and payloadJson.section_type
    console.log("\n2️⃣ Checking for dual section_type sources:");
    const allSlides = await db.select().from(slides);
    let dualSourceCount = 0;
    let mismatchCount = 0;
    
    allSlides.forEach(slide => {
      const payload = slide.payloadJson as any;
      if (slide.section_type && payload?.section_type) {
        dualSourceCount++;
        if (slide.section_type !== payload.section_type) {
          mismatchCount++;
          console.log(`   ⚠️  Mismatch: DB=${slide.section_type}, Payload=${payload.section_type}, ID=${slide.id}`);
        }
      }
    });
    
    console.log(`   📊 ${dualSourceCount} slides have both DB and payload section_type`);
    console.log(`   ${mismatchCount} have mismatched values`);

    // 3. Check for null section_type
    console.log("\n3️⃣ Checking for NULL section_type:");
    const nullSectionSlides = await db
      .select()
      .from(slides)
      .where(isNull(slides.section_type));
    
    console.log(`   📊 ${nullSectionSlides.length} slides have NULL section_type`);
    if (nullSectionSlides.length > 0) {
      console.log("   First 5:");
      nullSectionSlides.slice(0, 5).forEach(slide => {
        const payload = slide.payloadJson as any;
        console.log(`      - Type: ${slide.type}, Payload section: ${payload?.section_type || 'none'}`);
        console.log(`        Title: ${payload?.title || payload?.question || 'Untitled'}`);
      });
    }

    // 4. Check sorting stability
    console.log("\n4️⃣ Checking for duplicate positions within wines:");
    const wineList = await db.select().from(packageWines);
    
    for (const wine of wineList) {
      const wineSlides = await db
        .select()
        .from(slides)
        .where(eq(slides.packageWineId, wine.id))
        .orderBy(slides.position);
      
      const positionCounts = new Map<number, number>();
      wineSlides.forEach(slide => {
        const count = positionCounts.get(slide.position) || 0;
        positionCounts.set(slide.position, count + 1);
      });
      
      const duplicates = Array.from(positionCounts.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log(`   ⚠️  Wine "${wine.wineName}" has duplicate positions:`);
        duplicates.forEach(([pos, count]) => {
          console.log(`      Position ${pos}: ${count} slides`);
        });
      }
    }

    // 5. Check host-only filtering
    console.log("\n5️⃣ Checking host-only slides:");
    let hostOnlyCount = 0;
    allSlides.forEach(slide => {
      const payload = slide.payloadJson as any;
      if (payload?.for_host) {
        hostOnlyCount++;
      }
    });
    console.log(`   📊 ${hostOnlyCount} slides are marked as host-only`);

    // 6. Test a specific package flow
    console.log("\n6️⃣ Testing slide flow for package 'Cerbone v2' (LM1GAA):");
    const testPkg = await db
      .select()
      .from(packages)
      .where(eq(packages.code, 'LM1GAA'))
      .limit(1);
    
    if (testPkg[0]) {
      console.log("   Package found, simulating slide retrieval...");
      
      // Get wines
      const wines = await db
        .select()
        .from(packageWines)
        .where(eq(packageWines.packageId, testPkg[0].id))
        .orderBy(packageWines.position);
      
      console.log(`   🍷 ${wines.length} wines found`);
      
      // Get all slides
      let allTestSlides: any[] = [];
      
      // Package-level slides
      const pkgSlides = await db
        .select()
        .from(slides)
        .where(eq(slides.packageId, testPkg[0].id))
        .orderBy(slides.globalPosition);
      
      allTestSlides = allTestSlides.concat(pkgSlides);
      console.log(`   📦 ${pkgSlides.length} package-level slides`);
      
      // Wine slides
      for (const wine of wines) {
        const wineSlides = await db
          .select()
          .from(slides)
          .where(eq(slides.packageWineId, wine.id))
          .orderBy(slides.globalPosition);
        
        allTestSlides = allTestSlides.concat(wineSlides);
        console.log(`   🍷 ${wine.wineName}: ${wineSlides.length} slides`);
      }
      
      // Sort by globalPosition
      allTestSlides.sort((a, b) => {
        const posA = a.globalPosition || 0;
        const posB = b.globalPosition || 0;
        if (posA !== posB) return posA - posB;
        return a.id.localeCompare(b.id);
      });
      
      console.log(`   📊 Total slides after sorting: ${allTestSlides.length}`);
      
      // Check section distribution
      const sections = allTestSlides.reduce((acc, slide) => {
        const section = slide.section_type || 'unknown';
        acc[section] = (acc[section] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log("   Section distribution:");
      Object.entries(sections).forEach(([section, count]) => {
        console.log(`      ${section}: ${count}`);
      });
    }

    // 7. Race condition check
    console.log("\n7️⃣ Checking for potential race conditions:");
    const recentSessions = await db
      .select()
      .from(sessions)
      .orderBy(sessions.startedAt)
      .limit(10);
    
    for (const session of recentSessions) {
      const participants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, session.id))
        .orderBy(participants.createdAt);
      
      // Check for participants created within 1 second
      for (let i = 1; i < participants.length; i++) {
        const timeDiff = participants[i].createdAt!.getTime() - participants[i-1].createdAt!.getTime();
        if (timeDiff < 1000) {
          console.log(`   ⚠️  Session ${session.short_code}: Participants created within ${timeDiff}ms`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error analyzing data:", error);
  } finally {
    process.exit(0);
  }
}

analyzeDataIssues();