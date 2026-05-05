# 🚀 OTP System - Quick Start Testing Guide

## 5-Minute Quick Start

### 1. **Verify All Files Are In Place**

```bash
# Check backend
ls server/taxi-storage.ts          # Should exist ✅
ls server/taxi-routes.ts           # Should exist ✅
ls server/tests/taxi-otp.test.ts   # Should exist ✅

# Check frontend
ls client/src/pages/taxi/taxi-booking-page.tsx
ls client/src/pages/taxi/taxi-driver-dashboard.tsx

# Check docs
ls docs/OTP_VERIFICATION_SYSTEM.md
ls IMPLEMENTATION_OTP.md
```

### 2. **Run Validation Script**

```bash
node verify-otp-system.js
```

Expected output:
```
✅ Storage interface has createRideOtp
✅ Storage interface has getRideOtp
✅ Storage interface has linkOtpToDriver
✅ Storage interface has verifyRideOtp
✅ Storage interface has resendRideOtp
✅ Endpoint POST /api/taxi/verify-otp exists
✅ Endpoint POST /api/taxi/resend-otp exists
✅ Customer UI has OTP display component
✅ Driver UI has OTP verification modal
✅ Tests file exists with test cases
✅ Documentation files exist

All components verified! ✅
```

---

## 20-Minute Integration Test

### Setup

```bash
# 1. Start dev server
npm run dev

# 2. Open two browsers/tabs:
#    - TAB A: Customer view (http://localhost:5173)
#    - TAB B: Driver dashboard (http://localhost:5173/taxi-driver)
```

### Test Flow

#### Step 1: Customer Books Ride
```
TAB A:
1. Go to Taxi Booking page
2. Enter pickup location
3. Enter destination
4. Click "Book Ride"
5. ✅ EXPECTED: OTP displays in blue card below driver info
   Example: 1234
```

#### Step 2: Copy OTP
```
TAB A:
1. Click "Copy" button next to OTP
2. ✅ EXPECTED: "✓ Copied to clipboard" message appears for 2 seconds
3. Look at console - find line: "[TAXI] Ride OTP for testing: XXXX"
```

#### Step 3: Driver Accepts Ride
```
TAB B:
1. Go to Driver Dashboard
2. Find the ride in "Active Rides"
3. Click "Accept Ride"
4. Wait for status to change to "Arriving"
5. ✅ EXPECTED: Ride moves to "Arriving" section
```

#### Step 4: Driver Enters OTP
```
TAB B:
1. Click ride card in "Arriving" section
2. ✅ EXPECTED: Modal appears with title "Enter Customer OTP"
3. Modal has:
   - Input field (numeric only)
   - "Verify" button (disabled)
   - "Cancel" button
   - X close button
```

#### Step 5: Verify Correct OTP
```
TAB B:
1. Enter the OTP from TAB A (e.g., 1234)
2. ✅ EXPECTED: "Verify" button becomes enabled
3. Click "Verify"
4. ✅ EXPECTED: 
   - Modal closes
   - Toast shows "OTP verified successfully"
   - Ride moves to "In Progress" section
   - Ride status = "in_ride"
```

#### Step 6: Test Wrong OTP
```
Repeat Steps 3-4 with NEW ride:
1. Go back to TAB A and book new ride
2. Copy new OTP
3. Switch to TAB B and accept new ride
4. In modal, enter WRONG code (e.g., 9999)
5. Click Verify
6. ✅ EXPECTED:
   - Toast shows "Invalid OTP"
   - Modal stays open
   - Can try again
```

#### Step 7: Test Max Attempts
```
Repeat Step 6 three times with WRONG codes:
1. First wrong attempt → "Invalid OTP" (1/3 attempts)
2. Second wrong attempt → "Invalid OTP" (2/3 attempts)
3. Third wrong attempt → "Invalid OTP" (3/3 attempts)
4. Fourth wrong attempt → "Maximum attempts exceeded"
5. ✅ EXPECTED:
   - Can no longer enter OTP
   - Must resend OTP from customer side
```

#### Step 8: Test Resend OTP
```
TAB A (if available):
1. Look for "Resend OTP" button (or refresh booking page)
2. Click Resend
3. ✅ EXPECTED:
   - New OTP displayed
   - Counter resets to 0 attempts
   - Console shows: "[TAXI] Resent OTP for testing: XXXX"
```

#### Step 9: Test OTP Expiry
```
Advanced test - requires code modification:
1. In taxi-storage.ts, change expiry from 5 minutes to 5 seconds
2. Book new ride, get OTP
3. Wait 6 seconds
4. Try to verify OTP
5. ✅ EXPECTED: "OTP expired" error
```

---

## Validation Checklist

```
BACKEND VALIDATION:
☐ POST /api/taxi/rides includes OTP in response
☐ POST /api/taxi/verify-otp accepts request
☐ POST /api/taxi/verify-otp validates OTP correctly
☐ POST /api/taxi/resend-otp generates new OTP
☐ OTP stored in MongoDB taxi_ride_otps collection

CUSTOMER FRONTEND:
☐ OTP card appears after booking
☐ OTP displays in large 4-digit format
☐ Copy button works
☐ Copy feedback message appears
☐ Card disappears when ride completed/cancelled

DRIVER FRONTEND:
☐ Modal appears when ride status = "arriving"
☐ Input field numeric-only (no letters)
☐ Input limited to 4 characters
☐ Verify button disabled until 4 digits entered
☐ Cancel button closes modal
☐ X button closes modal
☐ Successful verify closes modal
☐ Error messages displayed properly

BUSINESS LOGIC:
☐ OTP generated on ride creation
☐ OTP linked to driver on assignment
☐ OTP verification updates ride status
☐ Attempts limited to 3
☐ Expired OTP rejected
☐ Already verified OTP returns success
☐ Wrong OTP increments attempts
```

