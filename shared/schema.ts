import { z } from "zod";

// ==================== USERS ====================
export interface User {
  id: string;
  username: string;
  password: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  loginPin: string | null;
  address: string | null;
  isAdmin: boolean | null;
  isVendor: boolean | null;
  partnerType: string | null;
  role?: 'customer' | 'driver' | string | null;
  notificationPreferences?: {
    inApp?: boolean;
    push?: boolean;
    sms?: boolean;
  } | null;
  pushTokens?: string[] | null;
}

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.string().optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// ==================== ADDRESSES ====================
export interface Address {
  id: string;
  userId: string;
  label: string;
  fullAddress: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  flatHouseNo: string | null;
  landmark: string | null;
  latitude: string | null;
  longitude: string | null;
  isDefault: boolean | null;
  createdAt: Date | null;
}

export const insertAddressSchema = z.object({
  userId: z.string(),
  label: z.string(),
  fullAddress: z.string(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  flatHouseNo: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  isDefault: z.boolean().optional().nullable(),
});
export type InsertAddress = z.infer<typeof insertAddressSchema>;

// ==================== CATEGORIES ====================
export interface Category {
  id: string;
  name: string;
  image: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
}

export const insertCategorySchema = z.object({
  name: z.string(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// ==================== PRODUCTS ====================
export interface Product {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  categoryId: string | null;
  originalPrice: string;
  discountPercent: number | null;
  price: string;
  rating: string | null;
  stock: number | null;
  unit: string | null;
  isActive: boolean | null;
  vendorId: string | null;
  isTrending?: boolean | null;
  fastDelivery?: boolean | null;
}

export const insertProductSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  originalPrice: z.string(),
  discountPercent: z.number().optional().nullable(),
  price: z.string(),
  rating: z.string().optional().nullable(),
  stock: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  isTrending: z.boolean().optional().nullable(),
  fastDelivery: z.boolean().optional().nullable(),
  vendorId: z.string().optional().nullable(),
});
export type InsertProduct = z.infer<typeof insertProductSchema>;

// ==================== CART ITEMS ====================
export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number | null;
  variant: string | null;
}

export const insertCartItemSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  quantity: z.number().optional().nullable(),
  variant: z.string().optional().nullable(),
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

// ==================== WISHLIST ITEMS ====================
export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
}

export const insertWishlistItemSchema = z.object({
  userId: z.string(),
  productId: z.string(),
});
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

// ==================== ORDERS ====================
export interface Order {
  id: string;
  orderNumber: string | null;
  userId: string;
  items: any;
  totalAmount: string;
  status: string | null;
  deliveryAddress: string;
  deliverySlot: string | null;
  paymentMethod: string | null;
  paymentId: string | null;
  createdAt: Date | null;
}

export const insertOrderSchema = z.object({
  userId: z.string(),
  items: z.any(),
  totalAmount: z.string(),
  status: z.string().optional().nullable(),
  deliveryAddress: z.string(),
  deliverySlot: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// ==================== BANNERS ====================
export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
}

export const insertBannerSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});
export type InsertBanner = z.infer<typeof insertBannerSchema>;

// ==================== SERVICES ====================
export interface Service {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
}

export const insertServiceSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});
export type InsertService = z.infer<typeof insertServiceSchema>;

// ==================== SUPPORT TICKETS ====================
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const insertSupportTicketSchema = z.object({
  userId: z.string(),
  subject: z.string(),
  status: z.string().optional(),
});
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  image: string | null;
  isAdmin: boolean | null;
  createdAt: Date | null;
}

export const insertTicketMessageSchema = z.object({
  ticketId: z.string(),
  senderId: z.string(),
  message: z.string(),
  image: z.string().optional().nullable(),
  isAdmin: z.boolean().optional().nullable(),
});
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

export type SupportTicketWithMessages = SupportTicket & {
  messages: TicketMessage[];
  username?: string;
  userName?: string;
};

// ==================== CATEGORY ADS ====================
export interface CategoryAd {
  id: string;
  title: string;
  image: string | null;
  categoryId: string | null;
  linkUrl: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
}

export const insertCategoryAdSchema = z.object({
  title: z.string(),
  image: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});
export type InsertCategoryAd = z.infer<typeof insertCategoryAdSchema>;

