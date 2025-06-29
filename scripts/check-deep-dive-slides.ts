#!/usr/bin/env tsx

import { db } from "../server/db";
import { slides, packages, packageWines } from "../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm/expressions";

async function checkDeepDiveSlides() {
  console.log("🔍 Checking deep dive slides in database...\n");

  try {
    // Get all packages
    const allPackages = await db.select().from(packages);
    console.log(`📦 Total packages: ${allPackages.length}`);
    
    for (const pkg of allPackages) {
      console.log(`\n📦 Package: ${pkg.name} (${pkg.code})`);
      
      // Get all wines for this package
      const wines = await db
        .select()
        .from(packageWines)
        .where(eq(packageWines.packageId, pkg.id))
        .orderBy(packageWines.position);
      
      console.log(`  🍷 Wines: ${wines.length}`);
      
      for (const wine of wines) {
        console.log(`\n  🍷 Wine: ${wine.wineName}`);
        
        // Get all slides for this wine
        const wineSlides = await db
          .select()
          .from(slides)
          .where(eq(slides.packageWineId, wine.id))
          .orderBy(slides.globalPosition);
        
        // Group slides by section_type
        const slidesBySection = wineSlides.reduce((acc, slide) => {
          const section = slide.section_type || 'unknown';
          if (!acc[section]) acc[section] = [];
          acc[section].push(slide);
          return acc;
        }, {} as Record<string, typeof wineSlides>);
        
        console.log(`    📊 Total slides: ${wineSlides.length}`);
        Object.entries(slidesBySection).forEach(([section, sectionSlides]) => {
          console.log(`    📂 ${section}: ${sectionSlides.length} slides`);
          sectionSlides.forEach((slide, index) => {
            const payload = slide.payloadJson as any;
            console.log(`       ${index + 1}. [${slide.type}] ${payload?.title || payload?.question || 'Untitled'}`);
            console.log(`          - Position: ${slide.position}, Global: ${slide.globalPosition}`);
            if (section === 'unknown' || section === null) {
              console.log(`          ⚠️  Missing section_type!`);
            }
          });
        });
        
        // Check for deep_dive slides specifically
        const deepDiveSlides = wineSlides.filter(s => s.section_type === 'deep_dive');
        if (deepDiveSlides.length === 0) {
          console.log(`    ⚠️  WARNING: No deep_dive slides found for this wine!`);
        }
      }
      
      // Check package-level slides
      const packageSlides = await db
        .select()
        .from(slides)
        .where(eq(slides.packageId, pkg.id))
        .orderBy(slides.position);
      
      if (packageSlides.length > 0) {
        console.log(`\n  📦 Package-level slides: ${packageSlides.length}`);
        packageSlides.forEach((slide, index) => {
          const payload = slide.payloadJson as any;
          console.log(`     ${index + 1}. [${slide.type}] ${payload?.title || 'Untitled'} (section: ${slide.section_type || 'none'})`);
        });
      }
    }
    
    // Overall statistics
    console.log("\n📊 Overall Statistics:");
    const allSlides = await db.select().from(slides);
    const slideStats = allSlides.reduce((acc, slide) => {
      const section = slide.section_type || 'none';
      if (!acc[section]) acc[section] = 0;
      acc[section]++;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("  Slides by section_type:");
    Object.entries(slideStats).forEach(([section, count]) => {
      console.log(`    - ${section}: ${count} slides`);
    });
    
    // Check for slides with null section_type
    const nullSectionSlides = allSlides.filter(s => !s.section_type);
    if (nullSectionSlides.length > 0) {
      console.log(`\n⚠️  WARNING: ${nullSectionSlides.length} slides have NULL section_type!`);
      console.log("  First 5 slides with NULL section_type:");
      nullSectionSlides.slice(0, 5).forEach(slide => {
        const payload = slide.payloadJson as any;
        console.log(`    - ID: ${slide.id}, Type: ${slide.type}, Title: ${payload?.title || 'Untitled'}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error checking slides:", error);
  } finally {
    process.exit(0);
  }
}

checkDeepDiveSlides();