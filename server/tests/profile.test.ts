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

describe("Profile API", () => {
  it("registers, fetches profile, updates profile, and uploads avatar", async () => {
    const agent = request.agent(server);

    // Register a new user (will auto-login)
    const username = `testuser_${Date.now()}@example.com`;
    const password = "testpass123";
    const registerRes = await agent.post("/api/register").send({ username, password, name: "Test User" });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.username).toBe(username);

    // GET profile
    const profileRes = await agent.get("/api/profile");
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.userId).toBeTruthy();

    // Update profile
    const updateRes = await agent.put("/api/profile/update").send({ name: "Updated Name", phone: "+911234567890" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe("Updated Name");

    // Upload avatar (multipart)
    const uploadRes = await agent
      .post("/api/profile/upload-avatar-file")
      .attach("avatar", Buffer.from("dummyimage"), "avatar.jpg");
    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.avatar).toContain("/uploads/avatars/");
  }, 20000);
});
