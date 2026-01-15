import { db } from './server/db';
import { slides, packages, packageWines } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function testSlideNavigation() {
  console.log('🔍 Testing slide navigation and ending slides visibility...\n');
  
  try {
    // Test with a specific package that has ending slides
    const testPackageCode = 'LM1GAA'; // Cerbone v2 which we know has ending slides
    
    const pkg = await db.select()
      .from(packages)
      .where(eq(packages.code, testPackageCode))
      .limit(1);
    
    if (!pkg[0]) {
      console.log('Test package not found, using first available package...');
      const firstPkg = await db.select().from(packages).limit(1);
      if (!firstPkg[0]) {
        console.log('No packages found!');
        return;
      }
      pkg[0] = firstPkg[0];
    }
    
    console.log(`📦 Testing with package: ${pkg[0].name} (${pkg[0].code})`);
    
    // Get package-level slides
    const packageSlides = await db.select()
      .from(slides)
      .where(eq(slides.packageId, pkg[0].id))
      .orderBy(slides.position);
    
    console.log(`\n📋 Package-level slides: ${packageSlides.length}`);
    
    // Get all wines
    const wines = await db.select()
      .from(packageWines)
      .where(eq(packageWines.packageId, pkg[0].id))
      .orderBy(packageWines.position);
    
    console.log(`🍷 Wines in package: ${wines.length}`);
    
    // Simulate how slides are combined in TastingSession
    let allSlides: any[] = [];
    
    // Add package slides
    allSlides = allSlides.concat(packageSlides);
    
    // Add wine slides in order
    for (const wine of wines) {
      const wineSlides = await db.select()
        .from(slides)
        .where(eq(slides.packageWineId, wine.id))
        .orderBy(slides.position);
      
      console.log(`\n   🍷 ${wine.wineName}:`);
      console.log(`      Total slides: ${wineSlides.length}`);
      
      // Group by section
      const sections = {
        intro: wineSlides.filter(s => s.section_type === 'intro'),
        deep_dive: wineSlides.filter(s => s.section_type === 'deep_dive' || s.section_type === 'tasting'),
        ending: wineSlides.filter(s => s.section_type === 'ending' || s.section_type === 'conclusion')
      };
      
      console.log(`      Intro: ${sections.intro.length}, Deep Dive: ${sections.deep_dive.length}, Ending: ${sections.ending.length}`);
      
      // Combine in order (matching TastingSession logic)
      const orderedWineSlides = [...sections.intro, ...sections.deep_dive, ...sections.ending];
      allSlides = allSlides.concat(orderedWineSlides);
      
      if (sections.ending.length > 0) {
        console.log(`      ✅ Ending slides:`);
        sections.ending.forEach((slide, idx) => {
          const payload = slide.payloadJson as any;
          console.log(`         ${idx + 1}. "${payload.title || 'Untitled'}" (position: ${slide.position})`);
        });
      } else {
        console.log(`      ⚠️  No ending slides`);
      }
    }
    
    // Sort by global position
    allSlides.sort((a, b) => {
      const posA = a.globalPosition || 0;
      const posB = b.globalPosition || 0;
      if (posA !== posB) return posA - posB;
      return a.id.localeCompare(b.id);
    });
    
    console.log(`\n📊 Total slides after combining: ${allSlides.length}`);
    
    // Show the last few slides to see if ending slides are at the end
    console.log('\n🔚 Last 5 slides in navigation order:');
    const lastSlides = allSlides.slice(-5);
    lastSlides.forEach((slide, idx) => {
      const payload = slide.payloadJson as any;
      const slideNum = allSlides.length - 5 + idx + 1;
      console.log(`   ${slideNum}. "${payload.title || 'Untitled'}" (section: ${slide.section_type || 'unknown'}, type: ${slide.type})`);
    });
    
    // Check if the very last slide is an ending slide
    const lastSlide = allSlides[allSlides.length - 1];
    if (lastSlide) {
      const isEndingSlide = lastSlide.section_type === 'ending' || lastSlide.section_type === 'conclusion';
      console.log(`\n🎯 Last slide is ${isEndingSlide ? 'an ENDING slide ✅' : 'NOT an ending slide ⚠️'}`);
      
      if (!isEndingSlide) {
        console.log('   This could cause issues with completion!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testSlideNavigation();