#!/usr/bin/env node
/**
 * OTP System Manual Testing Guide
 * 
 * This script documents the steps to manually test the OTP verification system.
 * Run against a development server at http://localhost:3000
 */

const baseUrl = "http://localhost:3000";

// Helper function to make API requests
async function request(method: string, path: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      // Add auth token if available
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    console.error(`Request failed: ${method} ${path}`, error);
    throw error;
  }
}

async function runTests() {
  console.log("🧪 OTP Verification System - Manual Test Suite\n");
  console.log("Prerequisites:");
  console.log("- Server running on http://localhost:3000");
  console.log("- User authenticated (auth token in header)");
  console.log("- Test vehicle type exists\n");

  let rideId = "";
  let testOtp = "";

  try {
    // Test 1: Create a ride (generates OTP)
    console.log("📌 Test 1: Create Ride (OTP Generation)");
    console.log("POST /api/taxi/rides");
    console.log("Body: { vehicleTypeId, pickupAddress, dropAddress, ... }");
    console.log("Expected Response:");
    console.log("  - status: 201");
    console.log("  - includes otp field (4 digits)");
    console.log("  - ride.status = 'searching'\n");

    // Test 2: Get ride with OTP
    console.log("📌 Test 2: Retrieve Ride (Shows OTP to Customer)");
    console.log("GET /api/taxi/rides/:id");
    console.log("Expected Response:");
    console.log("  - status: 200");
    console.log("  - includes otp field");
    console.log("  - can be displayed in booking page\n");

    // Test 3: Verify OTP with wrong code
    console.log("📌 Test 3: Verify OTP - Wrong Code");
    console.log("POST /api/taxi/verify-otp");
    console.log("Body: { rideId, otp: '9999' }");
    console.log("Expected Response:");
    console.log("  - status: 400");
    console.log("  - message: 'Invalid OTP'");
    console.log("  - attempts incremented in database\n");

    // Test 4: Verify OTP - Correct Code
    console.log("📌 Test 4: Verify OTP - Correct Code");
    console.log("POST /api/taxi/verify-otp");
    console.log("Body: { rideId, otp: '<actual otp from create>' }");
    console.log("Expected Response:");
    console.log("  - status: 200");
    console.log("  - success: true");
    console.log("  - ride status updated to 'in_ride'");
    console.log("  - database: isVerified = true, verifiedAt = now\n");

    // Test 5: Verify Already Verified OTP (Idempotent)
    console.log("📌 Test 5: Verify Already Verified OTP (Idempotency)");
    console.log("POST /api/taxi/verify-otp");
    console.log("Body: { rideId, otp: '<same correct otp>' }");
    console.log("Expected Response:");
    console.log("  - status: 200");
    console.log("  - success: true (returns same as before)\n");

    // Test 6: Resend OTP
    console.log("📌 Test 6: Resend OTP");
    console.log("POST /api/taxi/resend-otp");
    console.log("Body: { rideId }");
    console.log("Expected Response:");
    console.log("  - status: 200");
    console.log("  - success: true");
    console.log("  - returns new otp code");
    console.log("  - database: new otp, attempts=0, resendCount++\n");

    // Test 7: OTP Expiry
    console.log("📌 Test 7: Verify Expired OTP");
    console.log("Manually set expiresAt to past time in database:");
    console.log("  db.taxi_ride_otps.updateOne({rideId}, {$set: {expiresAt: ISODate('2020-01-01')}})");
    console.log("POST /api/taxi/verify-otp");
    console.log("Expected Response:");
    console.log("  - status: 400");
    console.log("  - message: 'OTP expired'\n");

    // Test 8: Max Attempts
    console.log("📌 Test 8: Verify - Max Attempts Exceeded");
    console.log("Make 3 failed OTP attempts:");
    console.log("  1. POST /api/taxi/verify-otp with wrong OTP → attempts = 1");
    console.log("  2. POST /api/taxi/verify-otp with wrong OTP → attempts = 2");
    console.log("  3. POST /api/taxi/verify-otp with wrong OTP → attempts = 3");
    console.log("  4. POST /api/taxi/verify-otp → status 400, 'Maximum attempts exceeded'\n");

    console.log("✅ Test Suite Complete!");
    console.log("\n📝 Database Queries for Verification:\n");

    console.log("1. View OTP record:");
    console.log("   db.taxi_ride_otps.findOne({rideId: '<rideId>'})");

    console.log("\n2. View all OTP attempts for ride:");
    console.log("   db.taxi_ride_otps.find({rideId: '<rideId>'}).pretty()");

    console.log("\n3. Check ride status:");
    console.log("   db.taxi_rides.findOne({_id: '<rideId>'})");

    console.log("\n4. View OTP statistics:");
    console.log("   db.taxi_ride_otps.aggregate([");
    console.log("     {$group: {");
    console.log("       _id: null,");
    console.log("       total: {$sum: 1},");
    console.log("       verified: {$sum: {$cond: ['$isVerified', 1, 0]}},");
    console.log("       avgAttempts: {$avg: '$attempts'}");
    console.log("     }}");
    console.log("   ])");

    console.log("\n🔍 Common Issues & Solutions:\n");

    console.log("Issue: OTP field missing in ride response");
    console.log("Solution: Check that createRideOtp() was called in ride creation endpoint");
    console.log("          Verify OTP is returned in response (currently for testing)\n");

    console.log("Issue: Verify OTP returns 'OTP not found'");
    console.log("Solution: Ensure OTP was created before attempting verification");
    console.log("          Check rideId matches between create and verify calls\n");

    console.log("Issue: OTP verifies but ride status doesn't change");
    console.log("Solution: Check updateTaxiRideStatus() is called in verifyRideOtp()");
    console.log("          Verify ride exists with correct ID in taxi_rides collection\n");

    console.log("Issue: Cannot enter OTP in driver UI");
    console.log("Solution: Modal is shown when ride status = 'arriving'");
    console.log("          Update ride status to 'arriving' first");
    console.log("          Check otpModalRideId state is set\n");

  } catch (error) {
    console.error("❌ Test error:", error);
    process.exit(1);
  }
}

runTests().catch(console.error);
