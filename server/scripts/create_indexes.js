#!/usr/bin/env node
/* Create DB indexes for faster autocomplete and search
   Usage:
     MONGODB_URI="..." node server/scripts/create_indexes.js
   Or with .env loaded by your environment (development):
     cross-env MONGODB_URI="..." node server/scripts/create_indexes.js
*/
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dbName = process.env.MONGODB_DB || 'city_serve_hub';

if (!uri) {
  console.error('MONGODB_URI env var is required');
  process.exit(2);
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log('Connected to', dbName);

    const ops = [];
    ops.push(db.collection('orders').createIndex({ createdAt: -1 }));
    ops.push(db.collection('orders').createIndex({ 'items.productId': 1 }));
    ops.push(db.collection('products').createIndex({ categoryId: 1 }));
    ops.push(db.collection('products').createIndex({ tags: 1 }));
    ops.push(db.collection('products').createIndex({ isActive: 1 }));

    // Hotel indexes
    ops.push(db.collection('hotel_rooms').createIndex({ hotelId: 1 }));
    ops.push(db.collection('hotel_rooms').createIndex({ price: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ hotelId: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ roomId: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ type: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ enabled: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ startDate: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ endDate: 1 }));
    ops.push(db.collection('hotel_pricing_rules').createIndex({ hotelId: 1, roomId: 1, type: 1, enabled: 1, startDate: 1, endDate: 1 }));

    // Food meal subscription indexes
    ops.push(db.collection('food_meal_plans').createIndex({ isActive: 1 }));
    ops.push(db.collection('food_meal_plans').createIndex({ mealType: 1, dietType: 1, cuisine: 1, duration: 1 }));
    ops.push(db.collection('food_meal_plan_calendar').createIndex({ planId: 1, date: 1 }, { unique: true }));
    ops.push(db.collection('food_subscriptions').createIndex({ userId: 1, planId: 1, status: 1 }));
    ops.push(db.collection('food_subscriptions').createIndex({ status: 1 }));
    ops.push(db.collection('food_subscriptions').createIndex({ paymentStatus: 1 }));
    ops.push(db.collection('food_subscriptions').createIndex({ 'schedule.startDate': 1, 'schedule.endDate': 1 }));
    ops.push(db.collection('food_subscription_events').createIndex({ subscriptionId: 1, createdAt: -1 }));
    ops.push(db.collection('food_subscription_payments').createIndex({ subscriptionId: 1, status: 1 }));
    ops.push(db.collection('food_subscription_payments').createIndex({ razorpayOrderId: 1 }));
    ops.push(db.collection('food_subscription_skips').createIndex({ subscriptionId: 1, date: 1, mealSlot: 1 }, { unique: true }));

    ops.push(db.collection('hotels').createIndex({ city: 1 }));
    ops.push(db.collection('hotels').createIndex({ name: 1 }));
    ops.push(db.collection('hotels').createIndex({ address: 1 }));
    ops.push(db.collection('hotels').createIndex({ isActive: 1 }));
    ops.push(db.collection('hotels').createIndex({ name: 'text', city: 'text', address: 'text' }, { name: 'hotels_text_idx', weights: { name: 10, city: 5, address: 2 }, default_language: 'english' }));

    await Promise.all(ops);
    console.log('Indexes ensured');
  } catch (err) {
    console.error('Failed to create indexes', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
