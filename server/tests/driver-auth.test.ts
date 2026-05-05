import request from "supertest";
import express from "express";
import { registerRoutes } from "../routes";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { connectDb } from "../db";

let server: any;

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: '20mb', verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.use(express.urlencoded({ extended: false }));
  await connectDb();
  server = await registerRoutes(app);
});

afterAll(async () => {
  if (server && server.close) await new Promise((r) => server.close(r));
});

describe("Driver auth flows", () => {
  it("registers a driver, maintains session, logs out and logs back in with PIN", async () => {
    const agent = request.agent(server);

    const phone = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const payload = {
      name: "Test Driver",
      phone,
      pin: "1234",
      licenseNumber: "LIC12345",
      vehicleTypeId: "vt1",
      vehicleNumber: "VH123",
    };

    // Register
    const regRes = await agent.post('/api/driver/register').send(payload);
    expect(regRes.status).toBe(201);
    expect(regRes.body.phone).toBe(phone);
    expect(regRes.body.role).toBe('driver');

    // Session should be active
    const me = await agent.get('/api/user');
    expect(me.status).toBe(200);
    expect(me.body.phone).toBe(phone);

    // Logout
    const out = await agent.post('/api/logout');
    expect(out.status).toBe(200);

    // Wrong PIN should fail
    const bad = await agent.post('/api/driver/login').send({ phone, pin: '0000' });
    expect(bad.status).toBe(401);

    // Correct PIN login
    const login = await agent.post('/api/driver/login').send({ phone, pin: '1234' });
    expect(login.status).toBe(200);
    expect(login.body.role).toBe('driver');

    // Repeated /api/user calls remain stable
    const me2 = await agent.get('/api/user');
    expect(me2.status).toBe(200);
    expect(me2.body.phone).toBe(phone);
  }, 20000);

  it("prevents duplicate driver registration and preserves original session", async () => {
    const agent = request.agent(server);
    const phone = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const payload = { name: 'Dup Driver', phone, pin: '1111', licenseNumber: 'L1', vehicleTypeId: 'vt', vehicleNumber: 'V1' };

    const r1 = await agent.post('/api/driver/register').send(payload);
    expect(r1.status).toBe(201);

    // New agent attempting same phone should get 400
    const agent2 = request.agent(server);
    const r2 = await agent2.post('/api/driver/register').send(payload);
    expect(r2.status).toBe(400);

    // Original session still active
    const me = await agent.get('/api/user');
    expect(me.status).toBe(200);
    expect(me.body.phone).toBe(phone);
  }, 20000);
});
