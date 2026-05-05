import { Application, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { RideStatus, DriverStatus, ApprovalStatus } from "../schemas/uber-schemas";
import type { AdminSettings } from "@shared/schema";
import { z } from "zod";

const adminSettingsSchema = z.object({
  baseFare: z.number().positive(),
  perKmRate: z.number().positive(),
  perMinRate: z.number().positive(),
  surgeFactor: z.number().min(1),
  commissionPercentage: z.number().min(0).max(100),
});

const assignDriverSchema = z.object({
  driverId: z.string(),
});

const updateDriverStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().optional(),
});

export async function registerAdminRoutes(app: Application) {
  const db = getDb();

  // Middleware to check admin role
  const requireAdmin = (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Get all active rides
  app.get("/api/admin/rides", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status, limit = 50, skip = 0 } = req.query;

      const filter: any = {};
      if (status && status !== "all") {
        filter.status = status;
      }

      const totalCount = await db.collection("rides").countDocuments(filter);
      const rides = await db
        .collection("rides")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(skip as string))
        .toArray();

      // Populate driver and user info
      const enrichedRides = await Promise.all(
        rides.map(async (ride) => {
          const driver = ride.driverId ? await db.collection("drivers").findOne({ _id: ride.driverId }) : null;
          const user = await db.collection("users_uber").findOne({ _id: ride.userId });
          return { ...ride, driver, user };
        })
      );

      res.json({ rides: enrichedRides, totalCount });
    } catch (err: any) {
      console.error("Error fetching rides:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get all drivers
  app.get("/api/admin/drivers", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { approvalStatus, limit = 50, skip = 0 } = req.query;

      const filter: any = {};
      if (approvalStatus && approvalStatus !== "all") {
        filter.approvalStatus = approvalStatus;
      }

      const totalCount = await db.collection("drivers").countDocuments(filter);
      const drivers = await db
        .collection("drivers")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(skip as string))
        .toArray();

      // Populate user info and vehicle
      const enrichedDrivers = await Promise.all(
        drivers.map(async (driver) => {
          const user = await db.collection("users_uber").findOne({ _id: driver.userId });
          const vehicle = await db.collection("vehicles").findOne({ driverId: driver._id });
          return { ...driver, user, vehicle };
        })
      );

      res.json({ drivers: enrichedDrivers, totalCount });
    } catch (err: any) {
      console.error("Error fetching drivers:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Approve driver
  app.patch("/api/admin/drivers/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await db.collection("drivers").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            approvalStatus: ApprovalStatus.APPROVED,
            approvedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      res.json({ success: true, message: "Driver approved" });
    } catch (err: any) {
      console.error("Error approving driver:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Suspend driver
  app.patch("/api/admin/drivers/:id/suspend", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await db.collection("drivers").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            approvalStatus: ApprovalStatus.SUSPENDED,
            suspensionReason: reason,
            suspendedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      res.json({ success: true, message: "Driver suspended" });
    } catch (err: any) {
      console.error("Error suspending driver:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Manually assign driver to ride
  app.post("/api/admin/rides/:id/assign", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = assignDriverSchema.parse(req.body);

      await db.collection("rides").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            driverId: new ObjectId(data.driverId),
            status: RideStatus.ACCEPTED,
            updatedAt: new Date(),
          },
        }
      );

      const io = (req as any).io;
      if (io) {
        io.to(`ride-${id}`).emit("ride_assigned", {
          driverId: data.driverId,
          assignedAt: new Date(),
        });
      }

      res.json({ success: true, message: "Driver assigned" });
    } catch (err: any) {
      console.error("Error assigning driver:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel ride (admin)
  app.post("/api/admin/rides/:id/cancel", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await db.collection("rides").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: RideStatus.CANCELLED,
            cancelledBy: "admin",
            cancellationReason: reason,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      const io = (req as any).io;
      if (io) {
        io.to(`ride-${id}`).emit("ride_cancelled", {
          reason,
          cancelledBy: "admin",
        });
      }

      res.json({ success: true, message: "Ride cancelled" });
    } catch (err: any) {
      console.error("Error cancelling ride:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get analytics
  app.get("/api/admin/analytics", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, period = "daily" } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Total rides and revenue
      const rides = await db
        .collection("rides")
        .find({
          createdAt: { $gte: start, $lte: end },
          status: RideStatus.COMPLETED,
        })
        .toArray();

      const totalRides = rides.length;
      const totalRevenue = rides.reduce((sum, r) => sum + (r.actualFare || r.fare || 0), 0);
      const avgRideValue = totalRides > 0 ? totalRevenue / totalRides : 0;

      // Commission earnings
      const earnings = await db
        .collection("earnings")
        .find({ createdAt: { $gte: start, $lte: end } })
        .toArray();

      const totalCommission = earnings.reduce((sum, e) => sum + e.commission, 0);
      const driverPayouts = earnings.reduce((sum, e) => sum + e.netEarnings, 0);

      // Rides by status
      const ridesByStatus = {
        completed: await db.collection("rides").countDocuments({ status: RideStatus.COMPLETED }),
        cancelled: await db.collection("rides").countDocuments({ status: RideStatus.CANCELLED }),
        pending: await db.collection("rides").countDocuments({ status: RideStatus.PENDING }),
      };

      // Driver stats
      const totalDrivers = await db.collection("drivers").countDocuments({});
      const approvedDrivers = await db
        .collection("drivers")
        .countDocuments({ approvalStatus: ApprovalStatus.APPROVED });
      const activeDrivers = await db
        .collection("drivers")
        .countDocuments({ status: DriverStatus.ONLINE });

      // User stats
      const totalUsers = await db.collection("users_uber").countDocuments({});

      // Hourly rides (for chart)
      const ridesByHour: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        ridesByHour[i] = 0;
      }
      rides.forEach((ride) => {
        const hour = new Date(ride.createdAt).getHours();
        ridesByHour[hour]++;
      });

      res.json({
        summary: {
          totalRides,
          totalRevenue,
          avgRideValue,
          totalCommission,
          driverPayouts,
        },
        ridesByStatus,
        drivers: {
          total: totalDrivers,
          approved: approvedDrivers,
          active: activeDrivers,
        },
        users: {
          total: totalUsers,
        },
        charts: {
          ridesByHour: Object.entries(ridesByHour).map(([hour, count]) => ({
            hour: parseInt(hour),
            count,
          })),
        },
        dateRange: { start, end },
      });
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get admin settings
  app.get("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      let settings = (await db.collection("admin_settings").findOne({})) as AdminSettings | (AdminSettings & { _id?: ObjectId }) | null;

      if (!settings) {
        // Default settings
        const defaultSettings: AdminSettings = {
          baseFare: 50,
          perKmRate: 15,
          perMinRate: 0.5,
          surgeFactor: 1.5,
          commissionPercentage: 20,
          createdAt: new Date(),
        };
        await db.collection("admin_settings").insertOne(defaultSettings as any);
        settings = defaultSettings as AdminSettings;
      }

      res.json(settings);
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update admin settings
  app.patch("/api/admin/settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = adminSettingsSchema.parse(req.body);

      await db.collection("admin_settings").updateOne(
        {},
        {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      res.json({ success: true, settings: data });
    } catch (err: any) {
      console.error("Error updating settings:", err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Routes] Admin routes registered");
}
