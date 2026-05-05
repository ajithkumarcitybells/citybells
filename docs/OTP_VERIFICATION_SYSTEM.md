# Taxi OTP Verification System

## Overview

Complete OTP (One-Time Password) verification system for taxi rides, similar to Ola/Uber. This system ensures that the customer and driver can verify each other's identity before starting the ride.

## Features

- ✅ **OTP Generation**: 4-digit OTP automatically generated when ride is booked
- ✅ **5-Minute Expiry**: OTP expires after 5 minutes
- ✅ **Attempt Limiting**: Maximum 3 verification attempts
- ✅ **Driver Linking**: OTP linked to driver when they accept the ride
- ✅ **Automatic Status Update**: Ride status changes to "in_ride" on successful verification
- ✅ **OTP Resend**: Customers can request new OTP (regenerates code and resets expiry)
- ✅ **User Display**: OTP shown to customer in booking confirmation
- ✅ **Driver Input**: Driver can enter OTP in mobile app to verify and start ride

## Database Schema

### Collection: `taxi_ride_otps`

```javascript
{
  _id: ObjectId,
  rideId: string,              // Reference to taxi_rides collection
  userId: string,              // Customer user ID
  driverId: string | null,     // Driver ID (set when driver accepts ride)
  otp: string,                 // 4-digit OTP code
  isVerified: boolean,         // Verification status
  attempts: number,            // Failed verification attempts (max 3)
  expiresAt: Date,            // OTP expiry time (5 minutes)
  verifiedAt: Date | null,     // Timestamp when OTP was verified
  resendCount: number,        // Count of resend requests
  createdAt: Date             // Creation timestamp
}
```

## API Endpoints

### 1. Create Ride (POST `/api/taxi/rides`)
**When**: User books a new ride
**Action**: Automatically generates OTP and creates record

**Response**:
```javascript
{
  id: "ride123",
  userId: "user456",
  status: "searching",
  otp: "1234",  // TEMP: For testing (removed in production)
  pickupAddress: "...",
  dropAddress: "...",
  estimatedFare: "250",
  ...
}
```

### 2. Verify OTP (POST `/api/taxi/verify-otp`)
**When**: Driver enters customer's OTP
**Body**:
```javascript
{
  rideId: "ride123",
  otp: "1234"
}
```

**Response on Success**:
```javascript
{
  success: true,
  message: "OTP verified successfully"
}
```

**Response on Error**:
```javascript
{
  success: false,
  message: "Invalid OTP" | "OTP expired" | "Maximum attempts exceeded" | "OTP not found"
}
```

**Validation Rules**:
- OTP must be exactly 4 digits
- OTP must match the stored code
- OTP must not be expired
- Maximum 3 failed attempts
- Updates ride status to "in_ride" on success

### 3. Resend OTP (POST `/api/taxi/resend-otp`)
**When**: Customer requests new OTP
**Body**:
```javascript
{
  rideId: "ride123"
}
```

**Response**:
```javascript
{
  success: true,
  otp: "5678"  // New OTP code (TEMP: For testing)
}
```

## User Flow

### Customer Side

1. **Book Ride**
   - Customer enters pickup/drop locations
   - Selects vehicle type
   - Confirms booking

2. **Receive OTP**
   - OTP is generated (4-digit code)
   - Displayed prominently in blue card
   - "Share with driver" instruction shown
   - Copy-to-clipboard button for easy sharing

3. **Share with Driver**
   - Communicates OTP to driver verbally or through app
   - OTP is valid for 5 minutes
   - Can request resend if expired

### Driver Side

1. **Accept Ride**
   - Driver views ride request
   - Changes status to "driver_assigned"
   - OTP is now linked to driver

2. **Arrive at Pickup**
   - Driver changes status to "arriving"
   - "Enter Customer OTP" button appears (modal)

3. **Verify OTP**
   - Driver enters 4-digit OTP customer shared
   - System validates OTP
   - On success: Trip starts (status → "in_ride")
   - On error: Shows error message, retries allowed

## Security Considerations

### Current Implementation
- ✅ 4-digit OTP (1000-9999 range)
- ✅ 5-minute expiry
- ✅ Max 3 attempts per OTP
- ✅ OTP reset on resend
- ✅ Driver ID verification (OTP only works for assigned driver)