// ==================== VENDOR APPLICATIONS ====================
export interface VendorApplication {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceType: string;
  description: string | null;
  address: string | null;
  username: string;
  password: string;
  certificates: string[];
  status: string;
  adminNote: string | null;
  createdAt: Date | null;
}

export const insertVendorApplicationSchema = z.object({
  businessName: z.string(),
  ownerName: z.string(),
  email: z.string(),
  phone: z.string(),
  serviceType: z.string(),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  username: z.string(),
  password: z.string(),
  certificates: z.array(z.string()),
});
export type InsertVendorApplication = z.infer<typeof insertVendorApplicationSchema>;

// Composite types
export type CartItemWithProduct = CartItem & { product: Product };
export type WishlistItemWithProduct = WishlistItem & { product: Product };

export interface OrderItem {
  productId: string;
  name: string;
  price: string;
  quantity: number;
  image?: string;
}

// ==================== E-COMMERCE ====================
export interface EcomCategory {
  id: string;
  name: string;
  image: string | null;
  parentId: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
}

export const insertEcomCategorySchema = z.object({
  name: z.string(),
  image: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});
export type InsertEcomCategory = z.infer<typeof insertEcomCategorySchema>;

export interface EcomProduct {
  id: string;
  name: string;
  description: string | null;
  images: string[] | null;
  categoryId: string | null;
  vendorId: string | null;
  brand: string | null;
  sku: string | null;
  originalPrice: string;
  discountPercent: number | null;
  price: string;
  variants: any;
  specifications: any;
  stock: number | null;
  rating: string | null;
  reviewCount: number | null;
  isActive: boolean | null;
  isApproved: boolean | null;
  isFeatured: boolean | null;
  isInstantDelivery: boolean | null;
  createdAt: Date | null;
  isTrending?: boolean | null;
}

export const insertEcomProductSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  originalPrice: z.string(),
  discountPercent: z.number().optional().nullable(),
  price: z.string(),
  variants: z.any().optional(),
  specifications: z.any().optional(),
  stock: z.number().optional().nullable(),
  isTrending: z.boolean().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  isApproved: z.boolean().optional().nullable(),
  isFeatured: z.boolean().optional().nullable(),
  isInstantDelivery: z.boolean().optional().nullable(),
});
export type InsertEcomProduct = z.infer<typeof insertEcomProductSchema>;

export interface EcomReview {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: Date | null;
}

export const insertEcomReviewSchema = z.object({
  productId: z.string(),
  userId: z.string(),
  rating: z.number(),
  title: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
});
export type InsertEcomReview = z.infer<typeof insertEcomReviewSchema>;

// ==================== USER PROFILE ====================
export interface UserProfile {
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  addresses: Address[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SellerProfile {
  id: string;
  userId: string;
  storeName: string;
  storeDescription: string | null;
  logo: string | null;
  banner: string | null;
  commissionRate: string | null;
  walletBalance: string | null;
  bankDetails: any;
  isActive: boolean | null;
  createdAt: Date | null;
}

export const insertSellerProfileSchema = z.object({
  userId: z.string(),
  storeName: z.string(),
  storeDescription: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  banner: z.string().optional().nullable(),
  commissionRate: z.string().optional().nullable(),
  bankDetails: z.any().optional(),
  isActive: z.boolean().optional().nullable(),
});
export type InsertSellerProfile = z.infer<typeof insertSellerProfileSchema>;

export interface EcomCartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number | null;
  variant: string | null;
}

export const insertEcomCartItemSchema = z.object({
  userId: z.string(),
  productId: z.string(),
  quantity: z.number().optional().nullable(),
  variant: z.string().optional().nullable(),
});
export type InsertEcomCartItem = z.infer<typeof insertEcomCartItemSchema>;

export interface EcomWishlistItem {
  id: string;
  userId: string;
  productId: string;
}

export const insertEcomWishlistItemSchema = z.object({
  userId: z.string(),
  productId: z.string(),
});
export type InsertEcomWishlistItem = z.infer<typeof insertEcomWishlistItemSchema>;

export interface EcomOrder {
  id: string;
  orderNumber: string | null;
  userId: string;
  vendorId: string | null;
  items: any;
  totalAmount: string;
  status: string | null;
  deliveryAddress: string;
  paymentMethod: string | null;
  paymentId: string | null;
  trackingNumber: string | null;
  createdAt: Date | null;
}

export const insertEcomOrderSchema = z.object({
  userId: z.string(),
  vendorId: z.string().optional().nullable(),
  items: z.any(),
  totalAmount: z.string(),
  status: z.string().optional().nullable(),
  deliveryAddress: z.string(),
  paymentMethod: z.string().optional().nullable(),
  paymentId: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
});
export type InsertEcomOrder = z.infer<typeof insertEcomOrderSchema>;

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

// ==================== FOOD DELIVERY ====================
export interface FoodRestaurant {
  id: string;
  name: string;
  image: string | null;
  cuisine: string[] | null;
  rating: string | null;
  deliveryTime: string | null;
  minOrder: string | null;
  isActive: boolean | null;
  address: string | null;
  ownerId: string | null;
  description: string | null;
  openingTime: string | null;
  closingTime: string | null;
}

export const insertFoodRestaurantSchema = z.object({
  name: z.string(),
  image: z.string().optional().nullable(),
  cuisine: z.array(z.string()).optional().nullable(),
  rating: z.string().optional().nullable(),
  deliveryTime: z.string().optional().nullable(),
  minOrder: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  address: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  openingTime: z.string().optional().nullable(),
  closingTime: z.string().optional().nullable(),
});
export type InsertFoodRestaurant = z.infer<typeof insertFoodRestaurantSchema>;

export interface FoodMenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  category: string | null;
  isVeg: boolean | null;
  isAvailable: boolean | null;
}

