# 🔍 API PAYLOAD DEBUG GUIDE - POST /api/taxi/rides

## STEP 1: Verify Frontend Payload

The frontend sends this payload when booking:

```javascript
{
  vehicleTypeId: "VALID_OBJECT_ID",    // ← CRITICAL: Must be valid MongoDB ObjectId
  driverId: "DRIVER_ID" || null,
  pickupAddress: "pickup address string",
  dropAddress: "drop address string",
  pickupLat: 19.0760,
  pickupLng: 72.8777,
  dropLat: 19.1234,
  dropLng: 72.9567,
  fare: 150,
  distance: 5.2,
  duration: 12,
  paymentMethod: "cash"
}
```

---

## 🎯 How to Check in Browser

### Method 1: DevTools Network Tab (Best)

1. **Open browser DevTools**
   - Windows/Linux: `Ctrl+Shift+I`
   - Mac: `Cmd+Option+I`

2. **Go to Network tab**

3. **Trigger a taxi booking**
   - Open booking page
   - Select vehicle type
   - Enter pickup location
   - Enter drop location
   - Click "Book Ride"

4. **Find the request**
   - Look for: `POST /api/taxi/rides`
   - Click it to view details

5. **Check the "Payload" section**
   ```
   Request Headers:
   POST /api/taxi/rides HTTP/1.1
   Content-Type: application/json
   
   Request Body (Payload):
   {
     "vehicleTypeId": "507f1f77bcf86cd799439011",  ← ✅ Valid ObjectId format
     "driverId": null,
     "pickupAddress": "123 Main St, Mumbai",
     "dropAddress": "456 Park Ave, Mumbai",
     "pickupLat": 19.0760,
     "pickupLng": 72.8777,
     "dropLat": 19.1234,
     "dropLng": 72.9567,
     "fare": 150,
     "distance": 5.2,
     "duration": 12,
     "paymentMethod": "cash"
   }
   ```

6. **Check Response**
   ```
   Status: 200 OK  ✅
   or
   Status: 404 Not Found  ❌ (vehicle type not found)
   ```

---

## ⚠️ Common Issues & Fixes

### ❌ Issue 1: vehicleTypeId is null or missing

```json
{
  "vehicleTypeId": null,  ← ❌ Problem
  "driverId": null,
  ...
}
```

**Why it happens:**
- Vehicle types haven't loaded yet
- Frontend didn't select a vehicle
- Database has no vehicle types

**Fix:**
```bash
# Seed vehicle types first
curl -X POST http://localhost:3000/api/admin/taxi/seed-vehicle-types \
  -H "Content-Type: application/json" \
  -d '{}'
```

Then refresh page and try again.

---

### ❌ Issue 2: vehicleTypeId has wrong format

```json
{
  "vehicleTypeId": "auto",  ← ❌ Wrong (should be ObjectId)
  "driverId": null,
  ...
}
```

**Why it happens:**
- Frontend is sending vehicle type name instead of ID
- Database ID is not being extracted properly

**Expected format:**
```json
{
  "vehicleTypeId": "507f1f77bcf86cd799439011",  ← ✅ ObjectId (24 hex chars)
  "driverId": null,
  ...
}
```

**Fix in code:**
Check `client/src/pages/taxi/taxi-home-page.tsx` line 252:
```typescript
vehicleTypeId: getDocumentId(selectedVehicle),  // ← Must extract _id correctly
```

---

### ❌ Issue 3: Missing required fields

```json
{
  "vehicleTypeId": "507f1f77bcf86cd799439011",
  "pickupAddress": "123 Main St",
  // Missing: dropAddress, lat/lng, fare, distance, duration
}
```

**Why it happens:**
- Frontend validation didn't catch missing fields
- User didn't complete form properly

**Fix:**
- Fill all fields before clicking "Book Ride"
- Check frontend validation in taxi-home-page.tsx line 247

---

### ✅ Issue 4: vehicleTypeId doesn't exist in DB

**Request looks good:**
```json
{
  "vehicleTypeId": "507f1f77bcf86cd799439011",  ← Correct format
  "pickupAddress": "123 Main St",
  ...
}
```

**But returns 404:**
```json
{
  "message": "Vehicle type not found"
}
```

**Why it happens:**
- ID is valid format but doesn't exist in `taxi_vehicle_types` collection
- Database wasn't seeded

**Fix:**
```bash
# Check what's in database
mongosh
use city_serve_hub
db.taxi_vehicle_types.find().pretty()

# If empty, seed it
curl -X POST http://localhost:3000/api/admin/taxi/seed-vehicle-types \
  -H "Content-Type: application/json" -d '{}'
```

