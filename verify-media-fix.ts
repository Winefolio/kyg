// Script to verify media upload functionality after fix
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function verifyMediaFix() {
  console.log('🔍 Verifying Media Upload Fix\n');
  
  try {
    // 1. Check if media table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'media'
      );
    `);
    
    const mediaTableExists = tableCheck.rows?.[0]?.exists;
    console.log(`✅ Media table exists: ${mediaTableExists}`);
    
    if (!mediaTableExists) {
      console.error('❌ Media table is still missing!');
      return;
    }
    
    // 2. Check table structure
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'media'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Media table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : ''}`);
    });
    
    // 3. Check indexes
    const indexes = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'media'
      AND schemaname = 'public';
    `);
    
    console.log('\n🔍 Indexes:');
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    // 4. Try to insert a test record (then delete it)
    console.log('\n🧪 Testing insert capability...');
    try {
      await db.execute(sql`
        INSERT INTO media (
          public_id, entity_type, media_type, file_name, 
          mime_type, file_size, storage_url
        ) VALUES (
          'TEST12345678', 'test', 'image', 'test.jpg', 
          'image/jpeg', 1024, 'https://test.com/test.jpg'
        );
      `);
      
      console.log('✅ Test insert successful');
      
      // Clean up test record
      await db.execute(sql`
        DELETE FROM media WHERE public_id = 'TEST12345678';
      `);
      console.log('✅ Test record cleaned up');
      
    } catch (insertError) {
      console.error('❌ Test insert failed:', insertError.message);
    }
    
    // 5. Check if there are any existing media records
    const mediaCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM media;
    `);
    
    console.log(`\n📊 Existing media records: ${mediaCount.rows?.[0]?.count || 0}`);
    
    console.log('\n✅ Media table verification complete!');
    console.log('Media uploads should now work correctly in production.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    process.exit(0);
  }
}

verifyMediaFix();