const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'city_serve_hub';

if (!uri) {
  console.error('MONGODB_URI not set. Set it in your environment to run this script.');
  process.exit(2);
}

(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = ['hotel_rooms', 'hotels', 'hotel_reviews'];
    for (const name of collections) {
      try {
        const exists = (await db.listCollections({ name }).toArray()).length > 0;
        if (!exists) {
          console.log(`Collection not found: ${name}`);
          continue;
        }
        const idx = await db.collection(name).indexes();
        console.log(`Indexes for ${name}:`);
        for (const i of idx) {
          console.log(`  - ${i.name}: ${JSON.stringify(i.key)}`);
        }
      } catch (e) {
        console.error(`Failed to list indexes for ${name}:`, e.message || e);
      }
    }
    await client.close();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message || err);
    process.exit(1);
  }
})();
