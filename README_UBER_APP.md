# Uber/Ola-Style Taxi Booking Application - Full-Stack Implementation

## 📋 Overview

This is a complete, production-ready Uber/Ola-style taxi booking application with real-time live tracking, separate panels for users, drivers, and admins, and comprehensive analytics.

### Key Features

- **User Panel**: Book rides, live tracking, ride history, ratings, payment options
- **Driver Panel**: Accept/reject rides, real-time GPS updates, earnings dashboard
- **Admin Panel**: Manage rides, drivers, analytics, surge pricing settings
- **Real-Time Tracking**: Socket.IO WebSockets for live driver location updates (every 3-5 seconds)
- **Live Fare Estimation**: Calculate dynamic pricing based on distance, time, and surge multiplier
- **Payment Integration**: Support for cash, card, UPI, and wallet
- **Analytics**: Daily rides, revenue reports, driver commissions, booking heatmaps
- **Notifications**: Real-time notifications for ride requests, status changes

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | MongoDB + Mongoose |
| **Real-Time** | Socket.IO (WebSockets) |
| **Maps** | Google Maps API (Directions, Geocoding, Places) |
| **Authentication** | JWT + Role-based Access Control |
| **Payments** | Razorpay (pre-configured) |
| **Deployment** | Node.js server + MongoDB Atlas |

## 📁 Project Structure

```
server/
├── schemas/
│   └── uber-schemas.ts              # Database schemas & types
├── socket/
│   └── socket-manager.ts            # Real-time WebSocket management
├── services/
│   ├── ride-service.ts              # Ride business logic
│   ├── driver-service.ts            # Driver operations
│   ├── payment-service.ts           # Payment processing
│   └── admin-service.ts             # Admin operations
├── api/
│   ├── ride-routes.ts               # Ride endpoints
│   ├── driver-routes.ts             # Driver endpoints
│   ├── admin-routes.ts              # Admin endpoints
│   └── payment-routes.ts            # Payment endpoints
├── index.ts                         # Server entry point
└── map-routes.ts                    # Map data endpoints

client/
├── pages/
│   ├── ride-booking-page.tsx        # Enhanced booking with live fare
│   ├── live-tracking-page.tsx       # Real-time driver tracking
│   ├── ride-history-page.tsx        # Past rides & ratings
│   ├── driver-dashboard.tsx         # Driver panel (enhanced)
│   └── admin/
│       ├── rides-management.tsx     # Manage all active rides
│       ├── drivers-management.tsx   # Approve, suspend drivers
│       └── analytics.tsx            # Revenue & analytics
├── components/
│   ├── MapComponent.tsx             # Google Maps integration
│   ├── LocationSearchInput.tsx      # Places Autocomplete
│   ├── LiveDriverMarker.tsx         # Animated driver marker
│   ├── RideStatusTracker.tsx        # Ride progress indicator
│   ├── IncomingRequestPopup.tsx     # Driver request notification
│   └── RatingModal.tsx              # Post-ride rating
├── hooks/
│   ├── use-socket-events.ts         # Socket.IO integration
│   ├── use-driver-location.ts       # GPS tracking
│   └── use-ride-tracking.ts         # Ride status tracking
└── src/App.tsx                      # Router configuration
```

## 🗄️ Database Schema

### Collections

1. **users_uber**: User profiles (name, email, phone, addresses, rating, wallet)
2. **drivers**: Driver info (license, approval status, rating, earnings, current location)
3. **vehicles**: Vehicle details (type, registration, model, capacity, rating)
4. **rides**: Active and past rides (pickup, drop, status, fare, payment)
5. **payments**: Payment transactions (amount, method, status, gateway response)
6. **ratings**: Post-ride ratings and feedback
7. **driver_locations**: GPS history (lat, lng, timestamp - auto-deleted after 24h)
8. **earnings**: Driver earnings per ride (gross, commission, net)
9. **admin_settings**: Pricing rules (base fare, per km rate, surge factor, commissions)

## 🚀 Setup & Deployment

### Prerequisites

