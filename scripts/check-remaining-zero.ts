#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides, packages, packageWines } from "../shared/schema";
import { eq, isNull } from "drizzle-orm/expressions";

async function checkRemainingZero() {
  console.log("🔍 Checking remaining slides with globalPosition = 0...\n");

  try {
    const zeroSlides = await db
      .select()
      .from(slides)
      .where(eq(slides.globalPosition, 0));
    
    console.log(`Found ${zeroSlides.length} slides with globalPosition = 0`);

    for (const slide of zeroSlides) {
      const payload = slide.payloadJson as any;
      console.log("\n📄 Slide Details:");
      console.log(`  ID: ${slide.id}`);
      console.log(`  Type: ${slide.type}`);
      console.log(`  Section: ${slide.section_type}`);
      console.log(`  Position: ${slide.position}`);
      console.log(`  Title: ${payload?.title || payload?.question || 'Untitled'}`);
      console.log(`  PackageWineId: ${slide.packageWineId}`);
      console.log(`  PackageId: ${slide.packageId}`);
      
      if (slide.packageId && !slide.packageWineId) {
        console.log("  ℹ️  This is a package-level slide");
        const pkg = await db
          .select()
          .from(packages)
          .where(eq(packages.id, slide.packageId))
          .limit(1);
        if (pkg[0]) {
          console.log(`  📦 Package: ${pkg[0].name} (${pkg[0].code})`);
        }
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkRemainingZero();