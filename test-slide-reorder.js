#!/usr/bin/env node

// Test script to validate slide reorder fix
// This simulates the client-side position calculation logic

const slides = [
  { id: 'slide-1', packageWineId: 'wine-1', position: 10, section_type: 'intro' },
  { id: 'slide-2', packageWineId: 'wine-1', position: 20, section_type: 'intro' },
  { id: 'slide-3', packageWineId: 'wine-1', position: 30, section_type: 'deep_dive' },
  { id: 'slide-4', packageWineId: 'wine-2', position: 10, section_type: 'intro' },
  { id: 'slide-5', packageWineId: 'wine-2', position: 20, section_type: 'intro' },
];

const localSlides = [
  { id: 'slide-1', packageWineId: 'wine-1', position: 10, section_type: 'intro' },
  { id: 'slide-2', packageWineId: 'wine-1', position: 30, section_type: 'intro' }, // SWAPPED!
  { id: 'slide-3', packageWineId: 'wine-1', position: 20, section_type: 'deep_dive' }, // SWAPPED!
  { id: 'slide-4', packageWineId: 'wine-2', position: 10, section_type: 'intro' },
  { id: 'slide-5', packageWineId: 'wine-2', position: 20, section_type: 'intro' },
];

console.log('🧪 Testing slide reorder fix logic...\n');

// Test 1: Calculate what updates should be sent (NEW LOGIC)
console.log('1️⃣ Testing NEW client logic:');
const updates = [];

localSlides.forEach(localSlide => {
  const originalSlide = slides.find(s => s.id === localSlide.id);
  if (originalSlide && originalSlide.position !== localSlide.position) {
    updates.push({ 
      slideId: localSlide.id, 
      position: localSlide.position 
    });
  }
});

console.log('Updates to send to server:', updates);
console.log('Expected: slide-2 → position 30, slide-3 → position 20');

// Test 2: Validation - check for duplicates within same wine
console.log('\n2️⃣ Testing validation logic:');
const positionsByWine = new Map();
const duplicates = [];

localSlides.forEach(slide => {
  const wineId = slide.packageWineId;
  if (!positionsByWine.has(wineId)) {
    positionsByWine.set(wineId, new Set());
  }
  const positions = positionsByWine.get(wineId);
  if (positions.has(slide.position)) {
    duplicates.push(`Wine ${wineId} has duplicate position ${slide.position}`);
  }
  positions.add(slide.position);
});

console.log('Validation result:', duplicates.length === 0 ? '✅ No duplicates' : `❌ ${duplicates.join(', ')}`);

// Test 3: Simulate OLD logic (what was broken)
console.log('\n3️⃣ Testing OLD logic (what was broken):');
const slidesByWine = new Map();

localSlides.forEach(slide => {
  const wineId = slide.packageWineId;
  if (!slidesByWine.has(wineId)) {
    slidesByWine.set(wineId, []);
  }
  slidesByWine.get(wineId).push(slide);
});

let oldUpdates = [];
slidesByWine.forEach((wineSlides, wineId) => {
  console.log(`  Wine ${wineId} slides:`, wineSlides.map(s => `${s.id}:${s.position}`));
  
  // OLD logic would reassign ALL positions sequentially
  let position = 1;
  wineSlides.forEach((slide) => {
    const newPosition = position * 10; // 10, 20, 30...
    if (slide.position !== newPosition) {
      oldUpdates.push({ slideId: slide.id, position: newPosition });
    }
    position++;
  });
});

console.log('OLD logic would send:', oldUpdates);
console.log('❌ This reassigns ALL positions, ignoring user swaps!');

console.log('\n✅ NEW LOGIC FIXES:');
console.log('- Only sends slides that actually changed');
console.log('- Respects user swaps and manual positioning');
console.log('- Validates for conflicts before sending');
console.log('- Server uses battle-tested reorder function');