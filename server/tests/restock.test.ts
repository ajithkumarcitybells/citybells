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

describe("Restock notification flow", () => {
  it("subscribes a user and notifies when product is restocked", async () => {
    const agent = request.agent(server);

    // Register and login user
    const username = `restock_test_${Date.now()}@example.com`;
    const password = "password123";
    const registerRes = await agent.post("/api/register").send({ username, password, name: "Restock Tester" });
    expect(registerRes.status).toBe(201);

    // Create a product with stock 0
    const product = await storage.createProduct({
      name: `Restock Item ${Date.now()}`,
      description: "Test",
      image: null,
      categoryId: null,
      originalPrice: "5.00",
      price: "5.00",
      rating: null,
      stock: 0,
      unit: "pc",
      isActive: true,
      vendorId: null,
      discountPercent: 0,
    } as any);

    // Subscribe to restock
    const subRes = await agent.post("/api/restock/subscribe").send({ productId: product.id });
    expect(subRes.status).toBe(200);

    // Trigger restock via storage (simulate admin update)
    await storage.updateProduct(product.id, { stock: 10 } as any);

    // Fetch notifications
    const notifsRes = await agent.get("/api/notifications");
    expect(notifsRes.status).toBe(200);
    const notifs = notifsRes.body;
    expect(Array.isArray(notifs)).toBe(true);
    const found = notifs.find((n: any) => n.title && n.title.includes(product.name));
    expect(found).toBeTruthy();
  }, 20000);
});
