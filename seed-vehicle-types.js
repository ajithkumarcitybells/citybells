#!/usr/bin/env node
/**
 * Manual Taxi Vehicle Types Seeder
 * Run this to seed vehicle types if the endpoint isn't working
 */

const http = require('http');

async function seedVehicleTypes() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/taxi/seed-vehicle-types',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`\nStatus Code: ${res.statusCode}`);
        console.log(`Response:`);
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
          resolve(parsed);
        } catch (e) {
          console.log(data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

console.log('🚀 Seeding Taxi Vehicle Types...');
console.log('📍 Target: http://localhost:3000/api/admin/taxi/seed-vehicle-types\n');

seedVehicleTypes()
  .then((result) => {
    if (result.message) {
      console.log(`\n✅ ${result.message}`);
    }
    console.log('\n✅ Vehicle types seeded successfully!');
    console.log('You can now book taxis without the 404 error.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Failed to seed vehicle types');
    console.error('Make sure:');
    console.error('  1. Server is running on port 3000');
    console.error('  2. You have admin access');
    console.error('  3. MongoDB is running\n');
    process.exit(1);
  });
