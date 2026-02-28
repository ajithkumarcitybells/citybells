import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isAdmin: boolean("is_admin").default(false),
  isVendor: boolean("is_vendor").default(false),
  partnerType: text("partner_type"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  address: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Addresses table for saved delivery addresses
export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  label: text("label").notNull(), // "Home", "Work", "Other"
  fullAddress: text("full_address").notNull(),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  pincode: text("pincode"),
  flatHouseNo: text("flat_house_no"),
  landmark: text("landmark"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true });
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

// Address relations
export const addressRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  categoryId: varchar("category_id").references(() => categories.id),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: integer("discount_percent").default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.0"),
  stock: integer("stock").default(100),
  unit: text("unit").default("1 pc"),
  isActive: boolean("is_active").default(true),
  vendorId: varchar("vendor_id").references(() => users.id),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Product relations
export const productRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").default(1),
  variant: text("variant"),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Cart item relations
export const cartItemRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
}));

// Wishlist items table
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({ id: true });
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

// Wishlist item relations
export const wishlistItemRelations = relations(wishlistItems, ({ one }) => ({
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
}));

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number").unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  items: jsonb("items").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  deliverySlot: text("delivery_slot"),
  paymentMethod: text("payment_method").default("cod"),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order relations
export const orderRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

// Banners table
export const banners = pgTable("banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  image: text("image"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const insertBannerSchema = createInsertSchema(banners).omit({ id: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

// Services table (for super app services like Grocery, Food, Taxi, etc.)
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  isActive: boolean("is_active").default(false),
  sortOrder: integer("sort_order").default(0),
});

