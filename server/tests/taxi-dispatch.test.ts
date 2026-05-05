import request from "supertest";
import express from "express";
import { registerRoutes } from "../routes";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { connectDb, getDb, toObjectId, newId } from "../db";
import { taxiStorage } from "../taxi-storage";
import { storage } from "../storage";

let server: any;

beforeAll(async () => {
  await connectDb();
  const app = express();
  app.use(express.json({ limit: '20mb', verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.use(express.urlencoded({ extended: false }));
  server = await registerRoutes(app);
});

afterAll(async () => {
  if (server && server.close) await new Promise((r) => server.close(r));
});

describe('Taxi dispatch admin APIs', () => {
  it('returns only online and non-busy drivers from /api/admin/taxi/drivers/available', async () => {
    const agent = request.agent(server);

    // create admin user and mark as admin
    const adminUser = `admin_${Date.now()}@example.com`;
    const adminPass = 'adminpass';
    const reg = await agent.post('/api/register').send({ username: adminUser, password: adminPass, name: 'Admin' });
    expect(reg.status).toBe(201);
    const db = getDb();
    // user _id is stored as a string in tests; update using the string id
    await db.collection('users').updateOne({ _id: reg.body.id }, { $set: { isAdmin: true } });
    // re-login so the session's deserialized user reflects isAdmin=true
    const loginRes = await agent.post('/api/login').send({ username: adminUser, password: adminPass });
    expect(loginRes.status).toBe(200);

    // create three drivers
    const drvUsers = [newId(), newId(), newId()];
    const d1 = await taxiStorage.createTaxiDriver({ userId: drvUsers[0], name: 'D One', phone: '111', licenseNumber: 'L1', vehicleTypeId: '', vehicleNumber: 'V1' });
    const d2 = await taxiStorage.createTaxiDriver({ userId: drvUsers[1], name: 'D Two', phone: '222', licenseNumber: 'L2', vehicleTypeId: '', vehicleNumber: 'V2' });
    const d3 = await taxiStorage.createTaxiDriver({ userId: drvUsers[2], name: 'D Three', phone: '333', licenseNumber: 'L3', vehicleTypeId: '', vehicleNumber: 'V3' });

    // mark all drivers online (ids are stored as strings in this test DB)
    await db.collection('taxi_drivers').updateMany({ _id: { $in: [d1.id, d2.id, d3.id] } }, { $set: { isOnline: true } });

    // create a rider and a ride assigned to d2 (busy)
    const riderAgent = request.agent(server);
    const riderName = `rider_${Date.now()}@example.com`;
    await riderAgent.post('/api/register').send({ username: riderName, password: 'pass123', name: 'Rider' });
    const rides = await taxiStorage.createTaxiRide({ userId: riderName, vehicleTypeId: '', pickupAddress: 'A', dropAddress: 'B' } as any);
    // assign ride to d2 to make d2 busy
    const assigned = await taxiStorage.assignTaxiDriver(rides.id, d2.id, true);
    expect(assigned).toBeTruthy();

    // now request available drivers as admin
    const availRes = await agent.get('/api/admin/taxi/drivers/available');
    expect(availRes.status).toBe(200);
    const body = availRes.body;
    // ensure d2 is not present, but d1 and d3 are
    const ids = body.map((b: any) => b.id);
    expect(ids).toContain(d1.id);
    expect(ids).toContain(d3.id);
    expect(ids).not.toContain(d2.id);
  });

  it('assigns a driver via admin assign endpoint and records assignmentHistory', async () => {
    const agent = request.agent(server);
    const adminUser = `admin2_${Date.now()}@example.com`;
    await agent.post('/api/register').send({ username: adminUser, password: 'adminpass2', name: 'Admin2' });
    const db = getDb();
    // mark admin
    const regUser = await db.collection('users').findOne({ username: adminUser });
    await db.collection('users').updateOne({ _id: regUser!._id }, { $set: { isAdmin: true } });
    // re-login to refresh session user
    const loginRes = await agent.post('/api/login').send({ username: adminUser, password: 'adminpass2' });
    expect(loginRes.status).toBe(200);

    // create a driver and mark online
    const drv = await taxiStorage.createTaxiDriver({ userId: newId(), name: 'Assignable', phone: '999', licenseNumber: 'LA', vehicleTypeId: '', vehicleNumber: 'VX' });
    await db.collection('taxi_drivers').updateOne({ _id: drv.id }, { $set: { isOnline: true } });

    // create a rider and ride (unassigned)
    const riderAgent = request.agent(server);
    const riderName = `rider2_${Date.now()}@example.com`;
    await riderAgent.post('/api/register').send({ username: riderName, password: 'pass123', name: 'Rider2' });
    const ride = await taxiStorage.createTaxiRide({ userId: riderName, vehicleTypeId: '', pickupAddress: 'X', dropAddress: 'Y' } as any);

    // assign via admin endpoint
    const assignRes = await agent.patch(`/api/admin/taxi/rides/${ride.id}/assign`).send({ driverId: drv.id });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.driverId).toBe(drv.id);
    // check assignmentHistory exists (may be empty array or null for first assign)
    const updated = await taxiStorage.getTaxiRide(ride.id);
    expect(updated).toBeTruthy();
    expect(updated!.driverId).toBe(drv.id);
    // reassign to a new driver to ensure history is recorded
    const drv2 = await taxiStorage.createTaxiDriver({ userId: newId(), name: 'Reassign', phone: '888', licenseNumber: 'L8', vehicleTypeId: '', vehicleNumber: 'V8' });
    await db.collection('taxi_drivers').updateOne({ _id: drv2.id }, { $set: { isOnline: true } });
    const reassignRes = await agent.patch(`/api/admin/taxi/rides/${ride.id}/assign`).send({ driverId: drv2.id });
    expect(reassignRes.status).toBe(200);
    const re = await taxiStorage.getTaxiRide(ride.id);
    expect(re).toBeTruthy();
    expect(re!.driverId).toBe(drv2.id);
    expect(re!.assignmentHistory && re!.assignmentHistory.length).toBeGreaterThanOrEqual(1);
  });
});
