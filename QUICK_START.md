# 🚀 Quick Start Guide - Uber/Ola Taxi App

## ⚡ 5-Minute Setup

### 1. Clone & Install
```bash
cd "c:\city services\City-Serve-Hub-Dev\City-Serve-Hub-Dev"
npm install
```

### 2. Configure Environment
Create `.env` with:
```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
RAZORPAY_KEY_ID=rzp_test_XXXXX
RAZORPAY_KEY_SECRET=test_secret
MONGODB_URI=mongodb://localhost:27017/taxi_app
```

### 3. Start Servers
```bash
# Terminal 1
npm run dev  # Starts both client & server

# OR Terminal 1 & 2 separately
cd server && npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2
```

### 4. Access Application
- 🌐 Client: http://localhost:5173
- 🔌 Server: http://localhost:3000
- 🗄️ Admin: http://localhost:5173/admin/uber/analytics

---

## 👥 Test Accounts

### User Account
- Email: `user@example.com`
- Password: `password123`
- Role: User

### Driver Account  
- Email: `driver@example.com`
- Password: `password123`
- Role: Driver

### Admin Account
- Email: `admin@example.com`
- Password: `password123`
- Role: Admin

---

## 📍 Test Flows

### 1. **User Booking Flow** (3 min)
1. Go to http://localhost:5173/map
2. Click on map to set pickup
3. Click to set dropoff
4. See live fare estimate
5. Click "Confirm Booking"
6. Select payment method
7. Complete payment
8. Watch live driver tracking

### 2. **Driver Panel** (2 min)
1. Login as driver
2. Go to http://localhost:5173/driver/dashboard
3. Click "Go Online"
4. Accept incoming request (if available)
5. Check earnings dashboard
6. Click "Go Offline"

### 3. **Admin Dashboard** (2 min)
1. Login as admin
2. Go to http://localhost:5173/admin/uber/rides
3. View all active rides
4. Go to /admin/uber/drivers to manage drivers
5. Go to /admin/uber/analytics to see charts
6. Try date range filtering

---

## 🔧 Development Commands

```bash
# Build production
npm run build

# Run production
npm start

# Run tests
npm run test

# Check TypeScript
npm run type-check

# Format code
npm run format
```

---

## 📊 Database

### MongoDB Setup
```bash
# Local (if using local MongoDB)
mongod  # Start MongoDB service

# Or use MongoDB Atlas cloud (recommended)
# Connection string in .env
```

### Reset Database
```bash
# Delete all collections
# Caution: This deletes all data!
npm run db:reset
```

---

## 🗺️ Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable APIs:
   - ✅ Maps JavaScript API
   - ✅ Directions API
   - ✅ Geocoding API
   - ✅ Places API
4. Create API key
5. Add to `.env` as `VITE_GOOGLE_MAPS_API_KEY`

---

## 💳 Razorpay Setup

1. Sign up at https://razorpay.com
2. Get test credentials
3. Add to `.env`:
   ```bash
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=test_secret
   ```
4. Test payments work in test mode

---

## 🐛 Quick Debugging

### Socket.IO Not Working?
```
1. Check server console for connection errors
2. Open browser DevTools → Network → WS
3. Verify CORS settings
4. Check firewall allows port 3000
```

### Map Not Showing?
```
1. Verify API key in .env
2. Check browser console for errors
3. Confirm Maps API is enabled
4. Test with explicit API key log
```

### Payment Failing?
```
1. Check Razorpay test mode is active
2. Verify credentials in .env
3. Check webhook URL in Razorpay dashboard
4. Review payment logs in Razorpay
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `.env` | Configuration (REQUIRED) |
| `server/index.ts` | Server entry point |
| `server/routes.ts` | Route registration |
| `client/src/App.tsx` | Client routes |
| `UBER_APP_COMPLETE.md` | Full documentation |

---

## 🎯 Key Endpoints

**Rides**
- POST `/api/rides` - Book ride
- GET `/api/rides/:id` - Get ride

**Drivers**
- POST `/api/drivers/accept-ride` - Accept request
- POST `/api/drivers/start-trip` - Start trip

**Admin**
- GET `/api/admin/rides` - View all rides
- GET `/api/admin/analytics` - Get analytics

**Payments**
- POST `/api/payments/create-order` - Create payment
- POST `/api/payments/verify` - Verify payment

---

## 🚀 Deployment

### Deploy to Vercel (Frontend)
```bash
npm run build
# Push to GitHub
# Connect Vercel to GitHub repo
# Auto-deploys on push
```

### Deploy to Heroku (Backend)
```bash
heroku create app-name
heroku config:set VITE_GOOGLE_MAPS_API_KEY=xxx
git push heroku main
```

### Deploy to Docker
```bash
docker build -t taxi-app .
docker run -p 3000:3000 taxi-app
```

---

## 📊 Monitoring

### View Server Logs
```bash
npm run dev  # Logs all requests
```

### Database Monitoring
```bash
# MongoDB Atlas Dashboard
# https://cloud.mongodb.com
```

### Performance Metrics
- Admin Dashboard → Analytics
- Shows real-time metrics
- Revenue, rides, drivers, users

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Kill process or change PORT in .env |
| API key invalid | Regenerate from Google Cloud Console |
| DB connection failed | Check MONGODB_URI in .env |
| Payment test failing | Confirm Razorpay test mode active |
| Socket not connecting | Check CORS in server/routes.ts |

---

## 📞 Support

1. Check `UBER_APP_COMPLETE.md` for full docs
2. Review server logs: `npm run dev`
3. Check browser DevTools console
4. Verify all .env variables set

---

## 🎓 Next Steps

1. **Customize Branding**
   - Update colors in Tailwind config
   - Replace logo in `/client/public`
   - Update company name in components

2. **Add Features**
   - Refer to `UBER_APP_COMPLETE.md` Phase 6
   - Follow existing patterns
   - Add new routes and components

3. **Deploy**
   - Set up production database (MongoDB Atlas)
   - Configure production Razorpay credentials
   - Deploy frontend (Vercel) and backend (Heroku)

4. **Monitor**
   - Set up analytics tracking
   - Configure error reporting
   - Monitor performance metrics

---

**Happy Coding! 🚕💨**

For detailed documentation, see: `UBER_APP_COMPLETE.md`
