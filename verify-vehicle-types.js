#!/usr/bin/env node

/**
 * Verify and optionally insert vehicle types
 * Usage: node verify-vehicle-types.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017';
const DB_NAME = 'city_serve_hub';
const COLLECTION = 'taxi_vehicle_types';

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('📡 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    // Check existing vehicle types
    console.log('\n🔍 Checking existing vehicle types...');
    const existing = await collection.find().toArray();
    console.log(`Found ${existing.length} vehicle types:`);

    if (existing.length === 0) {
      console.log('❌ No vehicle types found!');
      console.log('\n📝 Inserting default vehicle types...');

      const vehicleTypes = [
        {
          name: 'Auto',
          baseFare: '20.00',
          perKmRate: '10.00',
          perMinRate: '0.50',
          type: 'auto',
          createdAt: new Date(),
        },
        {
          name: 'Mini',
          baseFare: '30.00',
          perKmRate: '12.00',
          perMinRate: '0.60',
          type: 'car',
          createdAt: new Date(),
        },
        {
          name: 'Sedan',
          baseFare: '40.00',
          perKmRate: '15.00',
          perMinRate: '0.75',
          type: 'car',
          createdAt: new Date(),
        },
        {
          name: 'SUV',
          baseFare: '60.00',
          perKmRate: '20.00',
          perMinRate: '1.00',
          type: 'car',
          createdAt: new Date(),
        },
        {
          name: 'Bike',
          baseFare: '10.00',
          perKmRate: '6.00',
          perMinRate: '0.30',
          type: 'bike',
          createdAt: new Date(),
        },
      ];

      const result = await collection.insertMany(vehicleTypes);
      console.log(`✅ Inserted ${result.insertedCount} vehicle types`);
      console.log(`   IDs: ${Object.values(result.insertedIds).join(', ')}`);
    } else {
      console.log('✅ Vehicle types exist!');
      existing.forEach((type, idx) => {
        console.log(`\n   ${idx + 1}. ${type.name}`);
        console.log(`      ID: ${type._id}`);
        console.log(`      Fare: ₹${type.baseFare} base + ₹${type.perKmRate}/km + ₹${type.perMinRate}/min`);
        console.log(`      Type: ${type.type || 'unknown'}`);
      });
    }

    console.log('\n✅ Verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
