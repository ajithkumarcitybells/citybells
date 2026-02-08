# City Bell - Super App

## Overview
City Bell is a Progressive Web App (PWA) for a multi-service super app featuring Grocery (active), E-commerce, Food, Taxi, Hotel, City Move, and City Serve services (coming soon). The app includes comprehensive user authentication with username/password, mobile-first responsive design with City Bell branding, a full admin panel, and Zepto/Blinkit-style location detection and address management.

## Current State
- **Phase**: Production-ready MVP
- **Last Updated**: February 2026
- **Status**: Fully functional with seeded data

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Shadcn UI components
- **State Management**: TanStack Query (React Query v5)
- **Routing**: Wouter
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy + express-session
- **Session Storage**: connect-pg-simple (PostgreSQL sessions)

### File Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks (use-auth, use-toast)
│   │   ├── lib/            # Utilities (queryClient, protected-route)
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin panel pages
│   │   │   └── *.tsx       # User-facing pages
│   │   └── App.tsx         # Main app with routing
│   └── public/             # Static assets (manifest.json)
├── server/                 # Backend Express server
│   ├── auth.ts             # Authentication setup (Passport)
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database storage layer
│   ├── seed.ts             # Database seed script
│   └── db.ts               # Drizzle database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle schema + Zod validation
└── attached_assets/        # User-uploaded assets (logo)
```

### Database Schema
- **users**: User accounts with auth (username/password)
- **products**: Grocery products with pricing, categories
- **categories**: Product categories (Fruits, Vegetables, etc.)
- **cart_items**: User shopping cart
- **wishlist_items**: User wishlist
- **orders**: Order history with status tracking
- **banners**: Promotional banners for homepage
- **services**: Super app service toggles (Grocery, Food, etc.)
- **addresses**: User delivery addresses with labels (Home/Work/Other)
- **support_tickets**: User support/complaint tickets with status tracking
- **ticket_messages**: Conversation messages within support tickets

## Key Features

### User Features
- Username/password authentication
- Product browsing by category
- Search and filter products
- Shopping cart with quantity management
- Wishlist functionality
- Order placement with delivery slots
- Order history tracking
- Auto-location detection using GPS + OpenStreetMap reverse geocoding
- Address management (save/edit/delete multiple addresses with labels)
- Support ticket system (raise complaints, track status, chat with admin)

### Admin Features
- Product management (CRUD) with image upload
- Category management
- Order management with status updates
- Banner management for promotions
- Service toggle (enable/disable services)
- Product image upload via Object Storage (max 5MB)

## API Endpoints

### Public Routes
- `GET /api/categories` - Get all categories
- `GET /api/products` - Get all products (optional ?category=id filter)
- `GET /api/products/:id` - Get single product
- `GET /api/banners` - Get promotional banners
- `GET /api/services` - Get available services

### Auth Routes
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/user` - Get current user

### Protected Routes (requires login)
- `GET/POST /api/cart` - Cart management
- `PATCH/DELETE /api/cart/:id` - Update/remove cart items
- `GET/POST /api/wishlist` - Wishlist management
- `DELETE /api/wishlist/:productId` - Remove from wishlist
- `GET/POST /api/orders` - Order management
- `GET/POST /api/addresses` - Address management
- `PATCH/DELETE /api/addresses/:id` - Update/remove addresses
- `PATCH /api/addresses/:id/default` - Set default address
- `POST /api/payment/create-order` - Create Razorpay order for payment
- `POST /api/payment/verify` - Verify Razorpay payment signature

### Admin Routes (requires admin role)
- `POST/PATCH/DELETE /api/admin/products/:id`
- `POST/PATCH/DELETE /api/admin/categories/:id`
- `GET/PATCH /api/admin/orders/:id`
- `POST/PATCH/DELETE /api/admin/banners/:id`
- `PATCH /api/admin/services/:id`

## Default Accounts
- **Admin**: username: `admin`, password: `admin123`

## Design System
- **Primary Color**: Green (#22C543 / HSL 142 76% 36%)
- **Theme Color**: Yellow (#FFDD00)
- **Font**: Poppins (Google Fonts)
- **Logo**: City Bell red/yellow bell logo

## Running the Project
1. The app runs on port 5000
2. Database is automatically initialized with seed data
3. Use "Start application" workflow to run the dev server

## Recent Changes
- Added weight-based variants for fruit products (Feb 2026):
  - Fruit products show "Select Weight" button instead of direct "Add to Cart"
  - WeightPickerModal with 250g/500g/1kg options and dynamic pricing
  - 500g highlighted as popular, remembers last selected weight via localStorage
  - Cart items with different weight variants stored as separate entries
  - Cart and checkout display variant info with correct pricing (multiplier-based)
  - `variant` field added to cart_items table
- Added admin order detail page with CB-prefixed order numbers (Feb 2026):
  - `orderNumber` field on orders table (e.g., CB739AAE)
  - Auto-generated on order creation with CB + 6 random alphanumeric chars
  - Retry logic for unique constraint collisions
  - Admin order detail page at /admin/orders/:id with full order info
  - Clickable order IDs in admin orders list navigate to detail page
  - Customer info, items, delivery address, payment details displayed
  - Status update from detail page
  - GET /api/admin/orders/:id endpoint with customer join
  - Admin multi-select bulk delete on products page
- Integrated Razorpay payment gateway (Feb 2026):
  - Online payments via UPI, Cards, Net Banking, Wallets
  - Backend routes for order creation and signature verification
  - Secure HMAC-SHA256 signature verification
  - Orders with successful payments auto-confirm (status: "confirmed")
  - paymentId stored in orders table for reconciliation
- Added City Serve service (home services like Urban Company) as "coming soon"
- Implemented Zepto/Blinkit-style address management:
  - Auto-location detection with GPS + OpenStreetMap reverse geocoding
  - Save multiple delivery addresses with labels (Home/Work/Other)
  - Set default address for delivery
  - LocationProvider context for app-wide location state
  - AddressPicker component with modal UI
- Complete MVP implementation (Feb 2026)
- Added Zod validation for all API endpoints
- Fixed IDOR vulnerabilities with user-scoped cart/wishlist/address operations
- Seeded 32 grocery products across 8 categories
- PWA support with manifest.json
