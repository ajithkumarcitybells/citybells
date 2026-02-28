import type { Express } from "express";
import { z } from "zod";
import { taxiStorage } from "./taxi-storage";
import { requireAuth, requireAdmin, requirePartner } from "./auth";
import { insertTaxiVehicleTypeSchema, insertTaxiDriverSchema, insertTaxiRideSchema } from "@shared/schema";

export function registerTaxiRoutes(app: Express) {
  app.get("/api/taxi/vehicle-types", async (req, res) => {
    try {
      const types = await taxiStorage.getTaxiVehicleTypes();
      res.json(types);
    } catch (err) {
      console.error("Error fetching taxi vehicle types:", err);
      res.status(500).json({ message: "Failed to fetch vehicle types" });
    }
  });

  const estimateFareSchema = z.object({
    vehicleTypeId: z.string().min(1),
    distance: z.number().positive(),
    duration: z.number().positive(),
  });

  app.post("/api/taxi/estimate", requireAuth, async (req, res) => {
    try {
      const parsed = estimateFareSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { vehicleTypeId, distance, duration } = parsed.data;
      const vehicleType = await taxiStorage.getTaxiVehicleType(vehicleTypeId);
      if (!vehicleType) {
        return res.status(404).json({ message: "Vehicle type not found" });
      }

      const baseFare = parseFloat(vehicleType.baseFare);
      const perKm = parseFloat(vehicleType.perKmRate);
      const perMin = parseFloat(vehicleType.perMinRate);
      const estimatedFare = baseFare + (perKm * distance) + (perMin * duration);

      res.json({
        estimatedFare: estimatedFare.toFixed(2),
        baseFare: vehicleType.baseFare,
        distanceCharge: (perKm * distance).toFixed(2),
        timeCharge: (perMin * duration).toFixed(2),
        distance,
        duration,
      });
    } catch (err) {
      console.error("Error estimating fare:", err);
      res.status(500).json({ message: "Failed to estimate fare" });
    }
  });

  const bookRideSchema = z.object({
    vehicleTypeId: z.string().min(1),
    pickupAddress: z.string().min(1),
    dropAddress: z.string().min(1),
    pickupLat: z.string().optional(),
    pickupLng: z.string().optional(),
    dropLat: z.string().optional(),
    dropLng: z.string().optional(),
    estimatedFare: z.string().optional(),
    distance: z.string().optional(),
    duration: z.number().optional(),
  });

  app.post("/api/taxi/rides", requireAuth, async (req, res) => {
    try {
      const parsed = bookRideSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const ride = await taxiStorage.createTaxiRide({
        userId: req.user!.id,
        ...parsed.data,
        status: "searching",
      });

      res.status(201).json(ride);
    } catch (err) {
      console.error("Error booking ride:", err);
      res.status(500).json({ message: "Failed to book ride" });
    }
  });

  app.get("/api/taxi/rides", requireAuth, async (req, res) => {
    try {
      const rides = await taxiStorage.getTaxiRides(req.user!.id);
      res.json(rides);
    } catch (err) {
      console.error("Error fetching rides:", err);
      res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  app.get("/api/taxi/rides/:id", requireAuth, async (req, res) => {
    try {
      const ride = await taxiStorage.getTaxiRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      res.json(ride);
    } catch (err) {
      console.error("Error fetching ride:", err);
      res.status(500).json({ message: "Failed to fetch ride" });
    }
  });

  app.patch("/api/taxi/rides/:id/cancel", requireAuth, async (req, res) => {
    try {
      const ride = await taxiStorage.getTaxiRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      if (ride.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (ride.status === "completed" || ride.status === "cancelled") {
        return res.status(400).json({ message: "Cannot cancel this ride" });
      }
      const updated = await taxiStorage.updateTaxiRideStatus(req.params.id, "cancelled");
      res.json(updated);
    } catch (err) {
      console.error("Error cancelling ride:", err);
      res.status(500).json({ message: "Failed to cancel ride" });
    }
  });

  const rateRideSchema = z.object({
    rating: z.number().int().min(1).max(5),
  });

  app.post("/api/taxi/rides/:id/rate", requireAuth, async (req, res) => {
    try {
      const parsed = rateRideSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid rating" });
      }

      const ride = await taxiStorage.getTaxiRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      if (ride.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (ride.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed rides" });
      }

      const updated = await taxiStorage.rateTaxiRide(req.params.id, parsed.data.rating);
      res.json(updated);
    } catch (err) {
      console.error("Error rating ride:", err);
      res.status(500).json({ message: "Failed to rate ride" });
    }
  });

  app.get("/api/taxi/driver/profile", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      res.json(driver);
    } catch (err) {
      console.error("Error fetching driver profile:", err);
      res.status(500).json({ message: "Failed to fetch driver profile" });
    }
  });

  app.patch("/api/taxi/driver/toggle-online", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const { isOnline } = req.body;
      const updated = await taxiStorage.toggleTaxiDriverOnline(req.user!.id, !!isOnline);
      res.json(updated);
    } catch (err) {
      console.error("Error toggling online status:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.get("/api/taxi/driver/rides", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      const rides = await taxiStorage.getDriverTaxiRides(driver.id);
      res.json(rides);
    } catch (err) {
      console.error("Error fetching driver rides:", err);
      res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  const updateRideStatusSchema = z.object({
    status: z.enum(["driver_assigned", "arriving", "in_ride", "completed", "cancelled"]),
  });

  app.patch("/api/taxi/driver/rides/:id/status", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const parsed = updateRideStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const ride = await taxiStorage.getTaxiRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      if (ride.driverId !== driver.id) {
        return res.status(403).json({ message: "Not assigned to this ride" });
      }

      const updateData: any = { status: parsed.data.status };
      if (parsed.data.status === "completed" && ride.estimatedFare) {
        updateData.actualFare = ride.estimatedFare;
      }

      const updated = await taxiStorage.updateTaxiRide(req.params.id, updateData);
      res.json(updated);
    } catch (err) {
      console.error("Error updating ride status:", err);
      res.status(500).json({ message: "Failed to update ride status" });
    }
  });

  app.get("/api/taxi/driver/stats", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      const stats = await taxiStorage.getTaxiDriverStats(driver.id);
      res.json(stats);
    } catch (err) {
      console.error("Error fetching driver stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/taxi/vehicle-types", requireAdmin, async (req, res) => {
    try {
      const types = await taxiStorage.getTaxiVehicleTypes();
      res.json(types);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch vehicle types" });
    }
  });

  app.post("/api/admin/taxi/vehicle-types", requireAdmin, async (req, res) => {
    try {
      const vt = await taxiStorage.createTaxiVehicleType(req.body);
      res.status(201).json(vt);
    } catch (err) {
      res.status(500).json({ message: "Failed to create vehicle type" });
    }
  });

  app.patch("/api/admin/taxi/vehicle-types/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await taxiStorage.updateTaxiVehicleType(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update vehicle type" });
    }
  });

  app.delete("/api/admin/taxi/vehicle-types/:id", requireAdmin, async (req, res) => {
    try {
      await taxiStorage.deleteTaxiVehicleType(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete vehicle type" });
    }
  });

  app.get("/api/admin/taxi/drivers", requireAdmin, async (req, res) => {
    try {
      const drivers = await taxiStorage.getTaxiDrivers();
      res.json(drivers);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.post("/api/admin/taxi/drivers", requireAdmin, async (req, res) => {
    try {
      const driver = await taxiStorage.createTaxiDriver(req.body);
      res.status(201).json(driver);
    } catch (err) {
      res.status(500).json({ message: "Failed to create driver" });
    }
  });

  app.patch("/api/admin/taxi/drivers/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await taxiStorage.updateTaxiDriver(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update driver" });
    }
  });

  app.delete("/api/admin/taxi/drivers/:id", requireAdmin, async (req, res) => {
    try {
      await taxiStorage.deleteTaxiDriver(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete driver" });
    }
  });

  app.get("/api/admin/taxi/rides", requireAdmin, async (req, res) => {
    try {
      const rides = await taxiStorage.getAllTaxiRides();
      res.json(rides);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  app.patch("/api/admin/taxi/rides/:id/assign", requireAdmin, async (req, res) => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ message: "driverId is required" });
      }
      const updated = await taxiStorage.assignTaxiDriver(req.params.id, driverId);
      if (!updated) return res.status(404).json({ message: "Ride or driver not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  app.patch("/api/admin/taxi/rides/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await taxiStorage.updateTaxiRideStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: "Ride not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update ride status" });
    }
  });

  app.get("/api/admin/taxi/stats", requireAdmin, async (req, res) => {
    try {
      const { db: database } = await import("./db");
      const { taxiRides: tr, taxiDrivers: td, taxiVehicleTypes: tv } = await import("@shared/schema");
      const { count: cnt, sum: sm } = await import("drizzle-orm");

      const [rideCount] = await database.select({ count: cnt() }).from(tr);
      const [driverCount] = await database.select({ count: cnt() }).from(td);
      const [vehicleTypeCount] = await database.select({ count: cnt() }).from(tv);
      const [revenue] = await database.select({ total: sm(tr.actualFare) }).from(tr);

      res.json({
        totalRides: rideCount.count,
        totalDrivers: driverCount.count,
        totalVehicleTypes: vehicleTypeCount.count,
        totalRevenue: revenue.total || "0",
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
}