export const insertFoodMenuItemSchema = z.object({
  restaurantId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  price: z.string(),
  image: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  isVeg: z.boolean().optional().nullable(),
  isAvailable: z.boolean().optional().nullable(),
});
export type InsertFoodMenuItem = z.infer<typeof insertFoodMenuItemSchema>;

export interface FoodOrder {
  id: string;
  userId: string;
  restaurantId: string;
  items: any;
  totalAmount: string;
  deliveryFee: string | null;
  status: string | null;
  deliveryAddress: string;
  createdAt: Date | null;
}

export const insertFoodOrderSchema = z.object({
  userId: z.string(),
  restaurantId: z.string(),
  items: z.any(),
  totalAmount: z.string(),
  deliveryFee: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  deliveryAddress: z.string(),
});
export type InsertFoodOrder = z.infer<typeof insertFoodOrderSchema>;

// ==================== FOOD MEAL SUBSCRIPTIONS ====================
export type MealPlanMealType = "breakfast" | "lunch" | "dinner" | "full_day" | "weekly" | "monthly";
export type MealPlanDietType = "veg" | "non_veg" | "egg";
export type FoodSubscriptionStatus = "active" | "paused" | "cancelled" | "expired";
export type FoodSubscriptionPaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface FoodMealPlan {
  id: string;
  name: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  mealType: MealPlanMealType;
  cuisine: string;
  calories?: number | null;
  dietType: MealPlanDietType;
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  rating?: number | null;
  includedMeals: string[];
  duration: "daily" | "weekly" | "monthly";
  menuCalendar?: Record<string, any> | null;
  dietaryTags?: string[] | null;
  isActive: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface FoodSubscription {
  id: string;
  userId: string;
  planId: string;
  planSnapshot: Partial<FoodMealPlan>;
  preferences: {
    dietType: MealPlanDietType;
    spiceLevel: string;
    allergies: string[];
    dislikedIngredients: string[];
    calorieTarget?: number | null;
    cuisinePreference?: string | null;
    deliveryInstructions?: string | null;
  };
  schedule: {
    startDate: string;
    endDate: string;
    daysOfWeek: string[];
    mealSlots: string[];
    deliveryWindow: string;
    addressId?: string | null;
    addressText: string;
  };
  status: FoodSubscriptionStatus;
  paymentStatus: FoodSubscriptionPaymentStatus;
  amount: number;
  paymentCycle?: "weekly" | "monthly";
  remainingDays: number;
  nextDeliveryDate?: string | null;
  customerName?: string | null;
  phone?: string | null;
  pause?: { startDate: string; endDate: string; reason?: string | null } | null;
  cancellationReason?: string | null;
  refundNote?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface FoodOrderItem {
  menuItemId: string;
  name: string;
  price: string;
  quantity: number;
  isVeg?: boolean;
}

// ==================== CITY MOVING ====================
export interface MovingVehicleType {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: string;
  pricePerKm: string;
  capacity: string | null;
  icon: string | null;
}

export const insertMovingVehicleTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  basePrice: z.string(),
  pricePerKm: z.string(),
  capacity: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});
