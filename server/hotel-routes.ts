import type { Express } from "express";
import { z } from "zod";
import { hotelStorage } from "./hotel-storage";
import { requireAuth, requireAdmin, requirePartner } from "./auth";
import { hotelPricingRuleSchema } from "@shared/schema";

export function registerHotelRoutes(app: Express) {
  // ==================== PUBLIC ROUTES ====================

  const hotelListFilterSchema = z.object({
    city: z.string().trim().optional(),
    stars: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().trim().optional(),
    amenities: z.string().optional(),
    types: z.string().optional(),
    propertyTypes: z.string().optional(),
    locations: z.string().optional(),
    checkIn: z.string().trim().optional(),
    checkOut: z.string().trim().optional(),
    guests: z.coerce.number().int().min(1).max(30).optional(),
    rooms: z.coerce.number().int().min(1).max(10).optional(),
    availableOnly: z.union([z.literal("true"), z.literal("false"), z.boolean()]).optional(),
    sortBy: z.enum(["recommended", "price-low", "price-high", "rating-high", "popularity", "newest", "stars-high", "name"]).optional(),
    sort: z.string().optional(),
  }).refine((value) => {
    if (!value.checkIn || !value.checkOut) return true;
    const checkIn = new Date(value.checkIn);
    const checkOut = new Date(value.checkOut);
    return !Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn;
  }, { message: "Check-out date must be after check-in date" });

  app.get("/api/hotels", async (req, res) => {
    try {
      const parsed = hotelListFilterSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid hotel filters" });
      }
      const { city, stars, minPrice, maxPrice, search, amenities, types, propertyTypes, locations, checkIn, checkOut, guests, rooms, availableOnly, sortBy, sort } = parsed.data;
      const filters: any = {};
      if (city && typeof city === "string") filters.city = city;
      if (stars) filters.stars = String(stars).split(",").map((value) => Number(value)).filter(Number.isFinite);
      if (minPrice != null) filters.minPrice = minPrice;
      if (maxPrice != null) filters.maxPrice = maxPrice;
      if (search && typeof search === "string") filters.search = search;
      if (locations && typeof locations === "string") filters.locations = locations.split(",").map((value) => value.trim()).filter(Boolean);
      if (amenities && typeof amenities === "string") filters.amenities = amenities.split(",").map((value) => value.trim()).filter(Boolean);
      const typeQuery = types || propertyTypes;
      if (typeQuery && typeof typeQuery === "string") filters.propertyTypes = typeQuery.split(",").map((value) => value.trim()).filter(Boolean);
      if (checkIn) filters.checkIn = checkIn;
      if (checkOut) filters.checkOut = checkOut;
      if (guests) filters.guests = guests;
      if (rooms) filters.rooms = rooms;
      if (availableOnly != null) filters.availableOnly = availableOnly === true || availableOnly === "true";
      if (sortBy || sort) filters.sortBy = sortBy || sort;

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
      const rawRooms = await hotelStorage.getHotelRooms(req.params.id);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const defaultCheckIn = today.toISOString().slice(0, 10);
      const defaultCheckOut = tomorrow.toISOString().slice(0, 10);
      const rooms = await Promise.all(rawRooms.map(async (room: any) => {
        try {
          const priced = await hotelStorage.calculateHotelRoomPrice({
            hotelId: req.params.id,
            roomId: room.id,
            checkIn: defaultCheckIn,
            checkOut: defaultCheckOut,
          });
          return {
            ...room,
            dynamicPrice: priced.dynamicPrice,
            priceBadge: priced.badge,
            priceChanged: priced.dynamicPrice !== Number(room.price),
            pricingBreakdown: priced,
          };
        } catch {
          return room;
        }
      }));
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
    totalPrice: z.string().optional(),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    specialRequests: z.string().optional(),
  }).refine((value) => {
    const checkIn = new Date(value.checkIn);
    const checkOut = new Date(value.checkOut);
    return !Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn;
  }, { message: "Check-out date must be after check-in date" });

  const calculateHotelPriceSchema = z.object({
    checkIn: z.string().min(1),
    checkOut: z.string().min(1),
  }).refine((value) => {
    const checkIn = new Date(value.checkIn);
    const checkOut = new Date(value.checkOut);
    return !Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn;
  }, { message: "Check-out date must be after check-in date" });

  app.post("/api/hotels/:hotelId/rooms/:roomId/calculate-price", async (req, res) => {
    try {
      const parsed = calculateHotelPriceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid pricing dates" });
      }
      const price = await hotelStorage.calculateHotelRoomPrice({
        hotelId: req.params.hotelId,
        roomId: req.params.roomId,
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
      });
      res.json(price);
    } catch (err: any) {
      console.error("Error calculating hotel room price:", err);
      res.status(err?.message === "Room not found" ? 404 : 500).json({ message: err?.message || "Failed to calculate price" });
    }
  });

  app.post("/api/hotel-bookings", requireAuth, async (req, res) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid booking data" });
      }

      const price = await hotelStorage.calculateHotelRoomPrice({
        hotelId: parsed.data.hotelId,
        roomId: parsed.data.roomId,
        checkIn: parsed.data.checkIn,
        checkOut: parsed.data.checkOut,
      });

      if (price.availableRooms <= 0) {
        return res.status(409).json({ message: "Room is not available for selected dates" });
      }

      const booking = await hotelStorage.createHotelBooking({
        userId: req.user!.id,
        ...parsed.data,
        basePrice: price.basePrice.toFixed(2),
        dynamicPrice: price.dynamicPrice.toFixed(2),
        appliedRules: price.appliedRules,
        nights: price.nights,
        totalPrice: price.totalPrice.toFixed(2),
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

  app.get("/api/admin/hotel-pricing/rules", requireAdmin, async (_req, res) => {
    try {
      const [rules, dynamicPricingEnabled] = await Promise.all([
        hotelStorage.getHotelPricingRules(),
        hotelStorage.getHotelDynamicPricingEnabled(),
      ]);
      res.json({ dynamicPricingEnabled, rules });
    } catch (err) {
      console.error("Error fetching hotel pricing rules:", err);
      res.status(500).json({ message: "Failed to fetch pricing rules" });
    }
  });

  app.post("/api/admin/hotel-pricing/rules", requireAdmin, async (req, res) => {
    try {
      if (Object.prototype.hasOwnProperty.call(req.body, "dynamicPricingEnabled") && Object.keys(req.body).length === 1) {
        if (typeof req.body.dynamicPricingEnabled !== "boolean") {
          return res.status(400).json({ message: "dynamicPricingEnabled must be a boolean" });
        }
        const enabled = await hotelStorage.setHotelDynamicPricingEnabled(req.body.dynamicPricingEnabled);
        return res.json({ dynamicPricingEnabled: enabled });
      }

      if (typeof req.body.name === "string") {
        req.body.name = req.body.name.trim();
      }

      const parsed = hotelPricingRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0];
        const field = firstError?.path?.join(".");
        const message = field === "name" ? "Rule name is required" : firstError?.message || "Invalid pricing rule";
        return res.status(400).json({ message });
      }
      const rule = await hotelStorage.createHotelPricingRule(parsed.data);
      res.status(201).json(rule);
    } catch (err) {
      console.error("Error creating hotel pricing rule:", err);
      res.status(500).json({ message: "Failed to create pricing rule" });
    }
  });

  app.patch("/api/admin/hotel-pricing/rules/:id", requireAdmin, async (req, res) => {
    try {
      const updateHotelPricingRuleSchema = z.object({
        name: z.string().min(1).optional(),
        type: z.enum(["weekend", "holiday", "demand", "season", "availability", "manual_override"]).optional(),
        multiplier: z.coerce.number().min(0.01).max(10).optional().nullable(),
        fixedPrice: z.coerce.number().min(0).optional().nullable(),
        minPrice: z.coerce.number().min(0).optional().nullable(),
        maxPrice: z.coerce.number().min(0).optional().nullable(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
        hotelId: z.string().optional().nullable(),
        roomId: z.string().optional().nullable(),
        enabled: z.boolean().optional(),
        priority: z.coerce.number().int().optional(),
      });
      const parsed = updateHotelPricingRuleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid pricing rule" });
      }
      const rule = await hotelStorage.updateHotelPricingRule(req.params.id, parsed.data);
      if (!rule) return res.status(404).json({ message: "Pricing rule not found" });
      res.json(rule);
    } catch (err) {
      console.error("Error updating hotel pricing rule:", err);
      res.status(500).json({ message: "Failed to update pricing rule" });
    }
  });

  app.delete("/api/admin/hotel-pricing/rules/:id", requireAdmin, async (req, res) => {
    try {
      await hotelStorage.deleteHotelPricingRule(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting hotel pricing rule:", err);
      res.status(500).json({ message: "Failed to delete pricing rule" });
    }
  });

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
    propertyType: z.string().optional(),
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
