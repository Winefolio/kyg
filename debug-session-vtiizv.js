import pkg from 'pg';
const { Client } = pkg;

async function investigateSessionVTIIZV() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Find session VTIIZV
    const sessionResult = await client.query(`
      SELECT id, short_code, package_id, status 
      FROM sessions 
      WHERE short_code = 'VTIIZV'
    `);

    if (sessionResult.rows.length === 0) {
      console.log('❌ Session VTIIZV not found');
      return;
    }

    const session = sessionResult.rows[0];
    console.log('✅ Session found:', session);

    // 2. Get package info
    const packageResult = await client.query(`
      SELECT id, code, name 
      FROM packages 
      WHERE id = $1
    `, [session.package_id]);

    const pkg = packageResult.rows[0];
    console.log('📦 Package:', pkg);

    // 3. Get participants for this session
    const participantResult = await client.query(`
      SELECT id, display_name, is_host, session_id
      FROM participants 
      WHERE session_id = $1
    `, [session.id]);

    const participants = participantResult.rows;
    console.log('👥 Participants:', participants);

    // 4. Check for session wine selections
    const wineSelectionsResult = await client.query(`
      SELECT sws.id, sws.position, sws.is_included, pw.wine_name
      FROM session_wine_selections sws
      JOIN package_wines pw ON sws.package_wine_id = pw.id
      WHERE sws.session_id = $1
      ORDER BY sws.position
    `, [session.id]);

    console.log('🍷 Session wine selections:', wineSelectionsResult.rows);

    // 5. Get all package wines
    const packageWinesResult = await client.query(`
      SELECT id, wine_name, position
      FROM package_wines 
      WHERE package_id = $1
      ORDER BY position
    `, [pkg.id]);

    const packageWines = packageWinesResult.rows;
    console.log('🍷 All package wines:', packageWines);

    // 6. Determine which wines are active (mimic API logic)
    let activeWines = packageWines;
    if (wineSelectionsResult.rows.length > 0) {
      activeWines = wineSelectionsResult.rows
        .filter(selection => selection.is_included)
        .sort((a, b) => a.position - b.position)
        .map(selection => ({
          id: selection.package_wine_id,
          wine_name: selection.wine_name,
          position: selection.position
        }));
    }
    console.log('🎯 Active wines for session:', activeWines);

    // 7. Get slides for each active wine
    let allSlides = [];
    for (const wine of activeWines) {
      const slidesResult = await client.query(`
        SELECT id, position, global_position, type, section_type, payload_json, package_wine_id
        FROM slides 
        WHERE package_wine_id = $1
        ORDER BY global_position
      `, [wine.id]);

      const wineSlides = slidesResult.rows;
      console.log(`📄 Slides for wine ${wine.wine_name} (${wine.id}):`, 
        wineSlides.map(s => ({
          id: s.id.substring(0, 8),
          position: s.position,
          globalPosition: s.global_position,
          type: s.type,
          section: s.section_type
        }))
      );

      allSlides = allSlides.concat(wineSlides);
    }

    // 8. Sort by global_position (mimic API logic)
    allSlides.sort((a, b) => (a.global_position || 0) - (b.global_position || 0));

    console.log('\n🔍 CRITICAL ANALYSIS:');
    console.log(`Total slides retrieved: ${allSlides.length}`);
    console.log('Sorted slide order with global_position:');
    
    allSlides.forEach((slide, index) => {
      console.log(`  [${index}] ID: ${slide.id.substring(0, 8)}, globalPos: ${slide.global_position}, type: ${slide.type}, section: ${slide.section_type}`);
    });

    // 9. Check for duplicate global_position values
    const globalPositions = allSlides.map(s => s.global_position);
    const duplicates = globalPositions.filter((pos, index) => globalPositions.indexOf(pos) !== index);
    if (duplicates.length > 0) {
      console.log(`\n❌ DUPLICATE GLOBAL_POSITION VALUES FOUND: ${[...new Set(duplicates)].join(', ')}`);
      
      // Show which slides have duplicates
      const duplicatePositions = [...new Set(duplicates)];
      duplicatePositions.forEach(pos => {
        const duplicateSlides = allSlides.filter(s => s.global_position === pos);
        console.log(`   Position ${pos} used by slides:`, duplicateSlides.map(s => s.id.substring(0, 8)));
      });
    }

    // 10. Filter host-only slides (mimic API logic for non-host participant)
    const nonHostSlides = allSlides.filter(slide => {
      const payload = slide.payload_json;
      return !payload.for_host;
    });

    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`- All slides (raw): ${allSlides.length}`);
    console.log(`- Non-host slides (what users see): ${nonHostSlides.length}`);
    console.log(`- Array indices available: 0-${nonHostSlides.length - 1}`);

    if (nonHostSlides.length === 11) {
      console.log(`\n🚨 ROOT CAUSE IDENTIFIED:`);
      console.log(`- Frontend tries to access slide at index 11`);
      console.log(`- But only indices 0-10 exist (11 total slides)`);
      console.log(`- slides[11] returns undefined → blank slide`);
      console.log(`- This creates an off-by-one error in navigation`);
    }

    // 11. Simulate the exact API response
    const apiResponse = {
      package: pkg,
      slides: nonHostSlides,
      totalCount: nonHostSlides.length,
      wines: activeWines
    };

    console.log(`\n📡 API Response would return:`);
    console.log(`- totalCount: ${apiResponse.totalCount}`);
    console.log(`- Last valid index: ${apiResponse.totalCount - 1}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Run the investigation
investigateSessionVTIIZV().catch(console.error);