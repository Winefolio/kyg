import { db } from './server/db';
import { slides, packages, packageWines } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testEndingSlides() {
  console.log('🔍 Testing ending slides visibility...\n');
  
  try {
    // Get all packages
    const allPackages = await db.select().from(packages);
    console.log(`Found ${allPackages.length} packages\n`);
    
    for (const pkg of allPackages) {
      console.log(`📦 Package: ${pkg.name} (${pkg.code})`);
      
      // Get all wines for this package
      const wines = await db.select()
        .from(packageWines)
        .where(eq(packageWines.packageId, pkg.id))
        .orderBy(packageWines.position);
      
      console.log(`   Found ${wines.length} wines`);
      
      for (const wine of wines) {
        console.log(`\n   🍷 Wine: ${wine.wineName} (Position: ${wine.position})`);
        
        // Get all slides for this wine
        const wineSlides = await db.select()
          .from(slides)
          .where(eq(slides.packageWineId, wine.id))
          .orderBy(slides.position);
        
        console.log(`      Total slides: ${wineSlides.length}`);
        
        // Count by section type
        const sectionCounts = wineSlides.reduce((acc, slide) => {
          const section = slide.section_type || 'unknown';
          acc[section] = (acc[section] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`      Section breakdown:`, sectionCounts);
        
        // Show ending slides specifically
        const endingSlides = wineSlides.filter(slide => 
          slide.section_type === 'ending' || slide.section_type === 'conclusion'
        );
        
        if (endingSlides.length > 0) {
          console.log(`\n      📋 Ending slides (${endingSlides.length}):`);
          endingSlides.forEach(slide => {
            const payload = slide.payloadJson as any;
            console.log(`         - Position ${slide.position}: "${payload.title || 'Untitled'}" (type: ${slide.type}, section: ${slide.section_type})`);
          });
        } else {
          console.log(`      ⚠️  NO ENDING SLIDES FOUND!`);
        }
      }
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
    // Also check if there are any slides with ending section_type across all packages
    const allEndingSlides = await db.select()
      .from(slides)
      .where(eq(slides.section_type, 'ending'));
    
    console.log(`\n📊 Total ending slides in database: ${allEndingSlides.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testEndingSlides();