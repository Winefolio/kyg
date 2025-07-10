#!/usr/bin/env node

/**
 * Test script to verify media streaming endpoint improvements
 * Tests HTTP range request support and mobile optimization
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const TEST_PUBLIC_ID = 'test123'; // Replace with actual media public ID
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function makeRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const module = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        ...headers
      }
    };
    
    const req = module.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testEndpoint(publicId) {
  console.log('🧪 Testing Media Streaming Endpoints\n');
  
  // Test 1: Basic request to /file endpoint
  console.log('1️⃣  Testing /file endpoint (basic request)');
  try {
    const res1 = await makeRequest(`/api/media/${publicId}/file`);
    console.log(`   Status: ${res1.status}`);
    console.log(`   Accept-Ranges: ${res1.headers['accept-ranges'] || 'NOT SET'}`);
    console.log(`   Cache-Control: ${res1.headers['cache-control'] || 'NOT SET'}`);
    console.log(`   ETag: ${res1.headers['etag'] || 'NOT SET'}`);
    console.log(`   ✅ Basic request successful\n`);
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
  
  // Test 2: Range request to /file endpoint
  console.log('2️⃣  Testing /file endpoint (range request)');
  try {
    const res2 = await makeRequest(`/api/media/${publicId}/file`, {
      'Range': 'bytes=0-1023'
    });
    console.log(`   Status: ${res2.status} (should be 206 for partial content)`);
    console.log(`   Content-Range: ${res2.headers['content-range'] || 'NOT SET'}`);
    console.log(`   Content-Length: ${res2.headers['content-length'] || 'NOT SET'}`);
    if (res2.status === 206) {
      console.log(`   ✅ Range request successful\n`);
    } else {
      console.log(`   ⚠️  Range request returned full content\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
  
  // Test 3: Conditional request (If-None-Match)
  console.log('3️⃣  Testing conditional request (ETag)');
  try {
    const res3a = await makeRequest(`/api/media/${publicId}/file`);
    const etag = res3a.headers['etag'];
    if (etag) {
      const res3b = await makeRequest(`/api/media/${publicId}/file`, {
        'If-None-Match': etag
      });
      console.log(`   Status: ${res3b.status} (should be 304 for not modified)`);
      if (res3b.status === 304) {
        console.log(`   ✅ Conditional request successful\n`);
      } else {
        console.log(`   ⚠️  ETag validation not working\n`);
      }
    } else {
      console.log(`   ⚠️  No ETag returned\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
  
  // Test 4: Stream endpoint
  console.log('4️⃣  Testing /stream endpoint');
  try {
    const res4 = await makeRequest(`/api/media/${publicId}/stream`);
    console.log(`   Status: ${res4.status}`);
    console.log(`   Location: ${res4.headers['location'] || 'NOT SET'}`);
    if (res4.status === 302 || res4.status === 301) {
      console.log(`   ✅ Stream redirect successful\n`);
    } else {
      console.log(`   ⚠️  Expected redirect, got ${res4.status}\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
  
  // Test 5: Invalid range request
  console.log('5️⃣  Testing invalid range request');
  try {
    const res5 = await makeRequest(`/api/media/${publicId}/file`, {
      'Range': 'bytes=999999999-'
    });
    console.log(`   Status: ${res5.status} (should be 416 for invalid range)`);
    if (res5.status === 416) {
      console.log(`   ✅ Invalid range handled correctly\n`);
    } else {
      console.log(`   ⚠️  Invalid range not properly handled\n`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
  
  console.log('✨ Test complete!');
}

// Run tests
if (process.argv.length < 3) {
  console.log('Usage: node test-media-streaming.js <publicId>');
  console.log('Example: node test-media-streaming.js abc123def');
  process.exit(1);
}

testEndpoint(process.argv[2]).catch(console.error);