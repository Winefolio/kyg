#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides, packages, packageWines, sessions, participants } from "../shared/schema";
import { eq } from "drizzle-orm/expressions";

const BASE_URL = "http://localhost:5000";

async function testCompleteFlow() {
  console.log("🧪 Testing complete data flow...\n");

  try {
    // Test 1: API Cache Headers
    console.log("1️⃣ Testing API Cache Headers:");
    const response = await fetch(`${BASE_URL}/api/packages/LM1GAA/slides?participantId=test`);
    const cacheControl = response.headers.get('cache-control');
    const pragma = response.headers.get('pragma');
    
    console.log(`  Cache-Control: ${cacheControl}`);
    console.log(`  Pragma: ${pragma}`);
    console.log(`  ✅ Cache headers present: ${cacheControl?.includes('no-cache') ? 'YES' : 'NO'}`);

    // Test 2: Package Data Retrieval
    console.log("\n2️⃣ Testing Package 'Cerbone v2' (LM1GAA) Data Retrieval:");
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  📦 Package: ${data.package.name}`);
      console.log(`  🍷 Wines: ${data.wines.length}`);
      console.log(`  📄 Total slides: ${data.slides.length}`);
      
      // Count sections
      const sections = data.slides.reduce((acc: any, slide: any) => {
        const section = slide.section_type || 'unknown';
        acc[section] = (acc[section] || 0) + 1;
        return acc;
      }, {});
      
      console.log("  📊 Section distribution:");
      Object.entries(sections).forEach(([section, count]) => {
        console.log(`     ${section}: ${count}`);
      });
      
      // Check for deep_dive and ending
      console.log(`  ✅ Has deep_dive slides: ${sections.deep_dive > 0 ? 'YES' : 'NO'}`);
      console.log(`  ✅ Has ending slides: ${sections.ending > 0 ? 'YES' : 'NO'}`);
      
      // Check sorting
      console.log("\n  🔍 Checking slide order:");
      let lastGlobalPos = -1;
      let sortingIssues = 0;
      
      data.slides.forEach((slide: any, index: number) => {
        if (slide.globalPosition <= lastGlobalPos) {
          console.log(`     ⚠️  Sorting issue at index ${index}: ${slide.globalPosition} <= ${lastGlobalPos}`);
          sortingIssues++;
        }
        lastGlobalPos = slide.globalPosition;
      });
      
      console.log(`  ✅ Sorting correct: ${sortingIssues === 0 ? 'YES' : 'NO (' + sortingIssues + ' issues)'}`);
    }

    // Test 3: Database Integrity
    console.log("\n3️⃣ Testing Database Integrity:");
    
    // Check for zero globalPositions
    const zeroPositions = await db
      .select()
      .from(slides)
      .where(eq(slides.globalPosition, 0));
    
    console.log(`  📊 Slides with globalPosition = 0: ${zeroPositions.length}`);
    console.log(`  ✅ All non-package slides have proper positions: ${zeroPositions.every(s => s.packageId && !s.packageWineId) ? 'YES' : 'NO'}`);
    
    // Check section_type integrity
    const nullSections = await db
      .select({ count: db.count() })
      .from(slides)
      .where(eq(slides.section_type, null));
    
    console.log(`  📊 Slides with NULL section_type: ${nullSections[0]?.count || 0}`);

    // Test 4: Wine Selection Logic
    console.log("\n4️⃣ Testing Wine Selection Logic:");
    
    // Get a test session
    const testSessions = await db
      .select()
      .from(sessions)
      .limit(1);
    
    if (testSessions[0]) {
      console.log(`  Testing session: ${testSessions[0].short_code}`);
      
      // Simulate the wine selection logic from routes.ts
      const pkg = await db
        .select()
        .from(packages)
        .where(eq(packages.id, testSessions[0].packageId!))
        .limit(1);
      
      if (pkg[0]) {
        let wines = await db
          .select()
          .from(packageWines)
          .where(eq(packageWines.packageId, pkg[0].id))
          .orderBy(packageWines.position);
        
        console.log(`  🍷 Default wines: ${wines.length}`);
        
        // Check for session wine selections
        const sessionWineSelections = await db
          .select()
          .from(sessionWineSelections)
          .where(eq(sessionWineSelections.sessionId, testSessions[0].id));
        
        if (sessionWineSelections.length > 0) {
          console.log(`  🎯 Session has custom wine selections: ${sessionWineSelections.length}`);
          const included = sessionWineSelections.filter(s => s.isIncluded);
          console.log(`  ✅ Included wines: ${included.length}`);
        } else {
          console.log(`  ℹ️  No custom wine selections for this session`);
        }
      }
    }

    // Test 5: Client-Side Filtering
    console.log("\n5️⃣ Simulating Client-Side Section Filtering:");
    
    // This simulates what happens in TastingSession.tsx
    const testPackage = await db
      .select()
      .from(packages)
      .where(eq(packages.code, 'LM1GAA'))
      .limit(1);
    
    if (testPackage[0]) {
      const wines = await db
        .select()
        .from(packageWines)
        .where(eq(packageWines.packageId, testPackage[0].id))
        .orderBy(packageWines.position);
      
      for (const wine of wines.slice(0, 1)) { // Just test first wine
        const wineSlides = await db
          .select()
          .from(slides)
          .where(eq(slides.packageWineId, wine.id))
          .orderBy(slides.position);
        
        console.log(`\n  🍷 ${wine.wineName}:`);
        
        // Simulate client filtering
        const introSlides = wineSlides.filter(slide => {
          const sectionType = slide.section_type || (slide.payloadJson as any)?.section_type;
          return sectionType === 'intro';
        });
        
        const deepDiveSlides = wineSlides.filter(slide => {
          const sectionType = slide.section_type || (slide.payloadJson as any)?.section_type;
          return sectionType === 'deep_dive' || sectionType === 'tasting';
        });
        
        const endingSlides = wineSlides.filter(slide => {
          const sectionType = slide.section_type || (slide.payloadJson as any)?.section_type;
          return sectionType === 'ending' || sectionType === 'conclusion';
        });
        
        console.log(`     Intro: ${introSlides.length} slides`);
        console.log(`     Deep Dive: ${deepDiveSlides.length} slides`);
        console.log(`     Ending: ${endingSlides.length} slides`);
        console.log(`     ✅ All sections present: ${introSlides.length > 0 && deepDiveSlides.length > 0 && endingSlides.length > 0 ? 'YES' : 'NO'}`);
      }
    }

    console.log("\n✅ All tests completed!");

  } catch (error) {
    console.error("❌ Test error:", error);
  } finally {
    process.exit(0);
  }
}

testCompleteFlow();