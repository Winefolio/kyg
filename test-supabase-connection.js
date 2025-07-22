import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://byearryckdwmajygqdpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test 1: Check if we can connect
    console.log('1. Testing basic connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('❌ Error getting tables:', tablesError.message);
    } else {
      console.log('✅ Connection successful!');
      console.log('Tables found:', tables?.length || 0);
    }
    
    // Test 2: Try to get participants
    console.log('\n2. Checking participants table...');
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .limit(5);
    
    if (participantsError) {
      console.log('❌ Error getting participants:', participantsError.message);
    } else {
      console.log('✅ Participants found:', participants?.length || 0);
      if (participants && participants.length > 0) {
        console.log('Sample participant:', {
          id: participants[0].id,
          email: participants[0].email,
          display_name: participants[0].display_name
        });
      }
    }
    
    // Test 3: Try to get responses
    console.log('\n3. Checking responses table...');
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select('*')
      .limit(5);
    
    if (responsesError) {
      console.log('❌ Error getting responses:', responsesError.message);
    } else {
      console.log('✅ Responses found:', responses?.length || 0);
      if (responses && responses.length > 0) {
        console.log('Sample response:', {
          id: responses[0].id,
          participant_id: responses[0].participant_id,
          slide_id: responses[0].slide_id
        });
      }
    }
    
    // Test 4: Try to get sessions
    console.log('\n4. Checking sessions table...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(5);
    
    if (sessionsError) {
      console.log('❌ Error getting sessions:', sessionsError.message);
    } else {
      console.log('✅ Sessions found:', sessions?.length || 0);
      if (sessions && sessions.length > 0) {
        console.log('Sample session:', {
          id: sessions[0].id,
          package_id: sessions[0].package_id,
          started_at: sessions[0].started_at
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection(); 