export type InsertMovingVehicleType = z.infer<typeof insertMovingVehicleTypeSchema>;

export interface MovingDriver {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  vehicleTypeId: string | null;
  vehicleNumber: string | null;
  isAvailable: boolean | null;
  rating: string | null;
}

export const insertMovingDriverSchema = z.object({
  userId: z.string(),
  name: z.string(),
  phone: z.string().optional().nullable(),
  vehicleTypeId: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  isAvailable: z.boolean().optional().nullable(),
  rating: z.string().optional().nullable(),
});
export type InsertMovingDriver = z.infer<typeof insertMovingDriverSchema>;

export interface MovingBooking {
  id: string;
  userId: string;
  vehicleTypeId: string;
  driverId: string | null;
  pickupAddress: string;
  dropAddress: string;
  pickupLat: string | null;
  pickupLng: string | null;
  dropLat: string | null;
  dropLng: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  estimatedPrice: string | null;
  actualPrice: string | null;
  status: string | null;
  helpersCount: number | null;
  description: string | null;
  trackingNumber: string | null;
  createdAt: Date | null;
}

export const insertMovingBookingSchema = z.object({
  userId: z.string(),
  vehicleTypeId: z.string(),
  driverId: z.string().optional().nullable(),
  pickupAddress: z.string(),
  dropAddress: z.string(),
  pickupLat: z.string().optional().nullable(),
  pickupLng: z.string().optional().nullable(),
  dropLat: z.string().optional().nullable(),
  dropLng: z.string().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  estimatedPrice: z.string().optional().nullable(),
  actualPrice: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  helpersCount: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
});
export type InsertMovingBooking = z.infer<typeof insertMovingBookingSchema>;

// ==================== HOTEL ====================
export interface Hotel {
  id: string;
  name: string;
  description: string | null;
  images: string[] | null;
  city: string;
  address: string | null;
  rating: string | null;
  amenities: string[] | null;
  starRating: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  isActive: boolean | null;
  managerId: string | null;
}

export const insertHotelSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  city: z.string(),
  address: z.string().optional().nullable(),
  rating: z.string().optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),
  starRating: z.number().optional().nullable(),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  managerId: z.string().optional().nullable(),
});
export type InsertHotel = z.infer<typeof insertHotelSchema>;

export interface HotelRoom {
  id: string;
  hotelId: string;
  type: string;
  name: string;
  price: string;
  dynamicPrice?: number | null;
  priceBadge?: string | null;
  priceChanged?: boolean | null;
  pricingBreakdown?: HotelPriceCalculation | null;
  maxGuests: number | null;
  amenities: string[] | null;
  images: string[] | null;
  isAvailable: boolean | null;
  totalRooms: number | null;
  availableRooms: number | null;
}

export const insertHotelRoomSchema = z.object({
  hotelId: z.string(),
  type: z.string(),
  name: z.string(),
  price: z.string(),
  maxGuests: z.number().optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  isAvailable: z.boolean().optional().nullable(),
  totalRooms: z.number().optional().nullable(),
  availableRooms: z.number().optional().nullable(),
});
export type InsertHotelRoom = z.infer<typeof insertHotelRoomSchema>;

export interface HotelBooking {
  id: string;
  userId: string;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number | null;
  basePrice?: string | null;
  dynamicPrice?: string | null;
  appliedRules?: HotelAppliedPricingRule[] | null;
  nights?: number | null;
  totalPrice: string;
  status: string | null;
  guestName: string | null;
  guestPhone: string | null;
  specialRequests: string | null;
  createdAt: Date | null;
}

export const insertHotelBookingSchema = z.object({
  userId: z.string(),
  hotelId: z.string(),
  roomId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().optional().nullable(),
  basePrice: z.string().optional().nullable(),
  dynamicPrice: z.string().optional().nullable(),
  appliedRules: z.array(z.any()).optional().nullable(),
  nights: z.number().optional().nullable(),
  totalPrice: z.string(),
  status: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
  guestPhone: z.string().optional().nullable(),
  specialRequests: z.string().optional().nullable(),
});
export type InsertHotelBooking = z.infer<typeof insertHotelBookingSchema>;

export type HotelPricingRuleType = "weekend" | "holiday" | "demand" | "season" | "availability" | "manual_override";

