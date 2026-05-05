import { Application, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { DriverStatus, ApprovalStatus, RideStatus } from "../schemas/uber-schemas";
import { z } from "zod";

const updateLocationSchema = z.object({
  driverId: z.string(),
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speed: z.number().optional(),
});

const acceptRideSchema = z.object({
  rideId: z.string(),
  vehicleId: z.string(),
});

const updateStatusSchema = z.object({
  status: z.enum(["online", "offline", "on_ride"]),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const startTripSchema = z.object({
  rideId: z.string(),
});

const endTripSchema = z.object({
  rideId: z.string(),
  actualDistance: z.number(),
  actualDuration: z.number(),
  actualFare: z.number(),
});

export async function registerDriverRoutes(app: Application) {
  const db = getDb();

  // Get driver profile
  app.get("/api/drivers/profile", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      // Get associated vehicle
      const vehicle = await db.collection("vehicles").findOne({ driverId: driver._id });

      res.json({ ...driver, vehicle });
    } catch (err: any) {
      console.error("Error fetching driver profile:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get incoming ride requests for a driver
  app.get("/api/drivers/incoming-requests", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      // Get pending rides within a reasonable distance
      if (!driver.currentLocation) return res.json([]);

      const nearbyRides = await db
        .collection("rides")
        .find({
          status: { $in: [RideStatus.PENDING, RideStatus.SEARCHING] },
          // Could add distance check here if needed
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      res.json(nearbyRides);
    } catch (err: any) {
      console.error("Error fetching incoming requests:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Driver accepts a ride
  app.post("/api/drivers/accept-ride", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = acceptRideSchema.parse(req.body);
      const { rideId, vehicleId } = data;

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      // Update ride with driver info
      const result = await db.collection("rides").updateOne(
        { _id: new ObjectId(rideId) },
        {
          $set: {
            driverId: driver._id,
            vehicleId: new ObjectId(vehicleId),
            status: RideStatus.ACCEPTED,
            updatedAt: new Date(),
          },
        }
      );

      // Update driver's current ride
      await db.collection("drivers").updateOne(
        { _id: driver._id },
        {
          $set: { currentRideId: new ObjectId(rideId) },
          $inc: { totalRides: 1 },
        }
      );

      // Emit socket event
      const io = (req as any).io;
      if (io) {
        io.to(`ride-${rideId}`).emit("ride_accepted", {
          driverId: driver._id.toString(),
          vehicleId,
          acceptedAt: new Date(),
        });
      }

      res.json({ success: true, rideId });
    } catch (err: any) {
      console.error("Error accepting ride:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Driver rejects a ride
  app.post("/api/drivers/reject-ride", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { rideId } = req.body;

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      // Update driver's rejection rate
      await db.collection("drivers").updateOne(
        { _id: driver._id },
        { $inc: { "stats.rejectedRides": 1 } }
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error rejecting ride:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Start trip
  app.post("/api/drivers/start-trip", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = startTripSchema.parse(req.body);

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      // Update ride status
      await db.collection("rides").updateOne(
        { _id: new ObjectId(data.rideId) },
        {
          $set: {
            status: RideStatus.ONGOING,
            startTime: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Update driver status
      await db.collection("drivers").updateOne(
        { _id: driver._id },
        { $set: { status: DriverStatus.ON_RIDE } }
      );

      // Emit socket event
      const io = (req as any).io;
      if (io) {
        io.to(`ride-${data.rideId}`).emit("ride_started", {
          driverId: driver._id.toString(),
          startTime: new Date(),
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error starting trip:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // End trip
  app.post("/api/drivers/end-trip", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const data = endTripSchema.parse(req.body);

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      // Update ride
      const ride = await db.collection("rides").findOne({ _id: new ObjectId(data.rideId) });

      await db.collection("rides").updateOne(
        { _id: new ObjectId(data.rideId) },
        {
          $set: {
            status: RideStatus.COMPLETED,
            endTime: new Date(),
            actualDistance: data.actualDistance,
            actualDuration: data.actualDuration,
            actualFare: data.actualFare,
            updatedAt: new Date(),
          },
        }
      );

      // Calculate earnings
      const commission = data.actualFare * 0.2; // 20% commission
      const netEarning = data.actualFare - commission;

      // Record earnings
      await db.collection("earnings").insertOne({
        _id: new ObjectId(),
        driverId: driver._id,
        rideId: new ObjectId(data.rideId),
        grossAmount: data.actualFare,
        commissionPercentage: 20,
        commission,
        netEarnings: netEarning,
        bonusAmount: 0,
        date: new Date(),
        createdAt: new Date(),
      });

      // Update driver earnings
      await db.collection("drivers").updateOne(
        { _id: driver._id },
        {
          $inc: { earnings: netEarning, totalEarnings: netEarning },
          $set: {
            currentRideId: null,
            status: DriverStatus.ONLINE,
          },
        }
      );

      // Emit socket event
      const io = (req as any).io;
      if (io) {
        io.to(`ride-${data.rideId}`).emit("ride_completed", {
          driverId: driver._id.toString(),
          actualDistance: data.actualDistance,
          actualDuration: data.actualDuration,
          actualFare: data.actualFare,
          endTime: new Date(),
        });
      }

      res.json({
        success: true,
        earnings: {
          grossAmount: data.actualFare,
          commission,
          netEarning,
        },
      });
    } catch (err: any) {
      console.error("Error ending trip:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get driver earnings
  app.get("/api/drivers/earnings", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      const { period = "daily" } = req.query;
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "weekly":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      const earnings = await db
        .collection("earnings")
        .find({ driverId: driver._id, createdAt: { $gte: startDate } })
        .toArray();

      const stats = {
        totalEarnings: earnings.reduce((sum, e) => sum + e.netEarnings, 0),
        totalCommission: earnings.reduce((sum, e) => sum + e.commission, 0),
        totalRides: earnings.length,
        averagePerRide:
          earnings.length > 0 ? earnings.reduce((sum, e) => sum + e.netEarnings, 0) / earnings.length : 0,
      };

      res.json({ ...stats, earnings });
    } catch (err: any) {
      console.error("Error fetching earnings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get driver's ride history
  app.get("/api/drivers/rides", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const driver = await db.collection("drivers").findOne({ userId: new ObjectId(userId) });
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const rides = await db
        .collection("rides")
        .find({ driverId: driver._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      res.json(rides);
    } catch (err: any) {
      console.error("Error fetching driver rides:", err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Routes] Driver routes registered");
}
