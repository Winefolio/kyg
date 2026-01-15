// Test script to verify MIME type handling
const { getMediaType, ALLOWED_FILE_TYPES } = require('./dist/supabase-storage.js');

console.log('Testing audio MIME types:');
console.log('ALLOWED_FILE_TYPES.audio:', ALLOWED_FILE_TYPES.audio);

const testMimes = [
  'audio/mpeg',
  'audio/mp3', 
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/webm'
];

testMimes.forEach(mime => {
  const result = getMediaType(mime);
  console.log(`${mime}: ${result || 'NOT RECOGNIZED'}`);
});

console.log('\nChecking if audio/x-m4a is in the array:', ALLOWED_FILE_TYPES.audio.includes('audio/x-m4a'));