export interface HotelPricingRule {
  id: string;
  name: string;
  type: HotelPricingRuleType;
  multiplier: number | null;
  fixedPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  startDate: string | null;
  endDate: string | null;
  hotelId: string | null;
  roomId: string | null;
  enabled: boolean;
  priority: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export const hotelPricingRuleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["weekend", "holiday", "demand", "season", "availability", "manual_override"]),
  multiplier: z.coerce.number().min(0.01).max(10).optional().nullable(),
  fixedPrice: z.coerce.number().min(0).optional().nullable(),
  minPrice: z.coerce.number().min(0).optional().nullable(),
  maxPrice: z.coerce.number().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  hotelId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  priority: z.coerce.number().int().default(100),
}).refine((value) => {
  if (value.type !== "manual_override") return value.multiplier != null || value.minPrice != null || value.maxPrice != null;
  return value.fixedPrice != null;
}, { message: "Multiplier or fixed price is required" }).refine((value) => {
  if (!value.startDate || !value.endDate) return true;
  return new Date(value.endDate) >= new Date(value.startDate);
}, { message: "End date must be on or after start date" });

export type InsertHotelPricingRule = z.infer<typeof hotelPricingRuleSchema>;

export interface HotelAppliedPricingRule {
  id: string;
  name: string;
  type: HotelPricingRuleType;
  multiplier?: number | null;
  fixedPrice?: number | null;
  amountBefore: number;
  amountAfter: number;
}

export interface HotelPriceCalculation {
  enabled: boolean;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  basePrice: number;
  dynamicPrice: number;
  totalPrice: number;
  availableRooms: number;
  totalRooms: number;
  bookedRooms: number;
  appliedRules: HotelAppliedPricingRule[];
  badge: string | null;
  fixedOverride: boolean;
}

// ==================== TAXI ====================
export interface TaxiVehicleType {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  baseFare: string;
  perKmRate: string;
  perMinRate: string;
  capacity: number | null;
  icon: string | null;
}

export const insertTaxiVehicleTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  baseFare: z.string(),
  perKmRate: z.string(),
  perMinRate: z.string(),
  capacity: z.number().optional().nullable(),
  icon: z.string().optional().nullable(),
});
export type InsertTaxiVehicleType = z.infer<typeof insertTaxiVehicleTypeSchema>;

export interface TaxiDriver {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  vehicleTypeId: string | null;
  vehicleType?: string | null;
  vehicleNumber: string | null;
  licenseNumber: string | null;
  profilePhoto?: string | null;
  licenseFrontPhoto?: string | null;
  licenseBackPhoto?: string | null;
  rcBookNumber?: string | null;
  rcBookFrontPhoto?: string | null;
  rcBookBackPhoto?: string | null;
  isOnline: boolean | null;
  rating: string | null;
  currentLat: string | null;
  currentLng: string | null;
}

export interface TaxiDocument {
  id: string;
  documentType: string;
  objectPath: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  uploadedAt?: Date;
  verifiedAt?: Date | null;
  reviewer?: string | null;
}

// extend TaxiDriver with optional documents and verification metadata
export interface TaxiDriverWithDocs extends TaxiDriver {
  documents?: TaxiDocument[];
  verification?: any;
}

