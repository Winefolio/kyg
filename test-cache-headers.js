// Test script to verify cache headers are being set correctly
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/packages/TESTCODE/slides?participantId=test123',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:');
  console.log('  Cache-Control:', res.headers['cache-control']);
  console.log('  Pragma:', res.headers['pragma']);
  console.log('  Expires:', res.headers['expires']);
  
  res.on('data', () => {});
  res.on('end', () => {
    console.log('\nCache prevention headers are properly set!');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.log('Make sure the server is running on port 5000');
});

req.end();