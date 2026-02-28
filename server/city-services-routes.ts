import type { Express } from "express";
import { z } from "zod";
import { cityServicesStorage } from "./city-services-storage";
import { requireAuth, requireAdmin, requirePartner } from "./auth";

const serviceCategoryFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

const cityServiceFormSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  price: z.string().min(1),
  duration: z.string().optional(),
  rating: z.string().optional(),
  reviewCount: z.number().optional(),
  isActive: z.boolean().optional(),
});

const providerFormSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  specializations: z.array(z.string()).optional(),
  experience: z.string().optional().nullable(),
  rating: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isAgency: z.boolean().optional(),
  agencyName: z.string().optional().nullable(),
});

const bookingCreateSchema = z.object({
  serviceId: z.string().min(1),
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().min(1),
  address: z.string().min(1),
  totalPrice: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "provider_assigned", "in_progress", "completed", "cancelled"]),
});

const rateBookingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export function registerCityServicesRoutes(app: Express) {
  app.get("/api/city-services/categories", async (req, res) => {
    try {
      const categories = await cityServicesStorage.getServiceCategories();
      res.json(categories);
    } catch (err) {
      console.error("Error fetching service categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/city-services/services", async (req, res) => {
    try {
      const { categoryId, search } = req.query;
      const services = await cityServicesStorage.getCityServices({
        categoryId: categoryId as string | undefined,
        search: search as string | undefined,
      });
      res.json(services);
    } catch (err) {
      console.error("Error fetching city services:", err);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/city-services/services/:id", async (req, res) => {
    try {
      const service = await cityServicesStorage.getCityService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (err) {
      console.error("Error fetching service:", err);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/city-services/bookings", requireAuth, async (req, res) => {
    try {
      const parsed = bookingCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid booking data" });
      }

      const booking = await cityServicesStorage.createBooking({
        userId: req.user!.id,
        serviceId: parsed.data.serviceId,
        scheduledDate: parsed.data.scheduledDate,
        scheduledTime: parsed.data.scheduledTime,
        address: parsed.data.address,
        totalPrice: parsed.data.totalPrice,
        notes: parsed.data.notes || null,
        status: "pending",
      });

      res.status(201).json(booking);
    } catch (err) {
      console.error("Error creating booking:", err);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/city-services/bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await cityServicesStorage.getBookings(req.user!.id);
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/city-services/bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const booking = await cityServicesStorage.getBooking(req.params.id);
      if (!booking || booking.userId !== req.user!.id) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.status === "completed" || booking.status === "cancelled") {
        return res.status(400).json({ message: "Cannot cancel this booking" });
      }
      const updated = await cityServicesStorage.updateBookingStatus(req.params.id, "cancelled");
      res.json(updated);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  app.post("/api/city-services/bookings/:id/rate", requireAuth, async (req, res) => {
    try {
      const booking = await cityServicesStorage.getBooking(req.params.id);
      if (!booking || booking.userId !== req.user!.id) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed bookings" });
      }
      const parsed = rateBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid rating" });
      }
      const updated = await cityServicesStorage.rateBooking(req.params.id, parsed.data.rating);
      res.json(updated);
    } catch (err) {
      console.error("Error rating booking:", err);
      res.status(500).json({ message: "Failed to rate booking" });
    }
  });

  app.get("/api/city-services/provider/profile", requireAuth, async (req, res) => {
    try {
      const provider = await cityServicesStorage.getProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      res.json(provider);
    } catch (err) {
      console.error("Error fetching provider profile:", err);
      res.status(500).json({ message: "Failed to fetch provider profile" });
    }
  });

  app.patch("/api/city-services/provider/profile", requireAuth, async (req, res) => {
    try {
      const provider = await cityServicesStorage.getProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      const parsed = providerFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await cityServicesStorage.updateProvider(provider.id, parsed.data as any);
      res.json(updated);
    } catch (err) {
      console.error("Error updating provider profile:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/city-services/provider/bookings", requireAuth, async (req, res) => {
    try {
      const provider = await cityServicesStorage.getProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      const bookings = await cityServicesStorage.getProviderBookings(provider.id);
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching provider bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/city-services/provider/bookings/:id/status", requireAuth, async (req, res) => {
    try {
      const provider = await cityServicesStorage.getProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      const booking = await cityServicesStorage.getBooking(req.params.id);
      if (!booking || booking.providerId !== provider.id) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const updated = await cityServicesStorage.updateBookingStatus(req.params.id, parsed.data.status);
      res.json(updated);
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.patch("/api/city-services/provider/availability", requireAuth, async (req, res) => {
    try {
      const provider = await cityServicesStorage.getProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      const { isAvailable } = req.body;
      if (typeof isAvailable !== "boolean") {
        return res.status(400).json({ message: "isAvailable must be a boolean" });
      }
      const updated = await cityServicesStorage.updateProvider(provider.id, { isAvailable });
      res.json(updated);
    } catch (err) {
      console.error("Error toggling availability:", err);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.get("/api/admin/city-services/categories", requireAdmin, async (req, res) => {
    try {
      const categories = await cityServicesStorage.getAllServiceCategories();
      res.json(categories);
    } catch (err) {
      console.error("Error fetching all service categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/city-services/categories", requireAdmin, async (req, res) => {
    try {
      const parsed = serviceCategoryFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid category data" });
      }
      const category = await cityServicesStorage.createServiceCategory(parsed.data as any);
      res.status(201).json(category);
    } catch (err) {
      console.error("Error creating service category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/city-services/categories/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = serviceCategoryFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await cityServicesStorage.updateServiceCategory(req.params.id, parsed.data as any);
      if (!updated) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating service category:", err);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/city-services/categories/:id", requireAdmin, async (req, res) => {
    try {
      await cityServicesStorage.deleteServiceCategory(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting service category:", err);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.get("/api/admin/city-services/services", requireAdmin, async (req, res) => {
    try {
      const services = await cityServicesStorage.getAllCityServices();
      res.json(services);
    } catch (err) {
      console.error("Error fetching all city services:", err);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/admin/city-services/services", requireAdmin, async (req, res) => {
    try {
      const parsed = cityServiceFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid service data" });
      }
      const service = await cityServicesStorage.createCityService(parsed.data as any);
      res.status(201).json(service);
    } catch (err) {
      console.error("Error creating city service:", err);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch("/api/admin/city-services/services/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = cityServiceFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await cityServicesStorage.updateCityService(req.params.id, parsed.data as any);
      if (!updated) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating city service:", err);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/admin/city-services/services/:id", requireAdmin, async (req, res) => {
    try {
      await cityServicesStorage.deleteCityService(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting city service:", err);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.get("/api/admin/city-services/providers", requireAdmin, async (req, res) => {
    try {
      const providers = await cityServicesStorage.getProviders();
      res.json(providers);
    } catch (err) {
      console.error("Error fetching providers:", err);
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  app.post("/api/admin/city-services/providers", requireAdmin, async (req, res) => {
    try {
      const parsed = providerFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid provider data" });
      }
      const provider = await cityServicesStorage.createProvider(parsed.data as any);
      res.status(201).json(provider);
    } catch (err) {
      console.error("Error creating provider:", err);
      res.status(500).json({ message: "Failed to create provider" });
    }
  });

  app.patch("/api/admin/city-services/providers/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = providerFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await cityServicesStorage.updateProvider(req.params.id, parsed.data as any);
      if (!updated) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating provider:", err);
      res.status(500).json({ message: "Failed to update provider" });
    }
  });

  app.delete("/api/admin/city-services/providers/:id", requireAdmin, async (req, res) => {
    try {
      await cityServicesStorage.deleteProvider(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting provider:", err);
      res.status(500).json({ message: "Failed to delete provider" });
    }
  });

  app.get("/api/admin/city-services/bookings", requireAdmin, async (req, res) => {
    try {
      const bookings = await cityServicesStorage.getAllBookings();
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching all bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/admin/city-services/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const updated = await cityServicesStorage.updateBookingStatus(req.params.id, parsed.data.status);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.patch("/api/admin/city-services/bookings/:id/assign", requireAdmin, async (req, res) => {
    try {
      const { providerId } = req.body;
      if (!providerId) {
        return res.status(400).json({ message: "providerId is required" });
      }
      const updated = await cityServicesStorage.assignProvider(req.params.id, providerId);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error assigning provider:", err);
      res.status(500).json({ message: "Failed to assign provider" });
    }
  });
}
