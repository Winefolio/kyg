#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides, packages, packageWines } from "../shared/schema";
import { eq, or, like, sql, and } from "drizzle-orm/expressions";

async function findCerboneSlides() {
  console.log("🔍 Searching for slides related to 'Cerbone'...\n");

  try {
    // 1. First find any wines with "Cerbone" in the name
    console.log("1️⃣ Searching for wines with 'Cerbone' in the name:");
    const cerboneWines = await db
      .select()
      .from(packageWines)
      .where(like(packageWines.wineName, '%Cerbone%'));
    
    if (cerboneWines.length > 0) {
      console.log(`Found ${cerboneWines.length} wines:`);
      for (const wine of cerboneWines) {
        console.log(`  - ${wine.wineName} (ID: ${wine.id})`);
        
        // Get the package info
        const pkg = await db
          .select()
          .from(packages)
          .where(eq(packages.id, wine.packageId))
          .limit(1);
        
        if (pkg[0]) {
          console.log(`    Package: ${pkg[0].name} (Code: ${pkg[0].code})`);
        }
      }
    } else {
      console.log("  No wines found with 'Cerbone' in the name");
    }

    // 2. Search for slides with Cerbone in the payload
    console.log("\n2️⃣ Searching for slides with 'Cerbone' in content:");
    
    // Using raw SQL to search JSON content
    const cerboneSlides = await db
      .select({
        id: slides.id,
        type: slides.type,
        section_type: slides.section_type,
        packageWineId: slides.packageWineId,
        packageId: slides.packageId,
        position: slides.position,
        globalPosition: slides.globalPosition,
        payloadJson: slides.payloadJson
      })
      .from(slides)
      .where(sql`${slides.payloadJson}::text ILIKE '%Cerbone%'`);
    
    if (cerboneSlides.length > 0) {
      console.log(`Found ${cerboneSlides.length} slides with 'Cerbone' in content:`);
      
      for (const slide of cerboneSlides) {
        console.log(`\n  Slide ID: ${slide.id}`);
        console.log(`  Type: ${slide.type}, Section: ${slide.section_type || 'N/A'}`);
        console.log(`  Position: ${slide.position}, Global Position: ${slide.globalPosition}`);
        
        // Get wine info if available
        if (slide.packageWineId) {
          const wine = await db
            .select()
            .from(packageWines)
            .where(eq(packageWines.id, slide.packageWineId))
            .limit(1);
          
          if (wine[0]) {
            console.log(`  Wine: ${wine[0].wineName}`);
          }
        }
        
        // Extract relevant content from payload
        const payload = slide.payloadJson as any;
        if (payload?.title) {
          console.log(`  Title: ${payload.title}`);
        }
        if (payload?.question) {
          console.log(`  Question: ${payload.question}`);
        }
        if (payload?.description) {
          console.log(`  Description: ${payload.description.substring(0, 100)}...`);
        }
        if (payload?.media_url) {
          console.log(`  Media URL: ${payload.media_url}`);
        }
      }
    } else {
      console.log("  No slides found with 'Cerbone' in content");
    }

    // 3. Look for intro slides with video_message type
    console.log("\n3️⃣ Searching for video_message slides in intro sections:");
    const videoIntroSlides = await db
      .select()
      .from(slides)
      .where(
        and(
          eq(slides.type, 'video_message'),
          eq(slides.section_type, 'intro')
        )
      );
    
    if (videoIntroSlides.length > 0) {
      console.log(`Found ${videoIntroSlides.length} video intro slides:`);
      
      for (const slide of videoIntroSlides) {
        const payload = slide.payloadJson as any;
        console.log(`\n  Slide ID: ${slide.id}`);
        console.log(`  Title: ${payload?.title || 'Untitled'}`);
        
        // Check if it might be Cerbone-related
        const content = JSON.stringify(payload).toLowerCase();
        if (content.includes('cerbone')) {
          console.log(`  ⭐ Contains 'Cerbone' reference!`);
        }
        
        if (slide.packageWineId) {
          const wine = await db
            .select()
            .from(packageWines)
            .where(eq(packageWines.id, slide.packageWineId))
            .limit(1);
          
          if (wine[0]) {
            console.log(`  Wine: ${wine[0].wineName}`);
          }
        }
      }
    } else {
      console.log("  No video_message slides found in intro sections");
    }

    // 4. Check the specific package mentioned in tests
    console.log("\n4️⃣ Checking package 'LM1GAA' (mentioned in tests as Cerbone v2):");
    const testPackage = await db
      .select()
      .from(packages)
      .where(eq(packages.code, 'LM1GAA'))
      .limit(1);
    
    if (testPackage[0]) {
      console.log(`  Package found: ${testPackage[0].name}`);
      
      // Get all wines in this package
      const packageWinesList = await db
        .select()
        .from(packageWines)
        .where(eq(packageWines.packageId, testPackage[0].id));
      
      console.log(`  Contains ${packageWinesList.length} wines:`);
      for (const wine of packageWinesList) {
        console.log(`    - ${wine.wineName}`);
      }
    } else {
      console.log("  Package 'LM1GAA' not found");
    }

  } catch (error) {
    console.error("Error searching for Cerbone slides:", error);
  } finally {
    process.exit(0);
  }
}

findCerboneSlides();