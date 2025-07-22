import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://byearryckdwmajygqdpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBrookeData() {
  console.log('🍷 Testing Brooke Levine data...\n');
  
  try {
    // Find Brooke's participant record
    const { data: brooke, error: brookeError } = await supabase
      .from('participants')
      .select('*')
      .eq('email', 'blevine379@gmail.com')
      .single();
    
    if (brookeError) {
      console.log('❌ Error finding Brooke:', brookeError.message);
      return;
    }
    
    console.log('✅ Found Brooke:', {
      id: brooke.id,
      email: brooke.email,
      display_name: brooke.display_name
    });
    
    // Get Brooke's responses
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        *,
        slides (
          id,
          type,
          payload_json
        )
      `)
      .eq('participant_id', brooke.id);
    
    if (responsesError) {
      console.log('❌ Error getting responses:', responsesError.message);
      return;
    }
    
    console.log(`✅ Found ${responses.length} responses for Brooke`);
    
    // Show sample responses
    console.log('\n📝 Sample responses:');
    responses.slice(0, 3).forEach((response, index) => {
      console.log(`   ${index + 1}. Slide type: ${response.slides?.type}`);
      console.log(`      Answer: ${JSON.stringify(response.answer_json).substring(0, 100)}...`);
      console.log(`      Date: ${response.answered_at}`);
      console.log('');
    });
    
    // Get Brooke's sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        *,
        participants!inner(id, email)
      `)
      .eq('participants.email', 'blevine379@gmail.com');
    
    if (sessionsError) {
      console.log('❌ Error getting sessions:', sessionsError.message);
      return;
    }
    
    console.log(`✅ Found ${sessions.length} sessions for Brooke`);
    
    // Calculate stats
    const totalResponses = responses.length;
    const totalSessions = sessions.length;
    const averageScore = responses.length > 0 ? 
      responses.reduce((sum, r) => {
        const score = r.answer_json?.score || r.answer_json?.rating || 0;
        return sum + score;
      }, 0) / responses.length : 0;
    
    console.log('\n📊 Brooke\'s Stats:');
    console.log(`   - Total responses: ${totalResponses}`);
    console.log(`   - Total sessions: ${totalSessions}`);
    console.log(`   - Average score: ${averageScore.toFixed(1)}`);
    
    console.log('\n🎯 Brooke\'s data is available for testing!');
    console.log('   URL: http://localhost:3001/dashboard/blevine379@gmail.com');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBrookeData(); 