# City Bell - Super App

## Overview
City Bell is a Progressive Web App (PWA) for a multi-service super app featuring Grocery (active), E-Commerce (active), Food, Taxi, Hotel, City Move, and City Serve services (coming soon). The app includes comprehensive user authentication with username/password, mobile-first responsive design with City Bell branding, a full admin panel, vendor/seller ecosystem, and Zepto/Blinkit-style location detection and address management.

## Current State
- **Phase**: Production-ready MVP
- **Last Updated**: February 2026
- **Status**: Fully functional with seeded data (Grocery + E-Commerce)

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
- **Payments**: Razorpay integration

### File Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks (use-auth, use-toast)
│   │   ├── lib/            # Utilities (queryClient, protected-route)
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin panel pages (grocery + e-commerce)
│   │   │   ├── ecom/       # E-Commerce storefront pages
│   │   │   ├── seller/     # Seller dashboard pages
│   │   │   └── *.tsx       # User-facing pages
│   │   └── App.tsx         # Main app with routing
│   └── public/             # Static assets (manifest.json)
├── server/                 # Backend Express server
│   ├── auth.ts             # Authentication setup (Passport)
│   ├── routes.ts           # API routes (grocery + e-commerce)
│   ├── storage.ts          # Database storage layer
│   ├── seed.ts             # Database seed script
│   └── db.ts               # Drizzle database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle schema + Zod validation
└── attached_assets/        # User-uploaded assets (logo)
```

### Database Schema

#### Grocery Tables
- **users**: User accounts with auth (username/password, isAdmin, isVendor roles)
- **products**: Grocery products with pricing, categories
- **categories**: Grocery product categories
- **cart_items**: Grocery shopping cart
- **wishlist_items**: Grocery wishlist
- **orders**: Grocery order history with status tracking
- **banners**: Promotional banners for homepage
- **services**: Super app service toggles
- **addresses**: User delivery addresses with labels
- **support_tickets**: User support/complaint tickets
- **ticket_messages**: Conversation messages within support tickets
- **vendor_applications**: Vendor onboarding applications

#### E-Commerce Tables
- **ecom_categories**: E-commerce product categories (Electronics, Fashion, Home, etc.)
- **ecom_products**: E-commerce products with multi-image, variants, specifications, brand, SKU, vendorId
- **ecom_reviews**: Product reviews & ratings with user info
- **seller_profiles**: Seller store info (storeName, logo, commission, wallet)
- **ecom_cart_items**: E-commerce shopping cart
- **ecom_wishlist_items**: E-commerce wishlist
- **ecom_orders**: E-commerce orders with vendorId for seller tracking

## Key Features

### Grocery Service
- Product browsing by category with search and filter
- Shopping cart with weight variants
- Wishlist functionality
- Order placement with delivery slots
- Order history tracking

### E-Commerce Service (Amazon-like)
- Home page with hero banners, category grid, deals, featured/trending products
- Product listing with sidebar filters (category, price range, rating, brand)
- Sort options (price, rating, newest, discount)
- Product detail page with image gallery, variant selection, specifications
- Reviews & ratings system
- Separate e-commerce cart, checkout, and order tracking
- Seller store pages

### Seller Dashboard
- Dashboard overview with sales stats and recent orders
- Product management (add/edit/delete with variants, multi-image, brand, SKU)
- Order management with status updates (processing/shipped/delivered)
- Inventory management with low stock alerts
- Earnings/wallet overview with commission breakdown
- Store profile management (name, description, logo)

### Vendor Onboarding
- Vendor registration form (business details, documents, credentials)
- Admin approval workflow (approve/reject/request modifications)
- Auto-creation of vendor account on approval
- Seller profile setup after approval

### Admin Features
- Full grocery admin panel (products, categories, orders, banners, services)
- E-Commerce admin panel:
  - E-com category management
  - Product moderation (approve/reject vendor products)
  - Seller management with commission rates
  - E-com order monitoring
  - E-com analytics dashboard
- Vendor application management
- Support ticket management
- User management

### Common Features
- Username/password authentication (3 roles: user, vendor, admin)
- Auto-location detection with GPS + OpenStreetMap
- Address management (save/edit/delete multiple addresses)
- Razorpay payment integration (UPI, Cards, Net Banking)
- Support ticket system
- Direct file upload via `/api/uploads/direct` (base64 JSON, files stored in `uploads/` directory, served via `/uploads/:filename`)

## API Endpoints

### Public Routes
- `GET /api/categories` - Grocery categories
- `GET /api/products` - Grocery products
- `GET /api/banners` - Promotional banners
- `GET /api/services` - Available services
- `GET /api/ecom/categories` - E-com categories
- `GET /api/ecom/products` - E-com products (search, filter, sort)
- `GET /api/ecom/products/:id` - E-com product detail
- `GET /api/ecom/products/:id/reviews` - Product reviews
- `GET /api/ecom/seller/:userId` - Seller store page

### Auth Routes
- `POST /api/register` / `POST /api/login` / `POST /api/logout` / `GET /api/user`

### Protected Routes
- Grocery: cart, wishlist, orders, addresses, payment
- E-com: `/api/ecom/cart`, `/api/ecom/wishlist`, `/api/ecom/orders`, `/api/ecom/reviews`

### Vendor Routes (E-Commerce)
- `GET/POST/PATCH/DELETE /api/ecom/vendor/products`
- `GET /api/ecom/vendor/orders`
- `PATCH /api/ecom/vendor/orders/:id/status`
- `GET /api/ecom/vendor/stats`
- `GET/POST /api/ecom/vendor/profile`

### Admin Routes (E-Commerce)
- `GET/POST/PATCH/DELETE /api/admin/ecom/categories`
- `GET/PATCH/DELETE /api/admin/ecom/products`
- `GET /api/admin/ecom/orders` + status updates
- `GET /api/admin/ecom/sellers` + commission updates
- `GET /api/admin/ecom/stats`

## Default Accounts
- **Admin**: username: `admin`, password: `admin123`
- **Seller**: username: `seller1`, password: `seller123`

## Design System
- **Primary Color**: Green (#22C543 / HSL 142 76% 36%)
- **Theme Color**: Yellow (#FFDD00)
- **Font**: Poppins (Google Fonts)
- **Logo**: City Bell red/yellow bell logo

## Running the Project
1. The app runs on port 5000
2. Database is automatically initialized with seed data
3. Use "Start application" workflow to run the dev server
