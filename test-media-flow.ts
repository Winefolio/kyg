// Comprehensive test script for media upload and playback flow
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function testMediaFlow() {
  console.log('🧪 Testing Complete Media Upload & Playback Flow\n');
  
  try {
    // 1. Check media table exists
    console.log('1️⃣ Checking media table...');
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'media'
      );
    `);
    
    const tableExists = tableCheck.rows?.[0]?.exists;
    if (!tableExists) {
      console.error('❌ Media table does not exist!');
      return;
    }
    console.log('✅ Media table exists');
    
    // 2. Check for media records
    console.log('\n2️⃣ Checking media records...');
    const mediaRecords = await db.execute(sql`
      SELECT 
        public_id,
        entity_type,
        media_type,
        file_name,
        storage_url,
        uploaded_at
      FROM media
      ORDER BY uploaded_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${mediaRecords.rows.length} recent media records`);
    mediaRecords.rows.forEach(record => {
      console.log(`  - ${record.public_id}: ${record.media_type} (${record.file_name})`);
    });
    
    // 3. Check slides with media
    console.log('\n3️⃣ Checking slides with media content...');
    const mediaSlides = await db.execute(sql`
      SELECT 
        s.id,
        s.type,
        s.payload_json,
        pw.wine_name
      FROM slides s
      LEFT JOIN package_wines pw ON s.package_wine_id = pw.id
      WHERE s.type IN ('video_message', 'audio_message')
      ORDER BY s.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${mediaSlides.rows.length} media slides`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const slide of mediaSlides.rows) {
      const payload = slide.payload_json as any;
      const isVideo = slide.type === 'video_message';
      const mediaType = isVideo ? 'video' : 'audio';
      
      // Check if using new format (publicId)
      const publicId = isVideo ? payload.video_publicId : payload.audio_publicId;
      const url = isVideo ? payload.video_url : payload.audio_url;
      const fileName = isVideo ? payload.video_fileName : payload.audio_fileName;
      
      if (publicId) {
        console.log(`  ✅ ${mediaType} slide ${slide.id} uses publicId: ${publicId}`);
        
        // Verify media record exists
        const mediaCheck = await db.execute(sql`
          SELECT COUNT(*) as count
          FROM media
          WHERE public_id = ${publicId}
        `);
        
        if (mediaCheck.rows?.[0]?.count > 0) {
          console.log(`     ✓ Media record exists for ${publicId}`);
          validCount++;
        } else {
          console.log(`     ❌ Missing media record for ${publicId}`);
          invalidCount++;
        }
      } else if (url) {
        console.log(`  ⚠️  ${mediaType} slide ${slide.id} uses old format: ${url}`);
        invalidCount++;
      } else {
        console.log(`  ❌ ${mediaType} slide ${slide.id} has no media URL or publicId`);
        invalidCount++;
      }
    }
    
    // 4. Test the media access endpoint
    console.log('\n4️⃣ Testing media access endpoint...');
    if (mediaRecords.rows.length > 0) {
      const testPublicId = mediaRecords.rows[0].public_id;
      console.log(`Testing access for publicId: ${testPublicId}`);
      console.log(`Access URL would be: /api/media/${testPublicId}/file`);
      
      // Check if media file exists in storage
      const storageUrl = mediaRecords.rows[0].storage_url;
      console.log(`Storage URL: ${storageUrl}`);
    }
    
    // 5. Summary
    console.log('\n📊 Media Flow Test Summary:');
    console.log(`- Media table: ✅ EXISTS`);
    console.log(`- Media records: ${mediaRecords.rows.length}`);
    console.log(`- Media slides: ${mediaSlides.rows.length}`);
    console.log(`- Valid slides (with publicId): ${validCount}`);
    console.log(`- Invalid slides (old format or missing): ${invalidCount}`);
    
    if (invalidCount > 0) {
      console.log('\n⚠️  Action Required:');
      console.log('Run the migration script to fix slides using old format:');
      console.log('npx tsx fix-existing-media-urls.ts');
    } else {
      console.log('\n✅ All media slides are properly configured!');
    }
    
    // 6. Check for orphaned media
    console.log('\n5️⃣ Checking for orphaned media records...');
    const orphanedMedia = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM media m
      WHERE NOT EXISTS (
        SELECT 1 FROM slides s
        WHERE (s.payload_json->>'video_publicId' = m.public_id
           OR s.payload_json->>'audio_publicId' = m.public_id)
      )
    `);
    
    console.log(`Orphaned media records: ${orphanedMedia.rows?.[0]?.count || 0}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testMediaFlow();