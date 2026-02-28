import type { Express } from "express";
import { z } from "zod";
import { hotelStorage } from "./hotel-storage";
import { requireAuth, requireAdmin, requirePartner } from "./auth";

export function registerHotelRoutes(app: Express) {
  // ==================== PUBLIC ROUTES ====================

  app.get("/api/hotels", async (req, res) => {
    try {
      const { city, stars, minPrice, maxPrice, search } = req.query;
      const filters: any = {};
      if (city && typeof city === "string") filters.city = city;
      if (stars) filters.stars = parseInt(stars as string);
      if (minPrice) filters.minPrice = parseFloat(minPrice as string);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
      if (search && typeof search === "string") filters.search = search;

      const hotelsList = await hotelStorage.getHotels(filters);
      res.json(hotelsList);
    } catch (err) {
      console.error("Error fetching hotels:", err);
      res.status(500).json({ message: "Failed to fetch hotels" });
    }
  });

  app.get("/api/hotels/:id", async (req, res) => {
    try {
      const hotel = await hotelStorage.getHotel(req.params.id);
      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }
      const rooms = await hotelStorage.getHotelRooms(req.params.id);
      res.json({ ...hotel, rooms });
    } catch (err) {
      console.error("Error fetching hotel:", err);
      res.status(500).json({ message: "Failed to fetch hotel" });
    }
  });

  // ==================== CUSTOMER ROUTES ====================

  const createBookingSchema = z.object({
    hotelId: z.string().min(1),
    roomId: z.string().min(1),
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
    guests: z.number().int().positive().default(1),
    totalPrice: z.string().min(1),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    specialRequests: z.string().optional(),
  });

  app.post("/api/hotel-bookings", requireAuth, async (req, res) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid booking data" });
      }

      const booking = await hotelStorage.createHotelBooking({
        userId: req.user!.id,
        ...parsed.data,
      });
      res.status(201).json(booking);
    } catch (err) {
      console.error("Error creating hotel booking:", err);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/hotel-bookings", requireAuth, async (req, res) => {
    try {
      const bookings = await hotelStorage.getUserHotelBookings(req.user!.id);
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching hotel bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/hotel-bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const booking = await hotelStorage.getHotelBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      if (booking.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await hotelStorage.updateHotelBookingStatus(req.params.id, "cancelled");
      res.json(updated);
    } catch (err) {
      console.error("Error cancelling hotel booking:", err);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // ==================== HOTEL MANAGER ROUTES ====================

  app.get("/api/hotel-manager/hotel", requirePartner("hotel"), async (req, res) => {
    try {
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0) {
        return res.status(404).json({ message: "No hotel assigned" });
      }
      const hotel = managerHotels[0];
      const rooms = await hotelStorage.getHotelRooms(hotel.id);
      res.json({ ...hotel, rooms });
    } catch (err) {
      console.error("Error fetching manager hotel:", err);
      res.status(500).json({ message: "Failed to fetch hotel" });
    }
  });

  app.patch("/api/hotel-manager/hotel", requirePartner("hotel"), async (req, res) => {
    try {
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0) {
        return res.status(404).json({ message: "No hotel assigned" });
      }
      const updated = await hotelStorage.updateHotel(managerHotels[0].id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Error updating hotel:", err);
      res.status(500).json({ message: "Failed to update hotel" });
    }
  });

  app.get("/api/hotel-manager/rooms", requirePartner("hotel"), async (req, res) => {
    try {
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0) {
        return res.status(404).json({ message: "No hotel assigned" });
      }
      const rooms = await hotelStorage.getHotelRooms(managerHotels[0].id);
      res.json(rooms);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  const roomSchema = z.object({
    hotelId: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    price: z.string().min(1),
    maxGuests: z.number().int().positive().optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    isAvailable: z.boolean().optional(),
    totalRooms: z.number().int().positive().optional(),
    availableRooms: z.number().int().min(0).optional(),
  });

  app.post("/api/hotel-manager/rooms", requirePartner("hotel"), async (req, res) => {
    try {
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0) {
        return res.status(404).json({ message: "No hotel assigned" });
      }
      const parsed = roomSchema.safeParse({ ...req.body, hotelId: managerHotels[0].id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid room data" });
      }
      const room = await hotelStorage.createHotelRoom(parsed.data);
      res.status(201).json(room);
    } catch (err) {
      console.error("Error creating room:", err);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch("/api/hotel-manager/rooms/:id", requirePartner("hotel"), async (req, res) => {
    try {
      const room = await hotelStorage.getHotelRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0 || room.hotelId !== managerHotels[0].id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await hotelStorage.updateHotelRoom(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Error updating room:", err);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/hotel-manager/rooms/:id", requirePartner("hotel"), async (req, res) => {
    try {
      const room = await hotelStorage.getHotelRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0 || room.hotelId !== managerHotels[0].id) {
        return res.status(403).json({ message: "Access denied" });
      }
      await hotelStorage.deleteHotelRoom(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting room:", err);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  app.get("/api/hotel-manager/bookings", requirePartner("hotel"), async (req, res) => {
    try {
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0) {
        return res.status(404).json({ message: "No hotel assigned" });
      }
      const bookings = await hotelStorage.getHotelBookings(managerHotels[0].id);
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching hotel bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  const updateBookingStatusSchema = z.object({
    status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled"]),
  });

  app.patch("/api/hotel-manager/bookings/:id/status", requirePartner("hotel"), async (req, res) => {
    try {
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const booking = await hotelStorage.getHotelBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const managerHotels = await hotelStorage.getHotelsByManager(req.user!.id);
      if (managerHotels.length === 0 || booking.hotelId !== managerHotels[0].id) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updated = await hotelStorage.updateHotelBookingStatus(req.params.id, parsed.data.status);
      res.json(updated);
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  app.get("/api/admin/hotels", requireAdmin, async (req, res) => {
    try {
      const allHotels = await hotelStorage.getAllHotels();
      res.json(allHotels);
    } catch (err) {
      console.error("Error fetching all hotels:", err);
      res.status(500).json({ message: "Failed to fetch hotels" });
    }
  });

  const adminHotelSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    images: z.array(z.string()).optional(),
    city: z.string().min(1),
    address: z.string().optional(),
    rating: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    starRating: z.number().int().min(1).max(5).optional(),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    isActive: z.boolean().optional(),
    managerId: z.string().optional().nullable(),
  });

  app.post("/api/admin/hotels", requireAdmin, async (req, res) => {
    try {
      const parsed = adminHotelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid hotel data" });
      }
      const hotel = await hotelStorage.createHotel(parsed.data);
      res.status(201).json(hotel);
    } catch (err) {
      console.error("Error creating hotel:", err);
      res.status(500).json({ message: "Failed to create hotel" });
    }
  });

  app.patch("/api/admin/hotels/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await hotelStorage.updateHotel(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Hotel not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating hotel:", err);
      res.status(500).json({ message: "Failed to update hotel" });
    }
  });

  app.delete("/api/admin/hotels/:id", requireAdmin, async (req, res) => {
    try {
      await hotelStorage.deleteHotel(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting hotel:", err);
      res.status(500).json({ message: "Failed to delete hotel" });
    }
  });

  app.get("/api/admin/hotels/:id/rooms", requireAdmin, async (req, res) => {
    try {
      const rooms = await hotelStorage.getHotelRooms(req.params.id);
      res.json(rooms);
    } catch (err) {
      console.error("Error fetching hotel rooms:", err);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/admin/hotels/:id/rooms", requireAdmin, async (req, res) => {
    try {
      const parsed = roomSchema.safeParse({ ...req.body, hotelId: req.params.id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid room data" });
      }
      const room = await hotelStorage.createHotelRoom(parsed.data);
      res.status(201).json(room);
    } catch (err) {
      console.error("Error creating room:", err);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch("/api/admin/hotel-rooms/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await hotelStorage.updateHotelRoom(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating room:", err);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/admin/hotel-rooms/:id", requireAdmin, async (req, res) => {
    try {
      await hotelStorage.deleteHotelRoom(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting room:", err);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  app.get("/api/admin/hotel-bookings", requireAdmin, async (req, res) => {
    try {
      const bookings = await hotelStorage.getAllHotelBookings();
      res.json(bookings);
    } catch (err) {
      console.error("Error fetching all hotel bookings:", err);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/admin/hotel-bookings/:id/status", requireAdmin, async (req, res) => {
    try {
      const parsed = updateBookingStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const updated = await hotelStorage.updateHotelBookingStatus(req.params.id, parsed.data.status);
      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating booking status:", err);
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  app.patch("/api/admin/hotels/:id/manager", requireAdmin, async (req, res) => {
    try {
      const { managerId } = req.body;
      const updated = await hotelStorage.updateHotel(req.params.id, { managerId });
      if (!updated) {
        return res.status(404).json({ message: "Hotel not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error assigning manager:", err);
      res.status(500).json({ message: "Failed to assign manager" });
    }
  });
}
