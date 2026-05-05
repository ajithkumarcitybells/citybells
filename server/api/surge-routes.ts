import { Application, Request, Response } from 'express';
import { getDb, newId } from '../db';
import { requireAdmin } from '../auth';
import dynamicPricing from '../lib/dynamic-pricing';
import { z } from 'zod';

export async function registerSurgeRoutes(app: Application) {
  const db = getDb();

  // use centralized requireAdmin from auth.ts

  // Calculate a fare with explicit inputs (simulator / preview)
  app.post('/api/pricing/calculate', async (req: Request, res: Response) => {
    try {
      const schema = z.object({ distanceMeters: z.number(), durationSec: z.number(), vehicleType: z.string().optional(), requests: z.number().optional(), availableDrivers: z.number().optional(), lat: z.number().optional(), lon: z.number().optional() });
      const body = schema.parse(req.body);
      const result = await dynamicPricing.calculateDynamicFare(db, body.distanceMeters, body.durationSec, { vehicleType: body.vehicleType, requests: body.requests, availableDrivers: body.availableDrivers, lat: body.lat, lon: body.lon });
      res.json(result);
    } catch (e: any) {
      console.error('Error in calculate pricing', e);
      res.status(400).json({ error: e.message });
    }
  });

  // Admin: update peak surge rules / weather rules / demand config in one payload
  app.post('/api/surge/update', requireAdmin, async (req: Request, res: Response) => {
    try {
      const payload = req.body || {};
      // payload: { peakRules: [], weatherRules: [], demandConfig: {} }
      if (Array.isArray(payload.peakRules)) {
        await db.collection('peak_surge_rules').deleteMany({});
        if (payload.peakRules.length) await db.collection('peak_surge_rules').insertMany(payload.peakRules.map((r: any) => ({ _id: newId() as any, ...r })));
      }
      if (Array.isArray(payload.weatherRules)) {
        await db.collection('weather_surge_rules').deleteMany({});
        if (payload.weatherRules.length) await db.collection('weather_surge_rules').insertMany(payload.weatherRules.map((r: any) => ({ _id: newId() as any, ...r })));
      }
      if (payload.demandConfig) {
        await db.collection('demand_surge_config').deleteMany({});
        await db.collection('demand_surge_config').insertOne({ _id: newId() as any, ...payload.demandConfig });
      }

      // Notify clients
      try { (app as any).locals.io?.emit('surge_updated', { time: new Date(), payload }); } catch (e) {}

      res.json({ success: true });
    } catch (e: any) {
      console.error('Failed updating surge', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: list rules
  app.get('/api/surge/rules', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const peaks = await db.collection('peak_surge_rules').find().toArray();
      const weather = await db.collection('weather_surge_rules').find().toArray();
      const demand = await db.collection('demand_surge_config').find().toArray();
      res.json({ peaks, weather, demand: demand[0] || null });
    } catch (e: any) {
      console.error('Error fetching surge rules', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Public: weather surge suggestion for coords
  app.get('/api/weather/surge', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const mult = await dynamicPricing.getWeatherMultiplier(db, lat, lon);
      res.json({ multiplier: mult });
    } catch (e: any) {
      console.error('Error weather surge', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Public: current combined pricing info
  app.get('/pricing/current', async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const peak = await dynamicPricing.getPeakMultiplier(db, now);
      const demand = await dynamicPricing.getDemandMultiplier(db, 0, 0);
      res.json({ peak, demand });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log('[Routes] Surge/pricing routes registered');
}

export default { registerSurgeRoutes };
