import type { Application, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '../db';
import eta from '../lib/eta';

export async function registerEtaRoutes(app: Application) {
  const db = getDb();

  // Calculate ETA preview: driver -> pickup and pickup -> destination
  app.post('/api/eta/calculate', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        driver: z.object({ lat: z.number(), lon: z.number(), speedKmh: z.number().optional() }).optional(),
        pickup: z.object({ lat: z.number(), lon: z.number() }).optional(),
        dest: z.object({ lat: z.number(), lon: z.number() }).optional(),
        now: z.string().optional(),
        trafficMultiplier: z.number().optional(),
      });
      const body = schema.parse(req.body || {});
      const opts = { trafficMultiplier: body.trafficMultiplier };
      const out: any = {};
      if (body.driver && body.pickup) {
        const d = await eta.calculateDriverArrivalETA(db, body.driver, body.pickup, opts as any);
        out.driverArrival = d;
        out.driverArrival.humanMinutes = Math.max(0, Math.round(d.seconds / 60));
      }
      if (body.pickup && body.dest) {
        const t = await eta.calculateTripEta(db, body.pickup, body.dest, opts as any);
        out.trip = { seconds: t.seconds, distanceMeters: t.distanceMeters, arrival: t.arrival, trafficMultiplier: (t as any).trafficMultiplier || 1 };
      }
      res.json(out);
    } catch (e: any) {
      console.error('ETA calculate error', e);
      res.status(400).json({ error: e.message });
    }
  });

  // Recalculate ETA for an active ride
  app.post('/api/eta/recalculate', async (req: Request, res: Response) => {
    try {
      const schema = z.object({ rideId: z.string(), current: z.object({ lat: z.number(), lon: z.number() }) });
      const body = schema.parse(req.body || {});
      const ride = await db.collection('rides').findOne({ _id: body.rideId as any });
      if (!ride) return res.status(404).json({ error: 'Ride not found' });
      const dest = ride.destination || ride.to;
      const t = await eta.calculateTripEta(db, body.current, dest, {});
      // optionally store telemetry
      try {
        await db.collection('ride_telemetry').insertOne({ rideId: body.rideId, time: new Date(), position: body.current, eta: t.seconds, distanceMeters: t.distanceMeters });
      } catch (e) {}
      // notify via sockets
      try { (app as any).locals.io?.emit('eta_update', { rideId: body.rideId, eta: t }); } catch (e) {}
      res.json({ rideId: body.rideId, eta: t });
    } catch (e: any) {
      console.error('ETA recalc error', e);
      res.status(400).json({ error: e.message });
    }
  });

  // Live ETA fetch (returns latest telemetry + last calc if present)
  app.get('/api/eta/live/:rideId', async (req: Request, res: Response) => {
    try {
      const rideId = req.params.rideId;
      const telemetry = await db.collection('ride_telemetry').find({ rideId }).sort({ time: -1 }).limit(1).toArray();
      const last = telemetry[0] || null;
      res.json({ rideId, last });
    } catch (e: any) {
      console.error('ETA live fetch error', e);
      res.status(500).json({ error: e.message });
    }
  });

  console.log('[Routes] ETA routes registered');
}

export default { registerEtaRoutes };
