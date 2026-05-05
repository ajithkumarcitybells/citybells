import { getDb } from "./db";
import { hashPassword } from "./auth";

// Minimal seeding performed at startup to ensure essential records exist.
export async function runSeed(): Promise<void> {
  try {
    console.log("Starting minimal database seeding...");
    const db = getDb();

    // Seed admin user (minimal)
    console.log("Seeding admin user...");
    const existingAdmin = await db.collection('users').findOne({ username: 'admin' });
    if (!existingAdmin) {
      const adminPassword = await hashPassword('admin123');
      await db.collection('users').insertOne({ username: 'admin', password: adminPassword, name: 'Admin User', email: 'admin@city-hub.com', phone: '9999999999', isVendor: false, createdAt: new Date() });
      console.log('Admin user created (username: admin, password: admin123)');
    }

    // Seed a few delivery hubs if none exist
    console.log('Seeding delivery hubs...');
    const existingHubs = await db.collection('delivery_hubs').find().limit(1).toArray();
    if (existingHubs.length === 0) {
      await db.collection('delivery_hubs').insertMany([
        { state: 'Puducherry', city: 'Puducherry', pincode: '605001', active: true, createdAt: new Date() },
        { state: 'Puducherry', city: 'Puducherry', pincode: '605004', active: true, createdAt: new Date() },
        { state: 'Puducherry', city: 'Puducherry', pincode: '605008', active: true, createdAt: new Date() },
        { state: 'Puducherry', city: 'Puducherry', pincode: '605011', active: true, createdAt: new Date() },
      ]);
      console.log('Seeded 4 Puducherry delivery hubs');
    }

    // Seed taxi vehicle types if none exist
    console.log('Seeding taxi vehicle types...');
    try {
      const existingVehicleTypes = await db.collection('taxi_vehicle_types').find().limit(1).toArray();
      if (existingVehicleTypes.length === 0) {
        const now = new Date();
        const vehicleTypes = [
          { name: 'Auto', baseFare: '20.00', perKmRate: '10.00', perMinRate: '0.50', type: 'auto', createdAt: now },
          { name: 'Mini', baseFare: '30.00', perKmRate: '12.00', perMinRate: '0.60', type: 'car', createdAt: now },
          { name: 'Sedan', baseFare: '40.00', perKmRate: '15.00', perMinRate: '0.75', type: 'car', createdAt: now },
          { name: 'SUV', baseFare: '60.00', perKmRate: '20.00', perMinRate: '1.00', type: 'car', createdAt: now },
          { name: 'Bike', baseFare: '10.00', perKmRate: '6.00', perMinRate: '0.30', type: 'bike', createdAt: now },
        ];
        const result = await db.collection('taxi_vehicle_types').insertMany(vehicleTypes);
        console.log(`Seeded ${result.insertedCount} taxi vehicle types`);
      } else {
        console.log('Taxi vehicle types already exist, skipping seed');
      }
    } catch (vehicleTypeErr) {
      console.error('Error seeding taxi vehicle types:', vehicleTypeErr);
    }

    console.log('Minimal seed complete');
  } catch (err) {
    console.error('Seed failed:', err);
  }
}