export interface AdminSettings {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  surgeFactor: number;
  commissionPercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==================== TAXI PRICING ====================
export interface TaxiPricing {
  id: string;
  name?: string;
  timeSlot?: string; // e.g., "Night"
  startTime: string; // "00:00"
  endTime: string; // "06:00"
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  surgeMultiplier?: number;
  minimumFare?: number;
  bookingFee?: number;
  isActive?: boolean;
  isHolidayOverride?: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export const insertTaxiPricingSchema = z.object({
  name: z.string().optional(),
  timeSlot: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  baseFare: z.number(),
  perKmRate: z.number(),
  perMinuteRate: z.number(),
  surgeMultiplier: z.number().optional(),
  minimumFare: z.number().optional(),
  bookingFee: z.number().optional(),
  isActive: z.boolean().optional(),
});
export type InsertTaxiPricing = z.infer<typeof insertTaxiPricingSchema>;

export const insertTaxiDriverSchema = z.object({
  userId: z.string(),
  name: z.string(),
  phone: z.string().optional().nullable(),
  vehicleTypeId: z.string().optional().nullable(),
  vehicleType: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
  licenseFrontPhoto: z.string().optional().nullable(),
  licenseBackPhoto: z.string().optional().nullable(),
  rcBookNumber: z.string().optional().nullable(),
  rcBookFrontPhoto: z.string().optional().nullable(),
  rcBookBackPhoto: z.string().optional().nullable(),
  isOnline: z.boolean().optional().nullable(),
  rating: z.string().optional().nullable(),
  currentLat: z.string().optional().nullable(),
  currentLng: z.string().optional().nullable(),
});
export type InsertTaxiDriver = z.infer<typeof insertTaxiDriverSchema>;

export interface TaxiRide {
  id: string;
  userId: string;
  driverId: string | null;
  vehicleTypeId: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLat: string | null;
  pickupLng: string | null;
  dropLat: string | null;
  dropLng: string | null;
  estimatedFare: string | null;
  actualFare: string | null;
  distance: string | null;
  duration: number | null;
  status: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  assignedByAdmin?: boolean | null;
  assignmentHistory?: { previousDriver?: string | null; reassignedDriver: string; timestamp: Date; assignedByAdmin?: boolean }[] | null;
  rating: number | null;
  createdAt: Date | null;
}

export const insertTaxiRideSchema = z.object({
  userId: z.string(),
  driverId: z.string().optional().nullable(),
  vehicleTypeId: z.string(),
  pickupAddress: z.string(),
  dropAddress: z.string(),
  pickupLat: z.string().optional().nullable(),
  pickupLng: z.string().optional().nullable(),
  dropLat: z.string().optional().nullable(),
  dropLng: z.string().optional().nullable(),
  estimatedFare: z.string().optional().nullable(),
  actualFare: z.string().optional().nullable(),
  distance: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  driverPhone: z.string().optional().nullable(),
  assignedByAdmin: z.boolean().optional().nullable(),
  assignmentHistory: z.array(z.object({ previousDriver: z.string().optional().nullable(), reassignedDriver: z.string(), timestamp: z.any(), assignedByAdmin: z.boolean().optional() })).optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
});
export type InsertTaxiRide = z.infer<typeof insertTaxiRideSchema>;

// ==================== CITY SERVICES ====================
export interface CityServiceCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  icon: string | null;
}

export const insertCityServiceCategorySchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});
export type InsertCityServiceCategory = z.infer<typeof insertCityServiceCategorySchema>;

export interface CityService {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  image: string | null;
  price: string;
  duration: string | null;
  rating: string | null;
  reviewCount: number | null;
  isActive: boolean | null;
}

export const insertCityServiceSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  price: z.string(),
  duration: z.string().optional().nullable(),
  rating: z.string().optional().nullable(),
  reviewCount: z.number().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
});
export type InsertCityService = z.infer<typeof insertCityServiceSchema>;

export interface CityServiceProvider {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  specializations: string[] | null;
  experience: string | null;
  rating: string | null;
  isAvailable: boolean | null;
  isAgency: boolean | null;
  agencyName: string | null;
}

export const insertCityServiceProviderSchema = z.object({
  userId: z.string(),
  name: z.string(),
  phone: z.string().optional().nullable(),
  specializations: z.array(z.string()).optional().nullable(),
  experience: z.string().optional().nullable(),
  rating: z.string().optional().nullable(),
  isAvailable: z.boolean().optional().nullable(),
  isAgency: z.boolean().optional().nullable(),
  agencyName: z.string().optional().nullable(),
});
export type InsertCityServiceProvider = z.infer<typeof insertCityServiceProviderSchema>;

export interface CityServiceBooking {
  id: string;
  userId: string;
  serviceId: string;
  providerId: string | null;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: string | null;
  totalPrice: string;
  rating: number | null;
  notes: string | null;
  professionalName: string | null;
  professionalPhone: string | null;
  createdAt: Date | null;
}

export const insertCityServiceBookingSchema = z.object({
  userId: z.string(),
  serviceId: z.string(),
  providerId: z.string().optional().nullable(),
  scheduledDate: z.string(),
  scheduledTime: z.string(),
  address: z.string(),
  status: z.string().optional().nullable(),
  totalPrice: z.string(),
  rating: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  professionalName: z.string().optional().nullable(),
  professionalPhone: z.string().optional().nullable(),
});
export type InsertCityServiceBooking = z.infer<typeof insertCityServiceBookingSchema>;
