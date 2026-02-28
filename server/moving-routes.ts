import type { Express } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin, requirePartner } from "./auth";
import { movingStorage } from "./moving-storage";

const vehicleTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  basePrice: z.string().min(1),
  pricePerKm: z.string().min(1),
  capacity: z.string().optional(),
  icon: z.string().optional(),
});

const estimatePriceSchema = z.object({
  vehicleTypeId: z.string().min(1),
  distanceKm: z.number().positive(),
  helpersCount: z.number().int().min(0).default(0),
});

const createBookingSchema = z.object({
  vehicleTypeId: z.string().min(1),
  pickupAddress: z.string().min(1),
  dropAddress: z.string().min(1),
  pickupLat: z.string().optional(),
  pickupLng: z.string().optional(),
  dropLat: z.string().optional(),
  dropLng: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  estimatedPrice: z.string().optional(),
  helpersCount: z.number().int().min(0).default(0),
  description: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "picked_up", "in_transit", "delivered", "cancelled"]),
});

const driverSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  isAvailable: z.boolean().optional(),
  rating: z.string().optional(),
});

export function registerMovingRoutes(app: Express) {
  // ==================== PUBLIC ROUTES ====================

  app.get("/api/moving/vehicle-types", async (_req, res) => {
    try {
      const types = await movingStorage.getVehicleTypes();
      res.json(types);
    } catch (err) {
      console.error("Error fetching vehicle types:", err);
      res.status(500).json({ message: "Failed to fetch vehicle types" });
    }
  });

  // ==================== CUSTOMER ROUTES ====================

  app.post("/api/moving/estimate", requireAuth, async (req, res) => {
    try {
      const parsed = estimatePriceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const { vehicleTypeId, distanceKm, helpersCount } = parsed.data;
      const result = await movingStorage.estimatePrice(vehicleTypeId, distanceKm, helpersCount);
      res.json(result);
    } catch (err: any) {
      console.error("Error estimating price:", err);
      res.status(500).json({ message: err.message || "Failed to estimate price" });
    }
  });

  app.post("/api/moving/bookings", requireAuth, async (req, res) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const booking = await movingStorage.createBooking({
        ...parsed.data,
        userId: req.user!.id,
        status: "pending",
      });
      res.status(201).json(booking);
    } catch (err) {
      console.error("Error creating booking:", err);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/moving/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await movingStorage.getUserBookings(req.user!.id);
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/moving/bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const booking = await movingStorage.cancelBooking(req.params.id, req.user!.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // ==================== DRIVER ROUTES ====================

  app.get("/api/moving/driver/profile", requireAuth, async (req, res) => {
    try {
      const driver = await movingStorage.getDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      res.json(driver);
    } catch (err) {
      console.error("Error fetching driver profile:", err);
      res.status(500).json({ message: "Failed to fetch driver profile" });
    }
  });

  app.get("/api/moving/driver/bookings", requireAuth, async (req, res) => {
    try {
      const driver = await movingStorage.getDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      const bookings = await movingStorage.getDriverBookings(driver.id);
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching driver bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/moving/driver/bookings/:id/status", requireAuth, async (req, res) => {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const driver = await movingStorage.getDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      const booking = await movingStorage.getBooking(req.params.id);
      if (!booking || booking.driverId !== driver.id) {
        return res.status(404).json({ message: "Booking not found or not assigned to you" });
      }
      const updated = await movingStorage.updateBookingStatus(req.params.id, parsed.data.status);
      res.json(updated);
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.patch("/api/moving/driver/availability", requireAuth, async (req, res) => {
    try {
      const driver = await movingStorage.toggleDriverAvailability(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }
      res.json(driver);
    } catch (err) {
      console.error("Error toggling availability:", err);
      res.status(500).json({ message: "Failed to toggle availability" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  app.get("/api/admin/moving/bookings", requireAdmin, async (_req, res) => {
    try {
      const bookings = await movingStorage.getBookings();
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching all bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/admin/moving/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const updated = await movingStorage.updateBookingStatus(req.params.id, parsed.data.status);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.patch("/api/admin/moving/bookings/:id/assign", requireAdmin, async (req, res) => {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ message: "Driver ID is required" });
      }
      const updated = await movingStorage.assignDriver(req.params.id, driverId);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error assigning driver:", err);
      res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  app.get("/api/admin/moving/vehicle-types", requireAdmin, async (_req, res) => {
    try {
      const types = await movingStorage.getVehicleTypes();
      res.json(types);
    } catch (err) {
      console.error("Error fetching vehicle types:", err);
      res.status(500).json({ message: "Failed to fetch vehicle types" });
    }
  });

  app.post("/api/admin/moving/vehicle-types", requireAdmin, async (req, res) => {
    try {
      const parsed = vehicleTypeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const created = await movingStorage.createVehicleType(parsed.data);
      res.status(201).json(created);
    } catch (err) {
      console.error("Error creating vehicle type:", err);
      res.status(500).json({ message: "Failed to create vehicle type" });
    }
  });

  app.patch("/api/admin/moving/vehicle-types/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = vehicleTypeSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await movingStorage.updateVehicleType(req.params.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Vehicle type not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating vehicle type:", err);
      res.status(500).json({ message: "Failed to update vehicle type" });
    }
  });

  app.delete("/api/admin/moving/vehicle-types/:id", requireAdmin, async (req, res) => {
    try {
      await movingStorage.deleteVehicleType(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting vehicle type:", err);
      res.status(500).json({ message: "Failed to delete vehicle type" });
    }
  });

  app.get("/api/admin/moving/drivers", requireAdmin, async (_req, res) => {
    try {
      const drivers = await movingStorage.getDrivers();
      res.json(drivers);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.post("/api/admin/moving/drivers", requireAdmin, async (req, res) => {
    try {
      const parsed = driverSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const created = await movingStorage.createDriver(parsed.data);
      res.status(201).json(created);
    } catch (err) {
      console.error("Error creating driver:", err);
      res.status(500).json({ message: "Failed to create driver" });
    }
  });

  app.patch("/api/admin/moving/drivers/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = driverSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await movingStorage.updateDriver(req.params.id, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating driver:", err);
      res.status(500).json({ message: "Failed to update driver" });
    }
  });

  app.delete("/api/admin/moving/drivers/:id", requireAdmin, async (req, res) => {
    try {
      await movingStorage.deleteDriver(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting driver:", err);
      res.status(500).json({ message: "Failed to delete driver" });
    }
  });
}
