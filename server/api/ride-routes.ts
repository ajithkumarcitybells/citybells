import { Application, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb, newId } from "../db";
import { RideService } from "../services/ride-service";
import { RideStatus, PaymentMethod } from "../schemas/uber-schemas";
import { z } from "zod";

// Validation schemas
const createRideSchema = z.object({
  pickupLat: z.number(),
  pickupLng: z.number(),
  pickupAddress: z.string(),
  dropLat: z.number(),
  dropLng: z.number(),
  dropAddress: z.string(),
  distanceMeters: z.number(),
  durationSec: z.number(),
  paymentMethod: z.enum(["cash", "card", "upi", "wallet"]),
  vehicleType: z.string().optional(),
  scheduledTime: z.string().optional(),
});

const cancelRideSchema = z.object({
  reason: z.string().optional(),
});

const rateRideSchema = z.object({
  userRating: z.number().min(1).max(5),
  driverRating: z.number().min(1).max(5),
  userComments: z.string().optional(),
  driverComments: z.string().optional(),
});

export async function registerRideRoutes(app: Application) {
  const db = getDb();
  const rideService = new RideService(db);

  // Create a new ride request
  app.post("/api/rides", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = createRideSchema.parse(req.body);
      try { console.log("vehicleTypeId:", data.vehicleType); } catch (e) {}
      const scheduledTime = data.scheduledTime ? new Date(data.scheduledTime) : undefined;

      const ride = await rideService.createRide(
        userId,
        { lat: data.pickupLat, lng: data.pickupLng, address: data.pickupAddress },
        { lat: data.dropLat, lng: data.dropLng, address: data.dropAddress },
        data.distanceMeters,
        data.durationSec,
        data.paymentMethod as PaymentMethod,
        data.vehicleType,
        scheduledTime
      );

      // Emit socket event to find drivers
      const io = (req as any).io;
      if (io) {
        io.emit("new_ride_request", {
          rideId: ride._id.toString(),
          pickupLat: data.pickupLat,
          pickupLng: data.pickupLng,
          estimatedFare: ride.fare,
          distance: data.distanceMeters,
        });
      }

      res.json({ success: true, rideId: ride._id.toString(), ride });
    } catch (err: any) {
      console.error("Error creating ride:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // Get ride details
  app.get("/api/rides/:id", async (req: Request, res: Response) => {
    try {
      const rideId = req.params.id;
      const ride = await db.collection("rides").findOne({ _id: new ObjectId(rideId) });

      if (!ride) return res.status(404).json({ error: "Ride not found" });

      // Get driver and vehicle info
      if (ride.driverId) {
        const driver = await db.collection("drivers").findOne({ _id: ride.driverId });
        const vehicle = ride.vehicleId ? await db.collection("vehicles").findOne({ _id: ride.vehicleId }) : null;
        Object.assign(ride, { driver, vehicle });
      }

      res.json(ride);
    } catch (err: any) {
      console.error("Error fetching ride:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get user's ride history
  app.get("/api/rides", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const rides = await rideService.getRideHistory(userId, limit);

      res.json(rides);
    } catch (err: any) {
      console.error("Error fetching ride history:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel a ride
  app.post("/api/rides/:id/cancel", async (req: Request, res: Response) => {
    try {
      const rideId = req.params.id;
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = cancelRideSchema.parse(req.body);

      // Check ownership
      const ride = await db.collection("rides").findOne({ _id: new ObjectId(rideId) });
      if (!ride || ride.userId.toString() !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const success = await rideService.cancelRide(rideId, "user", data.reason);

      // Emit socket event
      const io = (req as any).io;
      if (io) {
        io.to(`ride-${rideId}`).emit("ride_cancelled", {
          cancelledBy: "user",
          reason: data.reason,
          timestamp: new Date(),
        });
      }

      res.json({ success });
    } catch (err: any) {
      console.error("Error cancelling ride:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Rate a completed ride
  app.post("/api/rides/:id/rate", async (req: Request, res: Response) => {
    try {
      const rideId = req.params.id;
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = rateRideSchema.parse(req.body);

      // Get ride to verify ownership
      const ride = await db.collection("rides").findOne({ _id: new ObjectId(rideId) });
      if (!ride || ride.userId.toString() !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const rating = {
        _id: new ObjectId(),
        rideId: new ObjectId(rideId),
        userId: new ObjectId(userId),
        driverId: ride.driverId,
        userRating: data.userRating,
        driverRating: data.driverRating,
        userComments: data.userComments || "",
        driverComments: data.driverComments || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("ratings").insertOne(rating);

      // Update driver rating average
      if (ride.driverId) {
        const allRatings = await db
          .collection("ratings")
          .find({ driverId: ride.driverId })
          .toArray();
        const avgRating = allRatings.reduce((sum, r) => sum + r.driverRating, 0) / allRatings.length;
        await db.collection("drivers").updateOne({ _id: ride.driverId }, { $set: { rating: avgRating } });
      }

      res.json({ success: true, rating });
    } catch (err: any) {
      console.error("Error rating ride:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get available drivers for a location
  app.get("/api/drivers/available", async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius } = req.query;
      if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

      const availableDrivers = await rideService.getAvailableDrivers(
        parseFloat(lat as string),
        parseFloat(lng as string),
        parseInt(radius as string) || 5
      );

      res.json(availableDrivers);
    } catch (err: any) {
      console.error("Error fetching available drivers:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Calculate fare
  app.post("/api/calculate-fare", async (req: Request, res: Response) => {
    try {
      const { distanceMeters, durationSec } = req.body;
      const { fare, breakdown } = await rideService.calculateFare(distanceMeters, durationSec);
      res.json({ fare, breakdown });
    } catch (err: any) {
      console.error("Error calculating fare:", err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Routes] Ride routes registered");
}