### Production Recommendations
- [ ] **Remove OTP from API responses** - Currently included for testing/development
- [ ] **SMS Integration** - Send OTP via SMS (Twilio/Fast2SMS)
- [ ] **Rate Limiting** - Limit resend requests (max 3 per ride)
- [ ] **Encryption** - Encrypt OTP in database
- [ ] **Audit Logging** - Log all OTP attempts
- [ ] **Blacklist Mechanism** - Prevent rapid resends

## Testing

### Unit Tests
Tests are in `server/tests/taxi-otp.test.ts`:
- OTP creation on ride booking
- Driver linking to OTP
- Invalid OTP rejection
- Max attempts enforcement
- Successful OTP verification
- Expired OTP rejection
- OTP resend functionality

### Manual Testing Checklist

```
1. Create Ride
   [ ] OTP generated (4 digits)
   [ ] OTP stored in database
   [ ] OTP shown in response
   [ ] Ride status = "searching"

2. Driver Accepts Ride
   [ ] Driver status changes to "driver_assigned"
   [ ] OTP linked to driver ID
   [ ] Driver ID now associated with OTP

3. Driver Verifies OTP
   [ ] Valid OTP accepted
   [ ] Ride status changes to "in_ride"
   [ ] isVerified flag set to true
   [ ] verifiedAt timestamp recorded

4. Invalid Attempts
   [ ] Wrong OTP rejected
   [ ] Attempts counter incremented
   [ ] After 3 failed attempts, further attempts blocked

5. Expiry
   [ ] OTP expires after 5 minutes
   [ ] Expired OTP rejected with specific message
   [ ] User can request resend

6. Resend OTP
   [ ] New OTP generated
   [ ] Old OTP invalidated
   [ ] Attempts counter reset to 0
   [ ] resendCount incremented
```

## Frontend Components

### User Booking Page (`taxi-booking-page.tsx`)

**OTP Display Card** (shown when ride has OTP and not completed/cancelled):
- Large 4-digit OTP display
- Copy-to-clipboard button
- "Share with driver" instruction
- Blue-colored info card

### Driver Dashboard (`taxi-driver-dashboard.tsx`)

**OTP Input Modal** (triggered for "arriving" status rides):
- Modal overlay with semi-transparent background
- 4-digit input field (numeric only)
- Cancel button to dismiss
- Verify button (enabled only when 4 digits entered)
- Error/success feedback

## Ride Status Flow

```
booking
  ↓
searching → (when driver accepts)
  ↓
driver_assigned → (when driver starts heading to pickup)
  ↓
arriving → (OTP verification happens here)
  ↓
in_ride (after OTP verified) → (ride in progress)
  ↓
completed → (ride finished, rating available)
```

## Future Enhancements

1. **Multi-language SMS** - Support multiple languages for SMS OTP
2. **Biometric Verification** - Add fingerprint/face verification
3. **Real-time Notifications** - WebSocket notifications for OTP expiry
4. **Analytics** - Track OTP success/failure rates
5. **Adaptive Security** - Increase security for high-risk routes
6. **Offline OTP** - QR code or NFC for offline verification
7. **Driver Verification** - Require driver to show OTP match before proceeding

## Environment Variables

```env
# Optional: OTP Configuration
OTP_LENGTH=4                    # Default: 4
OTP_EXPIRY_MINUTES=5           # Default: 5
OTP_MAX_ATTEMPTS=3             # Default: 3
OTP_MAX_RESENDS=3              # Future: limit resends
```

## Error Handling

| Error | HTTP Status | Message |
|-------|------------|---------|
| Invalid OTP format | 400 | "OTP must be 4 digits" |
| OTP not found | 404 | "OTP not found" |
| Invalid OTP | 400 | "Invalid OTP" |
| Expired OTP | 400 | "OTP expired" |
| Max attempts exceeded | 400 | "Maximum attempts exceeded" |
| Already verified | 200 | Returns success (idempotent) |
| Ride not found | 404 | "Ride not found" |
| Not authorized | 403 | "Not authorized" |

## Audit Trail Example

```javascript
// From logs:
[TAXI] Ride OTP for testing: 4627           // OTP generated
[Taxi] Resent OTP for testing: 8934         // OTP resent
POST /api/taxi/verify-otp - Success         // OTP verified
```

## Notes

- OTP is currently included in API responses for development/testing
- In production, remove OTP from responses and use SMS delivery
- System is idempotent: verifying already-verified OTP returns success
- Driver must be assigned to ride before OTP verification attempts
- OTP attempts are not shared across resends (resets to 0)

