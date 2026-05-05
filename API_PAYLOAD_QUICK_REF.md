# 🚀 QUICK REFERENCE: API Payload Verification

## 30-Second Check

**Open DevTools** → **Network tab** → **Book taxi** → **Find "POST /api/taxi/rides"** → **Check Payload**

---

## ✅ What You Should See

```json
{
  "vehicleTypeId": "507f1f77bcf86cd799439011",  ← 24 hex chars (MongoDB ID)
  "driverId": null,
  "pickupAddress": "123 Main St",
  "dropAddress": "456 Park Ave",
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

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `vehicleTypeId: null` | No vehicles loaded | Seed: `curl -X POST http://localhost:3000/api/admin/taxi/seed-vehicle-types -H "Content-Type: application/json" -d '{}'` |
| `vehicleTypeId: "auto"` | Wrong format | Should be ObjectId (24 hex chars) |
| Missing fields | Incomplete form | Fill all fields before booking |
| 404 Vehicle type not found | DB doesn't have ID | Check DB: `db.taxi_vehicle_types.count()` |
| Response: 500 | Server error | Check server logs |

---

## 🧪 Quick Verification

**Check vehicle types in DB:**
```bash
mongosh
use city_serve_hub
db.taxi_vehicle_types.count()  # Should be 5
```

**Get valid vehicle ID for manual test:**
```bash
VEHICLE_ID=$(curl -s http://localhost:3000/api/taxi/vehicle-types | jq -r '.[0]._id')
echo $VEHICLE_ID
```

**Manual booking test:**
```bash
curl -X POST http://localhost:3000/api/taxi/rides \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "vehicleTypeId": "507f1f77bcf86cd799439011",
    "pickupAddress": "Test",
    "dropAddress": "Test",
    "pickupLat": 19.0760,
    "pickupLng": 72.8777,
    "dropLat": 19.1234,
    "dropLng": 72.9567,
    "fare": 100,
    "distance": 5,
    "duration": 10,
    "paymentMethod": "cash"
  }'
```

---

## 📊 Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | ✅ Success | Ride booked! |
| 400 | ❌ Invalid payload | Check payload format |
| 404 | ❌ Vehicle type not found | Seed types or check ID |
| 500 | ❌ Server error | Check server logs |

---

## 🎯 Success Indicators

- ✅ Response status: **200**
- ✅ Response contains `_id` (ride ID)
- ✅ Response contains `otp` (4-digit code)
- ✅ Response `status` = "searching"
- ✅ No error messages

---

## For More Details
See `API_PAYLOAD_DEBUG_GUIDE.md` for comprehensive debugging guide.
