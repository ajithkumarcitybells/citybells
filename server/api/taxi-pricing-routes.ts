import { Application, Request, Response } from "express";
import { z } from "zod";
import { getDb } from "../db";
import { requireAdmin } from "../auth";
import { insertTaxiPricingSchema } from "@shared/schema";

export async function registerTaxiPricingRoutes(app: Application) {
  const db = getDb();

  // use centralized requireAdmin from auth.ts

  // List all pricing
  app.get("/api/taxi/pricing", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const list = await db.collection("taxi_pricing").find().sort({ startTime: 1 }).toArray();
      res.json(list);
    } catch (e: any) {
      console.error("Error listing pricing:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Create pricing
  app.post("/api/taxi/pricing", requireAdmin, async (req: Request, res: Response) => {
    try {
      // Coerce numeric-like strings to numbers for resilience
      const body = { ...req.body } as any;
      for (const k of ["baseFare", "perKmRate", "perMinuteRate", "surgeMultiplier", "minimumFare", "bookingFee"]) {
        if (body[k] !== undefined) body[k] = Number(body[k]);
      }
      const parsed = insertTaxiPricingSchema.parse(body);
      const now = new Date();
      const doc = { _id: undefined as any, ...parsed, isActive: parsed.isActive ?? true, createdAt: now };
      const r = await db.collection("taxi_pricing").insertOne(doc as any);
      const raw = await db.collection("taxi_pricing").findOne({ _id: r.insertedId });
      const result = raw ? { ...raw, id: String(raw._id) } : raw;
      // notify clients
      try {
        const io = (app as any).locals.io;
        if (io) io.emit("pricing_updated", result);
      } catch (e) {}
      res.status(201).json(result);
    } catch (e: any) {
      console.error("Error creating pricing:", e);
      res.status(400).json({ error: e.message });
    }
  });

  // Update pricing
  app.patch("/api/taxi/pricing/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      await db.collection("taxi_pricing").updateOne({ _id: id as any }, { $set: { ...req.body, updatedAt: new Date() } });
      const result = await db.collection("taxi_pricing").findOne({ _id: id as any });
      try {
        const io = (app as any).locals.io;
        if (io) io.emit("pricing_updated", result);
      } catch (e) {}
      res.json(result);
    } catch (e: any) {
      console.error("Error updating pricing:", e);
      res.status(400).json({ error: e.message });
    }
  });

  // Active pricing (public)
  app.get("/api/taxi/pricing/active", async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const curMinutes = now.getHours() * 60 + now.getMinutes();
      const pricings = await db.collection("taxi_pricing").find({ isActive: true }).toArray();
      for (const p of pricings) {
        try {
          const [sh, sm] = (p.startTime || "00:00").split(":").map((s: string) => parseInt(s, 10));
          const [eh, em] = (p.endTime || "00:00").split(":").map((s: string) => parseInt(s, 10));
          const start = sh * 60 + (sm || 0);
          const end = eh * 60 + (em || 0);
          if (start <= end) {
            if (curMinutes >= start && curMinutes < end) return res.json(p);
          } else {
            if (curMinutes >= start || curMinutes < end) return res.json(p);
          }
        } catch (err) {
          continue;
        }
      }
      res.json(null);
    } catch (e: any) {
      console.error("Error fetching active pricing:", e);
      res.status(500).json({ error: e.message });
    }
  });

  console.log("[Routes] Taxi pricing routes registered");
}
