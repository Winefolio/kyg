import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://byearryckdwmajygqdpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboardWithRealData() {
  console.log('🍷 Testing Dashboard with Real Supabase Data...\n');
  
  try {
    // Get all participants with emails
    console.log('1. Getting participants with emails...');
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .not('email', 'is', null);
    
    if (participantsError) {
      console.log('❌ Error getting participants:', participantsError.message);
      return;
    }
    
    console.log(`✅ Found ${participants.length} participants with emails:`);
    participants.forEach(p => {
      console.log(`   - ${p.email} (${p.display_name})`);
    });
    
    // Test dashboard for each participant
    for (const participant of participants) {
      console.log(`\n2. Testing dashboard for ${participant.email}...`);
      
      // Get participant's responses
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            payload_json
          ),
          participants (
            id,
            email,
            display_name
          )
        `)
        .eq('participant_id', participant.id);
      
      if (responsesError) {
        console.log(`❌ Error getting responses for ${participant.email}:`, responsesError.message);
        continue;
      }
      
      console.log(`   ✅ Found ${responses.length} responses`);
      
      // Get participant's sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          *,
          participants!inner(id, email)
        `)
        .eq('participants.email', participant.email);
      
      if (sessionsError) {
        console.log(`❌ Error getting sessions for ${participant.email}:`, sessionsError.message);
        continue;
      }
      
      console.log(`   ✅ Found ${sessions.length} sessions`);
      
      // Calculate some basic stats
      const totalResponses = responses.length;
      const totalSessions = sessions.length;
      const averageScore = responses.length > 0 ? 
        responses.reduce((sum, r) => {
          const score = r.answer_json?.score || r.answer_json?.rating || 0;
          return sum + score;
        }, 0) / responses.length : 0;
      
      console.log(`   📊 Stats: ${totalResponses} responses, ${totalSessions} sessions, avg score: ${averageScore.toFixed(1)}`);
      
      // Show sample response data
      if (responses.length > 0) {
        const sampleResponse = responses[0];
        console.log(`   📝 Sample response:`, {
          slide_type: sampleResponse.slides?.type,
          answer: sampleResponse.answer_json,
          answered_at: sampleResponse.answered_at
        });
      }
    }
    
    // Test with a specific email that we know exists
    const testEmail = 'pmela99@gmail.com';
    console.log(`\n3. Testing dashboard API simulation for ${testEmail}...`);
    
    // Simulate what the dashboard API would return
    const { data: testParticipant } = await supabase
      .from('participants')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (testParticipant) {
      const { data: testResponses } = await supabase
        .from('responses')
        .select(`
          *,
          slides (
            id,
            type,
            payload_json
          )
        `)
        .eq('participant_id', testParticipant.id);
      
      const { data: testSessions } = await supabase
        .from('sessions')
        .select(`
          *,
          participants!inner(id, email)
        `)
        .eq('participants.email', testEmail);
      
      console.log(`✅ Dashboard data for ${testEmail}:`);
      console.log(`   - User: ${testParticipant.display_name}`);
      console.log(`   - Total responses: ${testResponses?.length || 0}`);
      console.log(`   - Total sessions: ${testSessions?.length || 0}`);
      console.log(`   - Email: ${testParticipant.email}`);
      
      // This is the data that would be returned by your dashboard API
      const dashboardData = {
        user: {
          email: testParticipant.email,
          displayName: testParticipant.display_name,
          totalSessions: testSessions?.length || 0,
          completedSessions: testSessions?.filter(s => s.completed_at)?.length || 0,
          totalResponses: testResponses?.length || 0,
          uniqueWinesTasted: new Set(testResponses?.map(r => r.slides?.id)).size || 0
        },
        stats: {
          averageScore: testResponses?.length > 0 ? 
            testResponses.reduce((sum, r) => {
              const score = r.answer_json?.score || r.answer_json?.rating || 0;
              return sum + score;
            }, 0) / testResponses.length : 0,
          favoriteWineType: "Red", // Would need more analysis
          totalTastings: testResponses?.length || 0
        }
      };
      
      console.log(`   📊 Dashboard stats:`, dashboardData.stats);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardWithRealData(); 