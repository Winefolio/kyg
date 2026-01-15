#!/bin/bash

echo "🔍 Quick Session Join Test"
echo "========================="

# Check if there are any active sessions
echo -e "\n1️⃣ Checking for active sessions..."
curl -s http://localhost:5000/api/sessions | jq '.[] | select(.status == "active") | {id, short_code, status}' || echo "No sessions found"

# Try to join with a test UUID
echo -e "\n2️⃣ Testing join with UUID format..."
TEST_UUID="00000000-0000-0000-0000-000000000000"
curl -X POST http://localhost:5000/api/sessions/$TEST_UUID/participants \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test User",
    "email": "test@example.com",
    "isHost": false
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq . || echo "Failed to parse response"

# Try to join with a test short code
echo -e "\n3️⃣ Testing join with short code format..."
TEST_CODE="ABC123"
curl -X POST http://localhost:5000/api/sessions/$TEST_CODE/participants \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test User 2",
    "email": "test2@example.com",
    "isHost": false
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq . || echo "Failed to parse response"

echo -e "\n✅ Test complete. Check server logs for detailed error messages."