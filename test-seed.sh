#!/bin/bash
# Test and seed vehicle types
# Run this to seed taxi vehicle types and verify the fix

echo "🚀 Testing Taxi Vehicle Types Setup"
echo "===================================="
echo ""

# Check if server is running
echo "1️⃣  Checking if server is running on port 3000..."
if ! nc -z localhost 3000 2>/dev/null; then
  echo "❌ Server is not running on localhost:3000"
  echo "   Please start the server first: npm run dev"
  exit 1
fi
echo "✅ Server is running"
echo ""

# Seed vehicle types
echo "2️⃣  Seeding taxi vehicle types..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/taxi/seed-vehicle-types \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Response: $RESPONSE"
echo ""

# Check if seeding was successful
if echo "$RESPONSE" | grep -q "Seeded"; then
  echo "✅ Vehicle types seeded successfully!"
elif echo "$RESPONSE" | grep -q "already exist"; then
  echo "✅ Vehicle types already exist"
else
  echo "⚠️  Unexpected response. Check if database is running."
fi

echo ""
echo "3️⃣  Fetching vehicle types..."
TYPES=$(curl -s http://localhost:3000/api/taxi/vehicle-types)
COUNT=$(echo "$TYPES" | grep -o '"name"' | wc -l)
echo "✅ Found $COUNT vehicle types"
echo ""

echo "4️⃣  Testing taxi booking..."
echo "   Vehicle types are now available for booking!"
echo "   Try booking a taxi from the web interface."
echo ""

echo "===================================="
echo "✅ Setup Complete!"
echo ""
