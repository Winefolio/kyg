// New approach for slide reordering that should eliminate all duplicate key issues

import { db } from './db';
import { slides } from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function reorderSlidesForWine(
  wineId: string, 
  updates: { slideId: string; position: number }[]
) {
  // Use a transaction to ensure atomicity
  return await db.transaction(async (tx) => {
    console.log(`🍷 Starting reorder for wine ${wineId} with ${updates.length} updates`);
    
    // Step 1: Get ALL slides for this wine
    const allWineSlides = await tx
      .select()
      .from(slides)
      .where(eq(slides.packageWineId, wineId))
      .orderBy(slides.position);
    
    console.log(`   Found ${allWineSlides.length} total slides for wine`);
    
    // Step 2: Create a map of slideId to new position from updates
    const updateMap = new Map(updates.map(u => [u.slideId, u.position]));
    
    // Step 3: Build complete list of slides with their target positions
    const slidesToUpdate: Array<{ id: string; currentPosition: number; newPosition: number }> = [];
    
    allWineSlides.forEach(slide => {
      const newPosition = updateMap.get(slide.id);
      if (newPosition !== undefined && newPosition !== slide.position) {
        slidesToUpdate.push({
          id: slide.id,
          currentPosition: slide.position,
          newPosition: newPosition
        });
      }
    });
    
    console.log(`   ${slidesToUpdate.length} slides need position updates`);
    
    if (slidesToUpdate.length === 0) {
      console.log(`   No position changes needed for wine ${wineId}`);
      return [];
    }
    
    // Step 4: Use deterministic temporary positions to avoid all conflicts
    // Use the slide ID hash to ensure unique temporary positions
    const tempBase = 900000; // High number to avoid conflicts
    
    // Step 5: Move to unique temporary positions first using slide ID for uniqueness
    for (let i = 0; i < slidesToUpdate.length; i++) {
      const slide = slidesToUpdate[i];
      // Use slide ID hash + index to ensure absolute uniqueness
      const slideHash = slide.id.split('-')[0]; // Use first part of UUID
      const tempPosition = tempBase + parseInt(slideHash.slice(-3), 16) + i * 1000;
      
      console.log(`   Moving slide ${slide.id} to temp position ${tempPosition}`);
      await tx
        .update(slides)
        .set({ position: tempPosition })
        .where(eq(slides.id, slide.id));
    }
    
    // Step 6: Now assign final positions in order
    for (const slide of slidesToUpdate) {
      console.log(`   Setting slide ${slide.id} final position: ${slide.currentPosition} → ${slide.newPosition}`);
      await tx
        .update(slides)
        .set({ position: slide.newPosition })
        .where(eq(slides.id, slide.id));
    }
    
    console.log(`✅ Successfully reordered ${slidesToUpdate.length} slides for wine ${wineId}`);
    return slidesToUpdate;
  });
}

// Alternative: Renumber all slides sequentially
export async function renumberSlidesForWine(wineId: string) {
  return await db.transaction(async (tx) => {
    // Get all slides sorted by section and current position
    const allSlides = await tx
      .select()
      .from(slides)
      .where(eq(slides.packageWineId, wineId))
      .orderBy(slides.position);
    
    // Group by section
    const sectionOrder = { 'intro': 0, 'deep_dive': 1, 'ending': 2 };
    
    // Sort properly
    allSlides.sort((a, b) => {
      // Welcome slides first
      const aIsWelcome = a.type === 'interlude' && 
        a.section_type === 'intro' &&
        (a.payloadJson as any)?.title?.toLowerCase().includes('welcome');
      const bIsWelcome = b.type === 'interlude' && 
        b.section_type === 'intro' &&
        (b.payloadJson as any)?.title?.toLowerCase().includes('welcome');
      
      if (aIsWelcome && !bIsWelcome) return -1;
      if (!aIsWelcome && bIsWelcome) return 1;
      
      // Then by section
      const sectionDiff = (sectionOrder[a.section_type as keyof typeof sectionOrder] || 0) - 
                          (sectionOrder[b.section_type as keyof typeof sectionOrder] || 0);
      if (sectionDiff !== 0) return sectionDiff;
      
      // Then by current position
      return a.position - b.position;
    });
    
    // Assign new positions
    const updates: Array<{ id: string; position: number }> = [];
    allSlides.forEach((slide, index) => {
      const newPosition = (index + 1) * 10;
      if (slide.position !== newPosition) {
        updates.push({ id: slide.id, position: newPosition });
      }
    });
    
    // Apply updates using temp positions
    const tempOffset = 1000000;
    
    // First pass: temp positions
    for (let i = 0; i < updates.length; i++) {
      await tx
        .update(slides)
        .set({ position: tempOffset + i })
        .where(eq(slides.id, updates[i].id));
    }
    
    // Second pass: final positions
    for (const update of updates) {
      await tx
        .update(slides)
        .set({ position: update.position })
        .where(eq(slides.id, update.id));
    }
    
    return updates;
  });
}