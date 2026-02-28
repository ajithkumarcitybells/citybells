# City Bell - Multi-Service Super App

## Overview
City Bell is a Progressive Web App (PWA) for a multi-service super app featuring 7 services: Grocery, E-Commerce, Food Delivery, City Moving, Hotel Booking, Taxi, and City Services. The app includes comprehensive user authentication, partner/vendor dashboards, a full admin panel with central control, mobile-first responsive design, and location-based services.

## Current State
- **Phase**: Production-ready MVP
- **Last Updated**: February 2026
- **Status**: All 7 services operational with seed data

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
├── client/src/
│   ├── components/          # Reusable UI components (Shadcn)
│   ├── hooks/               # Custom hooks (use-auth, use-toast, use-location)
│   ├── lib/                 # Utilities (queryClient, protected-route)
│   ├── pages/
│   │   ├── admin/           # Admin panel pages (all services)
│   │   ├── ecom/            # E-Commerce storefront pages
│   │   ├── food/            # Food delivery pages + restaurant dashboard
│   │   ├── hotel/           # Hotel booking pages + manager dashboard
│   │   ├── moving/          # City moving pages + driver dashboard
│   │   ├── taxi/            # Taxi pages + driver dashboard
│   │   ├── services/        # City services pages + provider dashboard
│   │   ├── seller/          # E-com seller dashboard
│   │   └── *.tsx            # Core pages (home, auth, profile, etc.)
│   └── App.tsx              # Main router
├── server/
│   ├── auth.ts              # Authentication (Passport, requireAuth, requireAdmin, requirePartner)
│   ├── routes.ts            # Core API routes (grocery, e-commerce, auth, admin stats)
│   ├── food-routes.ts       # Food delivery API routes
│   ├── food-storage.ts      # Food delivery storage layer
│   ├── moving-routes.ts     # City moving API routes
│   ├── moving-storage.ts    # City moving storage layer
│   ├── hotel-routes.ts      # Hotel booking API routes
│   ├── hotel-storage.ts     # Hotel booking storage layer
│   ├── taxi-routes.ts       # Taxi API routes
│   ├── taxi-storage.ts      # Taxi storage layer
│   ├── city-services-routes.ts  # City services API routes
│   ├── city-services-storage.ts # City services storage layer
│   ├── storage.ts           # Core storage layer (grocery, e-com, users)
│   ├── seed.ts              # Database seed script (all services)
│   └── db.ts                # Drizzle database connection
├── shared/
│   └── schema.ts            # All Drizzle schemas + Zod validation
└── attached_assets/         # Logo and assets
```

### Database Schema

#### Core Tables
- **users**: Accounts with auth (username/password, isAdmin, isVendor, partnerType)
- **addresses**: User delivery addresses
- **support_tickets** + **ticket_messages**: Support system
- **vendor_applications**: Partner onboarding (all service types)
- **services**: Super app service toggles
- **banners**: Promotional banners

#### Grocery Tables
- **products**, **categories**, **cart_items**, **wishlist_items**, **orders**

#### E-Commerce Tables
- **ecom_categories**, **ecom_products**, **ecom_reviews**, **seller_profiles**
- **ecom_cart_items**, **ecom_wishlist_items**, **ecom_orders**

#### Food Delivery Tables
- **food_restaurants**: Restaurants with cuisine, rating, delivery time, owner
- **food_menu_items**: Menu items per restaurant
- **food_orders**: Food orders with item JSON, status tracking

#### City Moving Tables
- **moving_vehicle_types**: Vehicle types (bike, auto, truck, packers)
- **moving_drivers**: Drivers with vehicle info
- **moving_bookings**: Moving bookings with pickup/drop, scheduling

#### Hotel Booking Tables
- **hotels**: Hotels with city, amenities, star rating, manager
- **hotel_rooms**: Room types per hotel with pricing
- **hotel_bookings**: Hotel reservations with check-in/out

#### Taxi Tables
- **taxi_vehicle_types**: Vehicle types (auto, mini, sedan, SUV)
- **taxi_drivers**: Drivers with location tracking
- **taxi_rides**: Ride bookings with fare, status, rating

#### City Services Tables
- **city_service_categories**: Service categories (cleaning, plumbing, etc.)
- **city_services**: Individual services with pricing
- **city_service_providers**: Service professionals
- **city_service_bookings**: Service bookings with scheduling

## Partner Role System
- `users.partnerType` determines partner dashboard: `"seller"` | `"restaurant"` | `"driver"` | `"hotel"` | `"service_provider"`
- `isVendor: true` + `partnerType` → routed to correct dashboard from profile page
- Partners register via vendor application → admin approves → sets partnerType
- `requirePartner(type)` middleware enforces partner-specific routes

## Default Accounts
- **Admin**: username: `admin`, password: `admin123`
- **E-Com Seller**: username: `seller1`, password: `seller123` (partnerType: seller)
- **Restaurant Owner**: username: `restaurant1`, password: `partner123` (partnerType: restaurant, linked to Spice Garden)
- **Moving Driver**: username: `driver1`, password: `partner123` (partnerType: driver, Mini Truck)
- **Hotel Manager**: username: `hotel1`, password: `partner123` (partnerType: hotel, linked to first hotel)
- **Taxi Driver**: username: `taxidriver1`, password: `partner123` (partnerType: driver, Sedan)
- **Service Provider**: username: `provider1`, password: `partner123` (partnerType: service_provider, CleanPro Services)
- Seed data includes 10 restaurants, 5 vehicle types, 10 hotels, 4 taxi types, 8 service categories with 29+ services

## Key Features

### Grocery Service
- Product browsing by category, search, filters
- Shopping cart with weight variants, wishlist, order tracking

### E-Commerce Service (Flipkart-like)
- Flipkart-inspired home page: horizontal category strip, hero carousel, promotional deal cards, instant delivery section
- `isInstantDelivery` boolean on ecom_products — admin-toggleable, shown as dedicated section on home page
- Category-based browsing, search, filters (price, rating, brand, instant delivery)
- Product detail with gallery, variants, reviews
- Seller store pages, separate cart/checkout/orders

### Food Delivery (Swiggy/Zomato-like)
- Restaurant browsing with cuisine filters, search
- Restaurant menu with veg/non-veg toggle, cart system
- Order placement with delivery address, status tracking
- **Restaurant Dashboard**: Menu CRUD, order management, profile

### City Moving (Porter-like)
- Vehicle type selection with capacity/pricing
- Booking with pickup/drop, scheduling, helpers count
- Price estimation, booking history
- **Driver Dashboard**: Assigned bookings, status updates, earnings

### Hotel Booking (MakeMyTrip-like)
- Hotel search by city, dates, guests
- Hotel detail with room types, amenities, photos
- Booking with guest info, special requests
- **Hotel Manager Dashboard**: Room CRUD, booking management, profile

### Taxi (Ola/Uber-like)
- Pickup/drop selection with fare estimation
- Vehicle type selection, ride booking
- Ride status tracking, rate completed rides
- **Taxi Driver Dashboard**: Online/offline toggle, ride management, earnings

### City Services (UrbanCompany-like)
- Category browsing (cleaning, plumbing, electrician, etc.)
- Service selection with price/duration/rating
- Booking with date/time/address
- **Service Provider Dashboard**: Booking management, availability, specializations

### Admin Panel (Central Control)
- Dashboard with cross-service stats
- Grocery management (products, categories, orders, banners)
- E-Commerce management (products, categories, orders, sellers)
- Food management (restaurants, menus, orders)
- Moving management (vehicle types, bookings, drivers)
- Hotel management (hotels, rooms, bookings)
- Taxi management (vehicle types, rides, drivers)
- City Services management (categories, services, bookings, providers)
- Vendor/partner application approval
- Support ticket management

## API Endpoints Summary

### Auth: POST /api/register, /api/login, /api/logout, GET /api/user
### Grocery: /api/products, /api/categories, /api/cart, /api/orders
### E-Commerce: /api/ecom/products, /api/ecom/categories, /api/ecom/cart, /api/ecom/orders
### Food: /api/food/restaurants, /api/food/orders, /api/food/my-restaurant/*
### Moving: /api/moving/vehicle-types, /api/moving/bookings, /api/moving/driver/*
### Hotels: /api/hotels, /api/hotel-bookings, /api/hotel-manager/*
### Taxi: /api/taxi/vehicle-types, /api/taxi/rides, /api/taxi/driver/*
### City Services: /api/city-services/categories, /api/city-services/services, /api/city-services/bookings, /api/city-services/provider/*
### Admin: /api/admin/* (stats, food, moving, hotels, taxi, city-services, ecom, vendors, support)

## Design System
- **Primary Color**: Green (#22C543 / HSL 142 76% 36%)
- **Theme Color**: Yellow (#FFDD00)
- **Font**: Poppins (Google Fonts)
- **Logo**: City Bell red/yellow bell logo

## Running the Project
1. The app runs on port 5000
2. Database is automatically initialized with seed data
3. Use "Start application" workflow to run the dev server