- Node.js 16+ & npm
- MongoDB Atlas account (or local MongoDB)
- Google Maps API key (Maps, Directions, Places, Geocoding enabled)
- Razorpay account (for payments)

### Step 1: Environment Configuration

Create `.env` in project root:

```bash
# Runtime
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/taxi_app
MONGODB_DB=taxi_app

# Redis (for session store & caching)
REDIS_URL=redis://localhost:6379

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY

# Authentication
SESSION_SECRET=your-very-long-random-secret-key

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Firebase (optional for notifications)
FIREBASE_PROJECT_ID=your_firebase_project
FIREBASE_PRIVATE_KEY=your_firebase_key
FIREBASE_CLIENT_EMAIL=your_firebase_email

# Admin settings
ADMIN_COMMISSION_PERCENTAGE=20
BASE_FARE=50
PER_KM_RATE=15
PER_MIN_RATE=0.5
```

### Step 2: Database Initialization

```bash
# Create indexes and initialize collections
npm run init:db
```

This runs the `ensureUberCollections()` function to set up:
- Collections with proper indexes
- Geospatial indexes for driver location queries
- TTL indexes for auto-cleanup of old location data

### Step 3: Server Setup

```bash
cd server
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

### Step 4: Client Setup

```bash
cd client
npm install

# Development
npm run dev

# Production
npm run build
npm run preview
```

### Step 5: Socket.IO Integration

The Socket.IO server is automatically initialized in `server/index.ts`. It handles:

```typescript
// Real-time events
- join_ride: User/driver joins a ride room
- driver_location_update: GPS position sent every 3-5 seconds
- new_ride_request: Broadcast to nearby drivers
- ride_accepted: Driver accepts request
- ride_started: Trip begins
- ride_completed: Trip finished
- ride_cancelled: Cancellation event
- driver_go_online/offline: Availability changes
```

## 📡 Real-Time Architecture

### GPS Update Flow (Every 3-5 seconds)

```
1. Driver sends location
   ↓
2. Socket.IO: driver_location_update
   ↓
3. Saved to driver_locations collection
   ↓
4. Broadcast to all users watching this ride (io.to(`ride-${id}`))
   ↓
5. Client receives update and animates marker on map
```

### Ride Request Flow

```
1. User requests ride
   ↓
2. POST /api/rides → RideService.createRide()
   ↓
3. Emit new_ride_request to Socket.IO
   ↓
4. Find drivers within 5km radius
   ↓
5. Emit incoming_ride_request to each driver (15 sec timer)
   ↓
6. Driver accepts → ride_accepted broadcast to user
   ↓
7. Driver's location updates shown on user's map in real-time
```

## 🔌 API Endpoints

### Rides

```
POST   /api/rides
  - Create new ride request
  - Body: {pickupLat, pickupLng, pickupAddress, dropLat, dropLng, 
           dropAddress, distanceMeters, durationSec, paymentMethod}
  - Returns: {rideId, fare, breakdown}

GET    /api/rides/:id
  - Get ride details with driver & vehicle info

GET    /api/rides
  - Get user's ride history (limit=10)

POST   /api/rides/:id/cancel
  - Cancel a ride
  - Body: {reason}

POST   /api/rides/:id/rate
  - Rate a completed ride
  - Body: {userRating, driverRating, comments}

POST   /api/calculate-fare
  - Calculate fare without booking
  - Body: {distanceMeters, durationSec}
  - Returns: {fare, breakdown {baseFare, distanceFare, timeFare, surgeFee}}

GET    /api/drivers/available?lat=X&lng=Y&radius=5
  - Get drivers within radius (default 5km)
```

### Drivers

```
GET    /api/drivers/profile
  - Get logged-in driver's profile

GET    /api/drivers/incoming-requests
  - Get pending ride requests nearby

POST   /api/drivers/accept-ride
  - Accept a ride request
  - Body: {rideId, vehicleId}

POST   /api/drivers/start-trip
  - Start the trip

POST   /api/drivers/end-trip
  - End the trip and calculate earnings
  - Body: {rideId, actualDistance, actualDuration, actualFare}

