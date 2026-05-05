import { Application, Request, Response } from "express";
import { getDb, ObjectId } from "./db";

export function registerMapRoutes(app: Application) {
  app.post("/api/rides", async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const rides = db.collection("rides");
      const _id = new ObjectId();
      const doc = {
        _id,
        createdAt: new Date(),
        payload: req.body,
      };
      await rides.insertOne(doc);
      res.json({ ok: true, id: _id.toString() });
    } catch (e: any) {
      console.error("/api/rides error", e);
      res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });
}
