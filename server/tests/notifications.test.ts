import request from "supertest";
import express from "express";
import { registerRoutes } from "../routes";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { connectDb } from "../db";
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

describe('Notifications prefs and push token', () => {
  it('registers a push token and updates preferences', async () => {
    const agent = request.agent(server);
    const username = `notif_test_${Date.now()}@example.com`;
    const password = 'testpass';
    const reg = await agent.post('/api/register').send({ username, password, name: 'Notif Tester' });
    expect(reg.status).toBe(201);

    // register token
    const token = `token_${Date.now()}`;
    const regTok = await agent.post('/api/notifications/register-token').send({ token });
    expect(regTok.status).toBe(200);

    // check user has token
    const user = await storage.getUserByUsername(username);
    expect((user as any).pushTokens?.includes(token)).toBe(true);

    // update prefs
    const prefs = { push: true, sms: false, inApp: true };
    const prefsRes = await agent.patch('/api/notifications/preferences').send(prefs);
    expect(prefsRes.status).toBe(200);

    const updated = await storage.getUserByUsername(username);
    expect((updated as any).notificationPreferences?.push).toBe(true);
    expect((updated as any).notificationPreferences?.sms).toBe(false);
  });
});
