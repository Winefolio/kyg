import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://byearryckdwmajygqdpx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZWFycnlja2R3bWFqeWdxZHB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY4NDMzMSwiZXhwIjoyMDY0MjYwMzMxfQ.20nKBLDl_4zgfr3yyfdvZa9HY3NSBdpbsOzxQXRJuo4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllParticipants() {
  console.log('🍷 Fetching all participants from Supabase...\n');
  
  try {
    // Get all participants with emails
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .not('email', 'is', null)
      .order('display_name');
    
    if (participantsError) {
      console.log('❌ Error getting participants:', participantsError.message);
      return;
    }
    
    console.log(`✅ Found ${participants.length} participants with emails:\n`);
    
    // Group participants by email to handle duplicates
    const uniqueParticipants = new Map();
    
    participants.forEach(participant => {
      const email = participant.email;
      if (!uniqueParticipants.has(email)) {
        uniqueParticipants.set(email, {
          email: email,
          displayName: participant.display_name,
          participantIds: [],
          totalResponses: 0,
          sessions: new Set()
        });
      }
      
      const user = uniqueParticipants.get(email);
      user.participantIds.push(participant.id);
      if (participant.session_id) {
        user.sessions.add(participant.session_id);
      }
    });
    
    // Get response counts for each participant
    for (const [email, user] of uniqueParticipants) {
      // Get responses for all participant IDs for this email
      const { data: responses, error: responsesError } = await supabase
        .from('responses')
        .select('*')
        .in('participant_id', user.participantIds);
      
      if (!responsesError && responses) {
        user.totalResponses = responses.length;
      }
    }
    
    // Display all participants
    const sortedParticipants = Array.from(uniqueParticipants.values())
      .sort((a, b) => b.totalResponses - a.totalResponses);
    
    sortedParticipants.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName} (${user.email})`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Display Name: ${user.displayName}`);
      console.log(`   🆔 Participant IDs: ${user.participantIds.join(', ')}`);
      console.log(`   📊 Total Responses: ${user.totalResponses}`);
      console.log(`   🍷 Sessions: ${user.sessions.size}`);
      console.log(`   🔗 Dashboard URL: http://localhost:3000/dashboard/${encodeURIComponent(user.email)}`);
      console.log('');
    });
    
    console.log('📋 Summary:');
    console.log(`   Total unique users: ${sortedParticipants.length}`);
    console.log(`   Total responses across all users: ${sortedParticipants.reduce((sum, user) => sum + user.totalResponses, 0)}`);
    console.log(`   Average responses per user: ${(sortedParticipants.reduce((sum, user) => sum + user.totalResponses, 0) / sortedParticipants.length).toFixed(1)}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

listAllParticipants(); 