// Script to migrate existing media URLs to use publicId format
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { slides } from './shared/schema';
import { eq } from 'drizzle-orm';

async function migrateExistingMediaUrls() {
  console.log('🔄 Starting migration of existing media URLs...\n');
  
  try {
    // Find all slides with video_message or audio_message type
    const mediaSlides = await db.execute(sql`
      SELECT id, type, payload_json
      FROM slides
      WHERE type IN ('video_message', 'audio_message')
    `);
    
    console.log(`Found ${mediaSlides.rows.length} media slides to check`);
    
    let migratedCount = 0;
    
    for (const slide of mediaSlides.rows) {
      const payload = slide.payload_json as any;
      let needsUpdate = false;
      let updatedPayload = { ...payload };
      
      // Check video slides
      if (slide.type === 'video_message' && payload.video_url) {
        // Check if it's using the old format (/api/media/{publicId}/file)
        const match = payload.video_url.match(/\/api\/media\/([^\/]+)\/file/);
        if (match && !payload.video_publicId) {
          const publicId = match[1];
          updatedPayload.video_publicId = publicId;
          
          // Try to get media info from media table
          const mediaInfo = await db.execute(sql`
            SELECT file_name, file_size
            FROM media
            WHERE public_id = ${publicId}
            LIMIT 1
          `);
          
          if (mediaInfo.rows[0]) {
            updatedPayload.video_fileName = mediaInfo.rows[0].file_name;
            updatedPayload.video_fileSize = mediaInfo.rows[0].file_size;
          }
          
          needsUpdate = true;
          console.log(`  ✅ Migrating video slide ${slide.id} with publicId: ${publicId}`);
        }
      }
      
      // Check audio slides
      if (slide.type === 'audio_message' && payload.audio_url) {
        // Check if it's using the old format (/api/media/{publicId}/file)
        const match = payload.audio_url.match(/\/api\/media\/([^\/]+)\/file/);
        if (match && !payload.audio_publicId) {
          const publicId = match[1];
          updatedPayload.audio_publicId = publicId;
          
          // Try to get media info from media table
          const mediaInfo = await db.execute(sql`
            SELECT file_name, file_size
            FROM media
            WHERE public_id = ${publicId}
            LIMIT 1
          `);
          
          if (mediaInfo.rows[0]) {
            updatedPayload.audio_fileName = mediaInfo.rows[0].file_name;
            updatedPayload.audio_fileSize = mediaInfo.rows[0].file_size;
          }
          
          needsUpdate = true;
          console.log(`  ✅ Migrating audio slide ${slide.id} with publicId: ${publicId}`);
        }
      }
      
      // Update the slide if needed
      if (needsUpdate) {
        await db
          .update(slides)
          .set({ payloadJson: updatedPayload })
          .where(eq(slides.id, slide.id));
        
        migratedCount++;
      }
    }
    
    console.log(`\n✅ Migration complete! Migrated ${migratedCount} slides.`);
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const stillUsingOldFormat = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM slides
      WHERE type IN ('video_message', 'audio_message')
      AND (
        (payload_json->>'video_url' LIKE '/api/media/%/file' AND payload_json->>'video_publicId' IS NULL)
        OR
        (payload_json->>'audio_url' LIKE '/api/media/%/file' AND payload_json->>'audio_publicId' IS NULL)
      )
    `);
    
    const remainingCount = stillUsingOldFormat.rows[0]?.count || 0;
    if (remainingCount > 0) {
      console.log(`⚠️  Warning: ${remainingCount} slides still using old format`);
    } else {
      console.log('✅ All media slides are using the new publicId format!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateExistingMediaUrls();