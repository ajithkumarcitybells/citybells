import "dotenv/config";
import { connectDb, getDb } from "../db";
import { ObjectId } from "mongodb";

async function run() {
  await connectDb();
  const db = getDb();
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: tsx server/scripts/checkVehicle.ts <id>');
    process.exit(1);
  }
  try {
    const byObjectId = await db.collection('taxi_vehicle_types').findOne({ _id: new ObjectId(id) });
    console.log('byObjectId:', !!byObjectId, byObjectId || null);
    const byIdField = await db.collection('taxi_vehicle_types').findOne({ id });
    console.log('byIdField:', !!byIdField, byIdField || null);
    const byName = await db.collection('taxi_vehicle_types').findOne({ name: id });
    console.log('byName:', !!byName, byName || null);

    const all = await db.collection('taxi_vehicle_types').find().toArray();
    console.log('ALL vehicle types count:', all.length);
    for (const d of all) {
      console.log(' - _id:', d._id?.toString(), 'type:', typeof d._id, 'ctor:', d._id?.constructor?.name, 'name:', d.name, 'baseFare:', d.baseFare);
    }
  } catch (e:any) {
    console.error('Error:', e.message || e);
  } finally {
    process.exit(0);
  }
}

run();