---

## Debugging Tips

### Issue: OTP not visible in booking page

**Solution:**
1. Open browser console (F12)
2. Check network tab - look at POST /api/taxi/rides response
3. Search for `"otp"` field in response
4. If missing:
   - Check server console for "[TAXI] Ride OTP for testing: XXXX"
   - Check taxi-routes.ts lines 411-444
   - Verify createRideOtp() is being called

### Issue: Modal not appearing when driver arrives

**Solution:**
1. Check ride status changed to "arriving"
2. Check browser console for errors
3. Look for "setOtpModalRideId" in driver dashboard code
4. Try refreshing driver dashboard page
5. Check taxi-driver-dashboard.tsx lines 684-728

### Issue: Verify button not working

**Solution:**
1. Open browser console
2. Check network request to POST /api/taxi/verify-otp
3. Look for error response status and message
4. Check rideId matches between rides
5. Verify ride hasn't been completed/cancelled

### Issue: Getting "OTP not found" error

**Solution:**
1. Verify MongoDB is running
2. Check ride was created successfully
3. Look in MongoDB compass for taxi_ride_otps collection
4. Verify rideId exists in collection
5. Check connection string in .env

### Issue: Tests not running

**Solution:**
```bash
# Check vitest is installed
npm list vitest

# Run tests with npm
npm test -- server/tests/taxi-otp.test.ts

# Or run directly with vitest
npx vitest run server/tests/taxi-otp.test.ts

# Or use validation script instead
node verify-otp-system.js
```

---

## API Testing with cURL

### Create Ride with OTP
```bash
curl -X POST http://localhost:3000/api/taxi/rides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user123",
    "pickupLocation": "Start Point",
    "dropoffLocation": "End Point",
    "pickupLat": 12.9716,
    "pickupLng": 77.5946,
    "dropoffLat": 12.9352,
    "dropoffLng": 77.6245,
    "estimatedDuration": 30,
    "estimatedDistance": 15,
    "estimatedFare": 500
  }'

# Response should include:
# {
#   "ride": { ... },
#   "otp": "1234"  ← This is the OTP!
# }
```

### Verify OTP
```bash
curl -X POST http://localhost:3000/api/taxi/verify-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rideId": "ride123",
    "otp": "1234"
  }'

# Response: { "success": true }
```

### Resend OTP
```bash
curl -X POST http://localhost:3000/api/taxi/resend-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "rideId": "ride123" }'

# Response includes new OTP: { "otp": "5678" }
```

---

## MongoDB Verification

### Check OTP Collection

```bash
# Connect to MongoDB
mongosh

# Select database
use city_serve

# Check OTP records
db.taxi_ride_otps.find().pretty()

# Should see documents like:
# {
#   "_id": ObjectId("..."),
#   "rideId": "ride123",
#   "userId": "user123",
#   "driverId": "driver456",
#   "otp": "1234",
#   "isVerified": true,
#   "attempts": 1,
#   "expiresAt": ISODate("2026-04-29T12:45:30.000Z"),
#   "createdAt": ISODate("2026-04-29T12:40:30.000Z"),
#   "verifiedAt": ISODate("2026-04-29T12:42:15.000Z"),
#   "resendCount": 0
# }
```

### Useful Queries

```bash
# Find all OTPs for a ride
db.taxi_ride_otps.findOne({ rideId: "ride123" })

# Find verified OTPs
db.taxi_ride_otps.find({ isVerified: true })

# Find expired OTPs
db.taxi_ride_otps.find({ expiresAt: { $lt: new Date() } })

# Check recent OTP records
db.taxi_ride_otps.find({}).sort({ createdAt: -1 }).limit(5)
```

---

## Performance Testing

### Generate 100 OTPs and Measure

```javascript
// In Node.js/browser console:
const start = Date.now();
for (let i = 0; i < 100; i++) {
  fetch('/api/taxi/rides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* ride data */ })
  });
}
const end = Date.now();
console.log(`100 OTPs generated in ${end - start}ms`);
// Expected: < 500ms (< 5ms per OTP)
```

---

## Expected Test Results

### Successful Test Flow
```
✅ Customer books ride
✅ OTP displays in UI
✅ OTP copied to clipboard
✅ Driver accepts ride
✅ Driver sees OTP modal
✅ Driver enters correct OTP
✅ OTP verified successfully
✅ Ride status = "in_ride"
✅ Trip starts
```

### Error Handling
```
✅ Wrong OTP → Error message
✅ 3 wrong attempts → Locked
✅ Expired OTP → Expired message
✅ Already verified → Returns success
✅ Missing OTP → Not found error
```

---

## Final Checklist Before Production

```
☐ All manual tests passed
☐ Unit tests passing (npm test)
☐ No console errors
☐ No network errors (check Network tab)
☐ MongoDB data consistent
☐ Performance acceptable (< 100ms per operation)
☐ Error messages helpful
☐ Security controls working
☐ Documentation accurate
☐ Code reviewed
☐ Ready for staging deployment
```

---

## Support Contacts

If tests fail:
1. Check OTP_IMPLEMENTATION_VERIFICATION.md (detailed audit)
2. Check docs/OTP_VERIFICATION_SYSTEM.md (technical reference)
3. Review server/tests/otp-manual-test.ts (detailed steps)
4. Check server console for "[TAXI]" log messages
5. Check MongoDB taxi_ride_otps collection directly

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-29  
**Status**: Ready for QA Testing  
**Estimated Testing Time**: 20-30 minutes  