---

## ✅ Expected Valid Payload

When everything works correctly:

```json
{
  "vehicleTypeId": "507f1f77bcf86cd799439011",
  "driverId": null,
  "pickupAddress": "123 Main St, Mumbai",
  "dropAddress": "456 Park Ave, Mumbai",
  "pickupLat": 19.0760,
  "pickupLng": 72.8777,
  "dropLat": 19.1234,
  "dropLng": 72.9567,
  "fare": 150,
  "distance": 5.2,
  "duration": 12,
  "paymentMethod": "cash"
}
```

**Response (Success):**
```json
{
  "_id": "ride_id_123",
  "userId": "user_id",
  "vehicleTypeId": "507f1f77bcf86cd799439011",
  "status": "searching",
  "otp": "1234",  ← OTP sent to driver
  "fare": 150,
  ...
}
```

---

## 🔧 Debugging Checklist

### Frontend Side
- [ ] Vehicle types loaded (check Network tab for GET /api/taxi/vehicle-types)
- [ ] Vehicle type is selected
- [ ] vehicleTypeId is not null
- [ ] vehicleTypeId is 24-character hex string (MongoDB ObjectId format)
- [ ] All location fields have coordinates
- [ ] Fare estimate calculated
- [ ] Pickup address not empty
- [ ] Drop address not empty

### Backend Side
- [ ] MongoDB running
- [ ] taxi_vehicle_types collection has documents (5 seeded)
- [ ] Server logs show POST /api/taxi/rides request
- [ ] getTaxiVehicleType() finds the vehicle
- [ ] No validation errors

### Database Side
```bash
# Check vehicle types exist
mongosh
use city_serve_hub
db.taxi_vehicle_types.count()  # Should be 5

# Check specific ID
db.taxi_vehicle_types.findOne({
  _id: ObjectId("507f1f77bcf86cd799439011")
})
```

---

## 🧪 Manual Testing

### Test 1: Check if vehicle types loaded
```bash
curl -X GET http://localhost:3000/api/taxi/vehicle-types
# Should return: [{ _id: "...", name: "Auto", ... }, ...]
```

### Test 2: Manual booking request
```bash
VEHICLE_ID=$(curl -s http://localhost:3000/api/taxi/vehicle-types | \
  jq -r '.[0]._id')

curl -X POST http://localhost:3000/api/taxi/rides \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d "{
    \"vehicleTypeId\": \"$VEHICLE_ID\",
    \"pickupAddress\": \"Test Pickup\",
    \"dropAddress\": \"Test Drop\",
    \"pickupLat\": 19.0760,
    \"pickupLng\": 72.8777,
    \"dropLat\": 19.1234,
    \"dropLng\": 72.9567,
    \"fare\": 100,
    \"distance\": 5,
    \"duration\": 10,
    \"paymentMethod\": \"cash\"
  }"
```

---

## 📋 Server-Side Validation

**File:** `server/taxi-routes.ts` (lines 330-340)

```typescript
const parsed = createRideSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    message: "Invalid request body",
    errors: parsed.error.errors,
  });
}

const { vehicleTypeId, distance, duration } = parsed.data;

const vehicleType = await taxiStorage.getTaxiVehicleType(vehicleTypeId);
if (!vehicleType) {
  return res.status(404).json({ message: "Vehicle type not found" });
}
```

**What it checks:**
1. ✅ All required fields present
2. ✅ vehicleTypeId is a valid string
3. ✅ vehicleTypeId exists in database

---

## 🎯 Summary

| Check | Expected | Issue if Not |
|-------|----------|-------------|
| GET vehicle types | Returns 5 items | Types not seeded |
| vehicleTypeId in payload | `507f1f77bcf86cd799439011` | ID extraction failed |
| vehicleTypeId in DB | Exists | Database empty |
| Booking POST response | 200 OK + ride data | 404 error |

---

**If you're still getting 404 after these checks, use this exact curl command to verify:**

```bash
# Get first vehicle type ID
VEHICLE_ID=$(curl -s http://localhost:3000/api/taxi/vehicle-types | jq -r '.[0]._id')
echo "Using vehicle: $VEHICLE_ID"

# Verify it exists
mongosh --eval "
  db.getSiblingDB('city_serve_hub').taxi_vehicle_types.findOne({
    _id: ObjectId('$VEHICLE_ID')
  })
"
```

If this shows the vehicle, check the booking request payload in DevTools Network tab!
