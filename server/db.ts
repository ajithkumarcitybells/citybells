import { MongoClient, Db, Collection, ObjectId } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI must be set. Did you forget to add it to .env?");
}

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = process.env.MONGODB_DB || "city_serve_hub";

let _db: Db;

export async function connectDb(): Promise<Db> {
  if (_db) return _db;
  await client.connect();
  _db = client.db(dbName);
  console.log(`Connected to MongoDB: ${dbName}`);
  // ensure common indexes used by recommendation queries
  try {
    await ensureIndexes(_db);
  } catch (e) {
    console.error('Failed to ensure indexes:', e);
  }
  return _db;
}

export function getDb(): Db {
  if (!_db) throw new Error("Database not connected. Call connectDb() first.");
  return _db;
}

// Helper: convert MongoDB _id to our string id format
export function toDoc<T>(doc: any): T {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest } as T;
}

export function toDocs<T>(docs: any[]): T[] {
  return docs.map((d) => toDoc<T>(d));
}

// Helper: generate a new id
export function newId(): string {
  return new ObjectId().toString();
}

// Helper: convert string id to ObjectId for queries
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id);
}

export { client, ObjectId };

export async function ensureIndexes(db?: Db) {
  const _d = db || _db || client.db(dbName);
  try {
    await Promise.all([
      _d.collection('orders').createIndex({ createdAt: -1 }),
      _d.collection('orders').createIndex({ 'items.productId': 1 }),
      _d.collection('products').createIndex({ categoryId: 1 }),
      _d.collection('products').createIndex({ tags: 1 }),
      _d.collection('products').createIndex({ isActive: 1 }),
      _d.collection('products').createIndex({ fastDelivery: 1 }),
      _d.collection('products').createIndex({ fastDeliveryEnabled: 1 }),
      _d.collection('products').createIndex({ fastDeliveryAreas: 1 }),
      _d.collection('products').createIndex({ fastDeliveryStock: 1 }),
      _d.collection('products').createIndex({ fastDelivery: 1, fastDeliveryEnabled: 1, stock: 1, fastDeliveryStock: 1 }),
      _d.collection('products').createIndex({ subscriberDeal: 1, subscriberDiscountPercent: 1 }),
      _d.collection('products').createIndex({ earlyAccess: 1, earlyAccessUntil: 1 }),
      _d.collection('products').createIndex({ isTrending: 1 }),
      _d.collection('products').createIndex({ trendingScore: -1 }),
      _d.collection('orders').createIndex({ quickDelivery: 1, status: 1 }),
      _d.collection('orders').createIndex({ isSubscriberOrder: 1, priorityDelivery: 1 }),
      _d.collection('grocery_subscription_plans').createIndex({ isActive: 1, sortOrder: 1 }),
      _d.collection('grocery_user_subscriptions').createIndex({ userId: 1, status: 1, endDate: 1 }),
      _d.collection('grocery_user_subscriptions').createIndex({ userId: 1, planId: 1, status: 1 }),
      _d.collection('grocery_rewards_wallets').createIndex({ userId: 1 }, { unique: true }),
      _d.collection('grocery_reward_transactions').createIndex({ userId: 1, createdAt: -1 }),
      _d.collection('grocery_recurring_orders').createIndex({ userId: 1, status: 1, nextRunAt: 1 }),
      _d.collection('grocery_subscription_boxes').createIndex({ isActive: 1, cadence: 1 }),
      _d.collection('grocery_subscriber_deals').createIndex({ productId: 1, active: 1 }),
      _d.collection('grocery_early_access_rules').createIndex({ productId: 1, active: 1, startsAt: 1, endsAt: 1 }),
      _d.collection('events').createIndex({ userId: 1 }),
      _d.collection('events').createIndex({ type: 1 }),
      _d.collection('events').createIndex({ createdAt: -1 }),
      _d.collection('users').createIndex({ phone: 1, role: 1 }),
      _d.collection('phone_otps').createIndex({ phone: 1, role: 1, createdAt: -1 }),
      _d.collection('phone_otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      _d.collection('taxi_rides').createIndex({ driverId: 1, status: 1 }),
      _d.collection('taxi_rides').createIndex({ bookingType: 1, scheduledPickupAt: 1, status: 1 }),
      _d.collection('taxi_rides').createIndex({ bookingType: 1, userId: 1, scheduledPickupAt: 1 }),
      _d.collection('taxi_scheduled_ride_events').createIndex({ rideId: 1, createdAt: -1 }),
      _d.collection('taxi_scheduled_ride_events').createIndex({ type: 1, createdAt: -1 }),
      _d.collection('taxi_rides').createIndex({ rideStartOtpExpiresAt: 1 }),
      _d.collection('taxi_rides').createIndex({ etaGeneratedAt: -1 }),
      _d.collection('taxi_safety_events').createIndex({ rideId: 1, createdAt: -1 }),
      _d.collection('taxi_safety_events').createIndex({ type: 1, status: 1, createdAt: -1 }),
      // Hotel-related indexes
      _d.collection('hotel_rooms').createIndex({ hotelId: 1 }),
      _d.collection('hotel_rooms').createIndex({ price: 1 }),
      _d.collection('hotel_rooms').createIndex({ hotelId: 1, maxGuests: 1, availableRooms: 1 }),
      _d.collection('hotel_bookings').createIndex({ hotelId: 1, roomId: 1, checkIn: 1, checkOut: 1, status: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ hotelId: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ roomId: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ type: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ enabled: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ startDate: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ endDate: 1 }),
      _d.collection('hotel_pricing_rules').createIndex({ hotelId: 1, roomId: 1, type: 1, enabled: 1, startDate: 1, endDate: 1 }),
      _d.collection('food_meal_plans').createIndex({ isActive: 1 }),
      _d.collection('food_meal_plans').createIndex({ mealType: 1, dietType: 1, cuisine: 1, duration: 1 }),
      _d.collection('food_meal_plan_calendar').createIndex({ planId: 1, date: 1 }, { unique: true }),
      _d.collection('food_subscriptions').createIndex({ userId: 1, planId: 1, status: 1 }),
      _d.collection('food_subscriptions').createIndex({ status: 1 }),
      _d.collection('food_subscriptions').createIndex({ paymentStatus: 1 }),
      _d.collection('food_subscriptions').createIndex({ "schedule.startDate": 1, "schedule.endDate": 1 }),
      _d.collection('food_subscription_events').createIndex({ subscriptionId: 1, createdAt: -1 }),
      _d.collection('food_subscription_payments').createIndex({ subscriptionId: 1, status: 1 }),
      _d.collection('food_subscription_payments').createIndex({ razorpayOrderId: 1 }),
      _d.collection('food_subscription_skips').createIndex({ subscriptionId: 1, date: 1, mealSlot: 1 }, { unique: true }),
      _d.collection('hotels').createIndex({ city: 1 }),
      _d.collection('hotels').createIndex({ rating: -1 }),
      _d.collection('hotels').createIndex({ starRating: -1 }),
      _d.collection('hotels').createIndex({ propertyType: 1 }),
      _d.collection('hotels').createIndex({ amenities: 1 }),
      // Single-field indexes for faster lookups
      _d.collection('hotels').createIndex({ name: 1 }),
      _d.collection('hotels').createIndex({ address: 1 }),
      _d.collection('hotels').createIndex({ isActive: 1 }),
      // Text index to support tokenized search across name/city/address for autocomplete
      _d.collection('hotels').createIndex({ name: "text", city: "text", address: "text" }, { name: 'hotels_text_idx', weights: { name: 10, city: 5, address: 2 }, default_language: 'english' }),
    ]);
    console.log('Ensured database indexes for recommendation subsystem');
  } catch (e) {
    console.error('Error creating indexes:', e);
  }
}
