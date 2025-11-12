#!/bin/bash

echo "🔍 Testing API Server..."
echo ""

# Check if port 3000 is in use
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Port 3000 is in use"
    PID=$(lsof -ti:3000)
    echo "   Process ID: $PID"
    ps -p $PID -o command= | head -1
else
    echo "❌ Port 3000 is NOT in use"
    echo "   API server is not running!"
    echo ""
    echo "   To start it, run:"
    echo "   npm run dev:api"
fi

echo ""
echo "Testing API endpoint..."
response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}' 2>&1)

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
    echo "✅ API is responding (HTTP $http_code)"
    echo "   Response: $body"
else
    echo "❌ API is NOT responding"
    echo "   HTTP Code: $http_code"
    echo "   Error: $body"
fi

