# Taxi Scheduled Rides Test Cases

Use these with an authenticated customer/admin/driver session cookie.

## Customer: create scheduled ride

```http
POST /api/taxi/scheduled-rides
Content-Type: application/json

{
  "vehicleTypeId": "<vehicleTypeId>",
  "pickupAddress": "T Nagar, Chennai",
  "dropAddress": "Chennai Airport",
  "pickupLat": 13.0418,
  "pickupLng": 80.2341,
  "dropLat": 12.9941,
  "dropLng": 80.1709,
  "fare": 520,
  "distance": 14.8,
  "duration": 36,
  "scheduledPickupAt": "2026-05-06T09:30:00.000Z",
  "scheduledBookingFee": 25,
  "paymentMethod": "cash"
}
```

Expected: `201`, `bookingType: "scheduled"`, `status: "scheduled"`.

## Customer: view upcoming scheduled rides

```http
GET /api/taxi/scheduled-rides
```

Expected: only the authenticated user's scheduled rides, sorted by pickup time.

## Customer: reschedule

```http
PATCH /api/taxi/scheduled-rides/<rideId>/reschedule
Content-Type: application/json

{ "scheduledPickupAt": "2026-05-07T10:00:00.000Z" }
```

Expected: `rescheduledFrom` is stored and an audit event is written.

## Customer: cancel

```http
PATCH /api/taxi/scheduled-rides/<rideId>/cancel
Content-Type: application/json

{ "reason": "Plans changed" }
```

Expected: `status: "cancelled"`, `cancellationSource: "customer"`, `cancelledAt` set.

## Admin: assign driver

```http
PATCH /api/admin/taxi/scheduled-rides/<rideId>/assign
Content-Type: application/json

{ "driverId": "<driverId>" }
```

Expected: `status: "driver_assigned"`, `assignedAt` set, rider notification attempted.

## Admin: run assignment and notification check

```http
POST /api/admin/taxi/scheduled-rides/run-assignment-check
```

Expected: due scheduled rides within the assignment window are auto-assigned to nearest available approved drivers, and T-30/T-10 notification attempts are recorded in `taxi_scheduled_ride_events`.
