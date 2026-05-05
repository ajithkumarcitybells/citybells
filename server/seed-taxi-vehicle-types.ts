import { getDb, connectDb } from './db';

async function seed() {
  try {
    await connectDb();
    const db = getDb();
    const existing = await db.collection('taxi_vehicle_types').find().limit(1).toArray();
    if (existing.length > 0) {
      console.log('taxi_vehicle_types already seeded');
      return;
    }

    const now = new Date();
    const types = [
      { name: 'Auto', baseFare: '20.00', pricePerKm: '10.00', pricePerMinute: '0.50', type: 'auto', createdAt: now },
      { name: 'Mini', baseFare: '30.00', pricePerKm: '12.00', pricePerMinute: '0.60', type: 'car', createdAt: now },
      { name: 'Sedan', baseFare: '40.00', pricePerKm: '15.00', pricePerMinute: '0.75', type: 'car', createdAt: now },
      { name: 'SUV', baseFare: '60.00', pricePerKm: '20.00', pricePerMinute: '1.00', type: 'car', createdAt: now },
      { name: 'Bike', baseFare: '10.00', pricePerKm: '6.00', pricePerMinute: '0.30', type: 'bike', createdAt: now },
    ];

    const res = await db.collection('taxi_vehicle_types').insertMany(types);
    console.log('Inserted taxi_vehicle_types:', res.insertedCount);
  } catch (err) {
    console.error('Failed to seed taxi_vehicle_types', err);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
