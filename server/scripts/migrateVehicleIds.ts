import { connectDb, getDb, ObjectId, client } from "../db";

async function migrate(dryRun = true) {
  await connectDb();
  const db = getDb();

  console.log('Starting taxi_vehicle_types _id migration; dryRun=' + dryRun);

  const docs = await db.collection('taxi_vehicle_types').find({ _id: { $type: 'string' } }).toArray();
  console.log('Found', docs.length, 'docs with string _id');

  let migrated = 0;
  for (const doc of docs) {
    const oldId = doc._id as string;
    try {
      if (!/^[0-9a-fA-F]{24}$/.test(oldId)) {
        console.warn('Skipping non-24-hex id:', oldId);
        continue;
      }

      const newOid = new ObjectId(oldId);

      const exists = await db.collection('taxi_vehicle_types').findOne({ _id: newOid });
      if (exists) {
        console.log('ObjectId document already exists for', oldId, '; removing legacy string doc');
        if (!dryRun) await db.collection('taxi_vehicle_types').deleteOne({ _id: oldId as any });
        migrated++;
        continue;
      }

      const newDoc = { ...doc, _id: newOid };

      console.log('Migrating', oldId, '->', newOid.toHexString());
      if (!dryRun) {
        await db.collection('taxi_vehicle_types').insertOne(newDoc);
        await db.collection('taxi_vehicle_types').deleteOne({ _id: oldId as any });
      }

      migrated++;
    } catch (e) {
      console.error('Failed migrating', oldId, e);
    }
  }

  console.log('Migration complete. migrated=', migrated);
  try {
    await client.close();
  } catch (e) {
    // ignore
  }
}

const args = process.argv.slice(2);
const dry = args.includes('--dry-run') || args.includes('-n');

migrate(dry).catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
