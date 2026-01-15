import { db } from './server/db';
import { slides } from './shared/schema';
import { eq, or } from 'drizzle-orm';

async function testHostOnlySlides() {
  console.log('🔍 Checking for host-only ending slides...\n');
  
  try {
    // Get all ending slides
    const endingSlides = await db.select()
      .from(slides)
      .where(or(
        eq(slides.section_type, 'ending'),
        eq(slides.section_type, 'conclusion')
      ));
    
    console.log(`Found ${endingSlides.length} ending slides total\n`);
    
    let hostOnlyCount = 0;
    
    endingSlides.forEach(slide => {
      const payload = slide.payloadJson as any;
      if (payload.for_host) {
        hostOnlyCount++;
        console.log(`🚫 HOST-ONLY ending slide found:`);
        console.log(`   Title: "${payload.title || 'Untitled'}"`);
        console.log(`   Type: ${slide.type}`);
        console.log(`   Section: ${slide.section_type}`);
        console.log(`   for_host: ${payload.for_host}`);
        console.log();
      }
    });
    
    if (hostOnlyCount === 0) {
      console.log('✅ No host-only ending slides found');
    } else {
      console.log(`\n⚠️  Found ${hostOnlyCount} host-only ending slides out of ${endingSlides.length} total ending slides`);
      console.log('This could explain why some ending slides are not visible to participants!');
    }
    
    // Also check what percentage of all slides are host-only
    const allSlides = await db.select().from(slides);
    const allHostOnly = allSlides.filter(s => (s.payloadJson as any).for_host);
    
    console.log(`\n📊 Overall statistics:`);
    console.log(`   Total slides: ${allSlides.length}`);
    console.log(`   Host-only slides: ${allHostOnly.length} (${Math.round(allHostOnly.length / allSlides.length * 100)}%)`);
    console.log(`   Ending slides: ${endingSlides.length}`);
    console.log(`   Host-only ending slides: ${hostOnlyCount} (${Math.round(hostOnlyCount / endingSlides.length * 100)}%)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

testHostOnlySlides();