export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Ticket Messages (for conversation thread)
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  message: text("message").notNull(),
  image: text("image"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

export type SupportTicketWithMessages = SupportTicket & { 
  messages: TicketMessage[];
  username?: string;
  userName?: string;
};

// Category Ads table (small promotional ads per category)
export const categoryAds = pgTable("category_ads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  image: text("image"),
  categoryId: varchar("category_id").references(() => categories.id),
  linkUrl: text("link_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const insertCategoryAdSchema = createInsertSchema(categoryAds).omit({ id: true });
export type InsertCategoryAd = z.infer<typeof insertCategoryAdSchema>;
export type CategoryAd = typeof categoryAds.$inferSelect;

export const categoryAdRelations = relations(categoryAds, ({ one }) => ({
  category: one(categories, {
    fields: [categoryAds.categoryId],
    references: [categories.id],
  }),
}));

// Vendor Applications table
export const vendorApplications = pgTable("vendor_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  serviceType: text("service_type").notNull(),
  description: text("description"),
  address: text("address"),
  username: text("username").notNull(),
  password: text("password").notNull(),
  certificates: text("certificates").array().notNull(),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorApplicationSchema = createInsertSchema(vendorApplications).omit({ id: true, status: true, adminNote: true, createdAt: true });
export type InsertVendorApplication = z.infer<typeof insertVendorApplicationSchema>;
export type VendorApplication = typeof vendorApplications.$inferSelect;

// Type for cart item with product details
export type CartItemWithProduct = CartItem & { product: Product };
export type WishlistItemWithProduct = WishlistItem & { product: Product };

// Order item type for storing in orders.items jsonb
export interface OrderItem {
  productId: string;
  name: string;
  price: string;
  quantity: number;
  image?: string;
}

// ==================== E-COMMERCE TABLES ====================

export const ecomCategories = pgTable("ecom_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  image: text("image"),
  parentId: varchar("parent_id"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const insertEcomCategorySchema = createInsertSchema(ecomCategories).omit({ id: true });
export type InsertEcomCategory = z.infer<typeof insertEcomCategorySchema>;
export type EcomCategory = typeof ecomCategories.$inferSelect;

export const ecomProducts = pgTable("ecom_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  images: text("images").array().default([]),
  categoryId: varchar("category_id").references(() => ecomCategories.id),
  vendorId: varchar("vendor_id").references(() => users.id),
  brand: text("brand"),
  sku: text("sku"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: integer("discount_percent").default(0),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  variants: jsonb("variants").default([]),
  specifications: jsonb("specifications").default({}),
  stock: integer("stock").default(100),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  isFeatured: boolean("is_featured").default(false),
  isInstantDelivery: boolean("is_instant_delivery").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEcomProductSchema = createInsertSchema(ecomProducts).omit({ id: true, rating: true, reviewCount: true, createdAt: true });
export type InsertEcomProduct = z.infer<typeof insertEcomProductSchema>;
export type EcomProduct = typeof ecomProducts.$inferSelect;

export const ecomProductRelations = relations(ecomProducts, ({ one }) => ({
  category: one(ecomCategories, {
    fields: [ecomProducts.categoryId],
    references: [ecomCategories.id],
  }),
  vendor: one(users, {
    fields: [ecomProducts.vendorId],
    references: [users.id],
  }),
}));

export const ecomReviews = pgTable("ecom_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => ecomProducts.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEcomReviewSchema = createInsertSchema(ecomReviews).omit({ id: true, createdAt: true });
export type InsertEcomReview = z.infer<typeof insertEcomReviewSchema>;
export type EcomReview = typeof ecomReviews.$inferSelect;

export const ecomReviewRelations = relations(ecomReviews, ({ one }) => ({
  product: one(ecomProducts, {
    fields: [ecomReviews.productId],
    references: [ecomProducts.id],
  }),
  user: one(users, {
    fields: [ecomReviews.userId],
    references: [users.id],
  }),
}));

export const sellerProfiles = pgTable("seller_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  storeName: text("store_name").notNull(),
  storeDescription: text("store_description"),
  logo: text("logo"),
  banner: text("banner"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
  bankDetails: jsonb("bank_details").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSellerProfileSchema = createInsertSchema(sellerProfiles).omit({ id: true, walletBalance: true, createdAt: true });
export type InsertSellerProfile = z.infer<typeof insertSellerProfileSchema>;
export type SellerProfile = typeof sellerProfiles.$inferSelect;

export const ecomCartItems = pgTable("ecom_cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  productId: varchar("product_id").references(() => ecomProducts.id).notNull(),
  quantity: integer("quantity").default(1),
  variant: text("variant"),
});

export const insertEcomCartItemSchema = createInsertSchema(ecomCartItems).omit({ id: true });
export type InsertEcomCartItem = z.infer<typeof insertEcomCartItemSchema>;
export type EcomCartItem = typeof ecomCartItems.$inferSelect;

export const ecomCartItemRelations = relations(ecomCartItems, ({ one }) => ({
  product: one(ecomProducts, {
    fields: [ecomCartItems.productId],
    references: [ecomProducts.id],
  }),
  user: one(users, {
    fields: [ecomCartItems.userId],
    references: [users.id],
  }),
}));

export const ecomWishlistItems = pgTable("ecom_wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  productId: varchar("product_id").references(() => ecomProducts.id).notNull(),
});

export const insertEcomWishlistItemSchema = createInsertSchema(ecomWishlistItems).omit({ id: true });
export type InsertEcomWishlistItem = z.infer<typeof insertEcomWishlistItemSchema>;
export type EcomWishlistItem = typeof ecomWishlistItems.$inferSelect;

export const ecomOrders = pgTable("ecom_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number").unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  vendorId: varchar("vendor_id").references(() => users.id),
  items: jsonb("items").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  paymentMethod: text("payment_method").default("cod"),
  paymentId: text("payment_id"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEcomOrderSchema = createInsertSchema(ecomOrders).omit({ id: true, createdAt: true });
export type InsertEcomOrder = z.infer<typeof insertEcomOrderSchema>;
export type EcomOrder = typeof ecomOrders.$inferSelect;

export type EcomCartItemWithProduct = EcomCartItem & { product: EcomProduct };
export type EcomWishlistItemWithProduct = EcomWishlistItem & { product: EcomProduct };
export type EcomReviewWithUser = EcomReview & { username?: string; name?: string };

export interface EcomOrderItem {
  productId: string;
  name: string;
  price: string;
  quantity: number;
  image?: string;
  variant?: string;
  vendorId?: string;
}

// ==================== FOOD DELIVERY TABLES ====================

export const foodRestaurants = pgTable("food_restaurants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  image: text("image"),
  cuisine: text("cuisine").array().default([]),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.0"),
  deliveryTime: text("delivery_time").default("30-40 min"),
  minOrder: decimal("min_order", { precision: 10, scale: 2 }).default("99"),
  isActive: boolean("is_active").default(true),
  address: text("address"),
  ownerId: varchar("owner_id").references(() => users.id),
  description: text("description"),
  openingTime: text("opening_time").default("09:00"),
  closingTime: text("closing_time").default("22:00"),
});

export const insertFoodRestaurantSchema = createInsertSchema(foodRestaurants).omit({ id: true });
export type InsertFoodRestaurant = z.infer<typeof insertFoodRestaurantSchema>;
export type FoodRestaurant = typeof foodRestaurants.$inferSelect;

export const foodMenuItems = pgTable("food_menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: varchar("restaurant_id").references(() => foodRestaurants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image"),
  category: text("category").default("Main Course"),
  isVeg: boolean("is_veg").default(false),
  isAvailable: boolean("is_available").default(true),
});

export const insertFoodMenuItemSchema = createInsertSchema(foodMenuItems).omit({ id: true });
export type InsertFoodMenuItem = z.infer<typeof insertFoodMenuItemSchema>;
export type FoodMenuItem = typeof foodMenuItems.$inferSelect;

export const foodOrders = pgTable("food_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  restaurantId: varchar("restaurant_id").references(() => foodRestaurants.id).notNull(),
  items: jsonb("items").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("30"),
  status: text("status").default("placed"),
  deliveryAddress: text("delivery_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFoodOrderSchema = createInsertSchema(foodOrders).omit({ id: true, createdAt: true });
export type InsertFoodOrder = z.infer<typeof insertFoodOrderSchema>;
export type FoodOrder = typeof foodOrders.$inferSelect;

export interface FoodOrderItem {
  menuItemId: string;
  name: string;
  price: string;
  quantity: number;
  isVeg?: boolean;
}

// ==================== CITY MOVING TABLES ====================

export const movingVehicleTypes = pgTable("moving_vehicle_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  pricePerKm: decimal("price_per_km", { precision: 10, scale: 2 }).notNull(),
  capacity: text("capacity"),
  icon: text("icon"),
});

export const insertMovingVehicleTypeSchema = createInsertSchema(movingVehicleTypes).omit({ id: true });
export type InsertMovingVehicleType = z.infer<typeof insertMovingVehicleTypeSchema>;
export type MovingVehicleType = typeof movingVehicleTypes.$inferSelect;

export const movingDrivers = pgTable("moving_drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  vehicleTypeId: varchar("vehicle_type_id").references(() => movingVehicleTypes.id),
  vehicleNumber: text("vehicle_number"),
  isAvailable: boolean("is_available").default(true),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.5"),
});

export const insertMovingDriverSchema = createInsertSchema(movingDrivers).omit({ id: true });
export type InsertMovingDriver = z.infer<typeof insertMovingDriverSchema>;
export type MovingDriver = typeof movingDrivers.$inferSelect;

export const movingBookings = pgTable("moving_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  vehicleTypeId: varchar("vehicle_type_id").references(() => movingVehicleTypes.id).notNull(),
  driverId: varchar("driver_id").references(() => movingDrivers.id),
  pickupAddress: text("pickup_address").notNull(),
  dropAddress: text("drop_address").notNull(),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),
  dropLat: decimal("drop_lat", { precision: 10, scale: 7 }),
  dropLng: decimal("drop_lng", { precision: 10, scale: 7 }),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  estimatedPrice: decimal("estimated_price", { precision: 10, scale: 2 }),
  actualPrice: decimal("actual_price", { precision: 10, scale: 2 }),
  status: text("status").default("pending"),
  helpersCount: integer("helpers_count").default(0),
  description: text("description"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMovingBookingSchema = createInsertSchema(movingBookings).omit({ id: true, createdAt: true });
export type InsertMovingBooking = z.infer<typeof insertMovingBookingSchema>;
export type MovingBooking = typeof movingBookings.$inferSelect;

// ==================== HOTEL BOOKING TABLES ====================

export const hotels = pgTable("hotels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  images: text("images").array().default([]),
  city: text("city").notNull(),
  address: text("address"),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.0"),
  amenities: text("amenities").array().default([]),
  starRating: integer("star_rating").default(3),
  checkInTime: text("check_in_time").default("14:00"),
  checkOutTime: text("check_out_time").default("12:00"),
  isActive: boolean("is_active").default(true),
  managerId: varchar("manager_id").references(() => users.id),
});

export const insertHotelSchema = createInsertSchema(hotels).omit({ id: true });
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotels.$inferSelect;

export const hotelRooms = pgTable("hotel_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hotelId: varchar("hotel_id").references(() => hotels.id).notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxGuests: integer("max_guests").default(2),
  amenities: text("amenities").array().default([]),
  images: text("images").array().default([]),
  isAvailable: boolean("is_available").default(true),
  totalRooms: integer("total_rooms").default(10),
  availableRooms: integer("available_rooms").default(10),
});

export const insertHotelRoomSchema = createInsertSchema(hotelRooms).omit({ id: true });
export type InsertHotelRoom = z.infer<typeof insertHotelRoomSchema>;
export type HotelRoom = typeof hotelRooms.$inferSelect;

export const hotelBookings = pgTable("hotel_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  hotelId: varchar("hotel_id").references(() => hotels.id).notNull(),
  roomId: varchar("room_id").references(() => hotelRooms.id).notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  guests: integer("guests").default(1),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  guestName: text("guest_name"),
  guestPhone: text("guest_phone"),
  specialRequests: text("special_requests"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHotelBookingSchema = createInsertSchema(hotelBookings).omit({ id: true, createdAt: true });
export type InsertHotelBooking = z.infer<typeof insertHotelBookingSchema>;
export type HotelBooking = typeof hotelBookings.$inferSelect;

// ==================== TAXI TABLES ====================

export const taxiVehicleTypes = pgTable("taxi_vehicle_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  baseFare: decimal("base_fare", { precision: 10, scale: 2 }).notNull(),
  perKmRate: decimal("per_km_rate", { precision: 10, scale: 2 }).notNull(),
  perMinRate: decimal("per_min_rate", { precision: 10, scale: 2 }).notNull(),
  capacity: integer("capacity").default(4),
  icon: text("icon"),
});

export const insertTaxiVehicleTypeSchema = createInsertSchema(taxiVehicleTypes).omit({ id: true });
export type InsertTaxiVehicleType = z.infer<typeof insertTaxiVehicleTypeSchema>;
export type TaxiVehicleType = typeof taxiVehicleTypes.$inferSelect;

export const taxiDrivers = pgTable("taxi_drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  vehicleTypeId: varchar("vehicle_type_id").references(() => taxiVehicleTypes.id),
  vehicleNumber: text("vehicle_number"),
  licenseNumber: text("license_number"),
  isOnline: boolean("is_online").default(false),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.5"),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
});

export const insertTaxiDriverSchema = createInsertSchema(taxiDrivers).omit({ id: true });
export type InsertTaxiDriver = z.infer<typeof insertTaxiDriverSchema>;
export type TaxiDriver = typeof taxiDrivers.$inferSelect;

export const taxiRides = pgTable("taxi_rides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  driverId: varchar("driver_id").references(() => taxiDrivers.id),
  vehicleTypeId: varchar("vehicle_type_id").references(() => taxiVehicleTypes.id).notNull(),
  pickupAddress: text("pickup_address").notNull(),
  dropAddress: text("drop_address").notNull(),
  pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),
  dropLat: decimal("drop_lat", { precision: 10, scale: 7 }),
  dropLng: decimal("drop_lng", { precision: 10, scale: 7 }),
  estimatedFare: decimal("estimated_fare", { precision: 10, scale: 2 }),
  actualFare: decimal("actual_fare", { precision: 10, scale: 2 }),
  distance: decimal("distance", { precision: 10, scale: 2 }),
  duration: integer("duration"),
  status: text("status").default("searching"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  vehicleNumber: text("vehicle_number"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaxiRideSchema = createInsertSchema(taxiRides).omit({ id: true, createdAt: true });
export type InsertTaxiRide = z.infer<typeof insertTaxiRideSchema>;
export type TaxiRide = typeof taxiRides.$inferSelect;

// ==================== CITY SERVICES TABLES ====================

export const cityServiceCategories = pgTable("city_service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  icon: text("icon"),
});

export const insertCityServiceCategorySchema = createInsertSchema(cityServiceCategories).omit({ id: true });
export type InsertCityServiceCategory = z.infer<typeof insertCityServiceCategorySchema>;
export type CityServiceCategory = typeof cityServiceCategories.$inferSelect;

export const cityServices = pgTable("city_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => cityServiceCategories.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: text("duration").default("1 hour"),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.0"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
});

export const insertCityServiceSchema = createInsertSchema(cityServices).omit({ id: true });
export type InsertCityService = z.infer<typeof insertCityServiceSchema>;
export type CityService = typeof cityServices.$inferSelect;

export const cityServiceProviders = pgTable("city_service_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  specializations: text("specializations").array().default([]),
  experience: text("experience"),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("4.5"),
  isAvailable: boolean("is_available").default(true),
  isAgency: boolean("is_agency").default(false),
  agencyName: text("agency_name"),
});

export const insertCityServiceProviderSchema = createInsertSchema(cityServiceProviders).omit({ id: true });
export type InsertCityServiceProvider = z.infer<typeof insertCityServiceProviderSchema>;
export type CityServiceProvider = typeof cityServiceProviders.$inferSelect;

export const cityServiceBookings = pgTable("city_service_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  serviceId: varchar("service_id").references(() => cityServices.id).notNull(),
  providerId: varchar("provider_id").references(() => cityServiceProviders.id),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  address: text("address").notNull(),
  status: text("status").default("pending"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  professionalName: text("professional_name"),
  professionalPhone: text("professional_phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCityServiceBookingSchema = createInsertSchema(cityServiceBookings).omit({ id: true, createdAt: true });
export type InsertCityServiceBooking = z.infer<typeof insertCityServiceBookingSchema>;
export type CityServiceBooking = typeof cityServiceBookings.$inferSelect;