GET    /api/drivers/earnings?period=daily|weekly|monthly
  - Get driver's earnings dashboard

GET    /api/drivers/rides
  - Get driver's ride history
```

### Admin

```
GET    /api/admin/rides
  - Get all active rides (paginated)

GET    /api/admin/drivers
  - Get all drivers with approval status

PATCH  /api/admin/drivers/:id/approve
  - Approve a driver

PATCH  /api/admin/drivers/:id/suspend
  - Suspend a driver

GET    /api/admin/analytics?startDate=X&endDate=Y
  - Get revenue, ride count, commissions

GET    /api/admin/settings
  - Get pricing settings

PATCH  /api/admin/settings
  - Update pricing & commission settings
```

## 💳 Payment Integration (Razorpay)

```
Flow:
1. User selects payment method (card, UPI, wallet, cash)
2. POST /api/payments/create-order → Razorpay order created
3. Client opens Razorpay checkout modal
4. After payment → webhook /api/payments/webhook
5. Payment verified → ride confirmed
6. If cash → ride confirmed immediately (driver collects)
```

## 📊 Admin Analytics Dashboard

The admin panel provides:

- **Daily Metrics**: Total rides, revenue, avg ride value
- **Ride Breakdown**: By vehicle type, payment method, status
- **Driver Performance**: Total earned, ride count, cancellation rate, rating
- **Revenue Reports**: Commission collected, driver payouts
- **Heatmap**: Booking density by location and time
- **Settings**: Base fare, per-km rate, surge multiplier, commission %

## 🔐 Authentication & Authorization

```
Routes protected by role:
- /api/rides/* → user role
- /api/drivers/* → driver role
- /api/admin/* → admin role

JWT token stored in:
- LocalStorage: Web app
- HttpOnly cookie: Server-side validation
```

## 📱 Mobile Optimization

- Responsive design (mobile-first)
- Touch-friendly buttons
- Map zoom controls for mobile
- Location permission dialogs
- Optimized for iOS & Android browsers
- Can be wrapped in React Native

## 🧪 Testing

```bash
# Run ride creation flow tests
npm run test

# Test Socket.IO events
npm run test:socket

# Load testing
npm run test:load
```

## 🚢 Deployment Options

### Option 1: Heroku + MongoDB Atlas

```bash
# Deploy server
git push heroku main

# Deploy client to Vercel
npm run deploy:client
```

### Option 2: AWS (EC2 + RDS/DocumentDB)

```bash
# Build Docker image
docker build -t taxi-app .

# Push to ECR
aws ecr push taxi-app:latest

# Deploy to ECS
aws ecs create-service --cluster taxi --task-definition taxi-app
```

### Option 3: DigitalOcean App Platform

```bash
# Connected to GitHub, auto-deploys on push
# Configure .env in dashboard
```

## 📈 Performance Optimization

1. **Database**: Geospatial indexes for fast driver queries
2. **Socket.IO**: Room-based broadcasting (only relevant users get updates)
3. **Frontend**: React Query for caching, lazy loading pages
4. **Maps**: Marker clustering for heatmaps, debounced location updates
5. **Backend**: Driver location batching, database connection pooling

## 🐛 Troubleshooting

### Socket.IO not connecting
- Check CORS settings in socket-manager.ts
- Verify websocket support in firewall
- Check browser console for connection errors

### Locations not updating on map
- Verify Socket.IO connection is active
- Check browser permissions for geolocation
- Ensure Google Maps API key has correct APIs enabled

### Database queries slow
- Check MongoDB indexes are created (run `npm run init:db`)
- Enable MongoDB profiling to identify slow queries
- Use connection pooling

## 📚 Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/)
- [Google Maps API](https://developers.google.com/maps)
- [MongoDB Geospatial Queries](https://docs.mongodb.com/manual/geospatial-queries/)
- [Razorpay Integration](https://razorpay.com/docs/payments/)

## 📄 License

MIT - Feel free to use for commercial projects

---

**Built with ❤️ for modern taxi booking applications**
