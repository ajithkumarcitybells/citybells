import type { Express } from "express";
import { z } from "zod";
import { taxiStorage } from "./taxi-storage";
import { requireAuth, requireAdmin, requirePartner } from "./auth";
import { insertTaxiVehicleTypeSchema, insertTaxiDriverSchema, insertTaxiRideSchema } from "@shared/schema";
import { PaymentMethod } from "./schemas/uber-schemas";
import { searchLocationsWithCache } from "./lib/map-search";

const TAXI_MAP_USER_AGENT = "City-Serve-Hub/1.0";

type NominatimSearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
};

type NominatimReverseResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type OsrmRouteResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
  }>;
};

type NearbyDriverResponse = {
  id: string;
  name: string;
  vehicleType: string;
  vehicleNumber: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  status: "available";
  type: "car" | "bike" | "auto";
  heading: number;
  distanceKm: number;
  etaMin: number;
  rating: number;
};

function getPlaceName(displayName: string, name?: string) {
  if (name && name.trim().length > 0) {
    return name.trim();
  }

  return displayName.split(",")[0]?.trim() || displayName;
}

async function fetchMapJson<T>(url: URL): Promise<T> {
  const controller = new AbortController();
  const timeout = Number(process.env.MAP_REQUEST_TIMEOUT_MS || String(5000));
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": TAXI_MAP_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Map service request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(id);
  }
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371; // km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aVal = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}

function toNearbyDriverResponse(vehicle: Awaited<ReturnType<typeof taxiStorage.getNearbyTaxiVehicles>>[number]): NearbyDriverResponse {
  return {
    id: vehicle.id,
    name: vehicle.driverName,
    vehicleType: vehicle.vehicleType,
    vehicleNumber: vehicle.vehicleNumber,
    currentLocation: {
      lat: vehicle.lat,
      lng: vehicle.lng,
    },
    status: "available",
    type: vehicle.type,
    heading: vehicle.heading,
    distanceKm: vehicle.distanceKm,
    etaMin: vehicle.etaMin,
    rating: vehicle.rating,
  };
}

export function registerTaxiRoutes(app: Express) {
  const mapSearchSchema = z.object({
    q: z.string().trim().min(2),
  });

  // Simple per-IP rate limiter for map search: allow N requests per window
  const RATE_LIMIT_WINDOW_MS = Number(process.env.MAP_SEARCH_RATE_WINDOW_MS || String(10_000)); // 10s
  const RATE_LIMIT_MAX = Number(process.env.MAP_SEARCH_RATE_MAX || String(10));
  const rateMap = new Map<string, { count: number; resetAt: number }>();

  // Periodic cleanup to avoid unbounded memory growth in the rate limiter
  setInterval(() => {
    rateMap.clear();
  }, 60_000);

  app.get("/api/taxi/map/search", async (req, res) => {
    try {
      const parsed = mapSearchSchema.safeParse({ q: req.query.q });
      if (!parsed.success) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }

      // rate limit by IP
      const ip = (req.ip || req.socket.remoteAddress || "unknown") as string;
      const state = rateMap.get(ip) ?? { count: 0, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS };
      if (Date.now() > state.resetAt) {
        state.count = 0;
        state.resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
      }
      state.count += 1;
      rateMap.set(ip, state);
      if (state.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ message: "Rate limit exceeded" });
      }

      const q = parsed.data.q;
      const results = await searchLocationsWithCache(q);
      return res.json(results.map(r => ({ id: r.id, name: r.name, address: r.address, lat: r.lat, lng: r.lng })));
    } catch (err) {
      console.error("Error searching taxi locations:", err);
      res.status(500).json({ message: "Failed to search locations" });
    }
  });

  const reverseGeocodeSchema = z.object({
    lat: z.coerce.number().finite(),
    lng: z.coerce.number().finite(),
  });

  app.get("/api/taxi/map/reverse", async (req, res) => {
    try {
      const parsed = reverseGeocodeSchema.safeParse({ lat: req.query.lat, lng: req.query.lng });
      if (!parsed.success) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("lat", parsed.data.lat.toString());
      url.searchParams.set("lon", parsed.data.lng.toString());
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("zoom", "18");

      const result = await fetchMapJson<NominatimReverseResult>(url);
      res.json({
        address: result.display_name,
        lat: Number(result.lat),
        lng: Number(result.lon),
      });
    } catch (err) {
      console.error("Error reverse geocoding taxi location:", err);
      res.status(500).json({ message: "Failed to resolve address" });
    }
  });

  const routeQuerySchema = z.object({
    pickupLat: z.coerce.number().finite(),
    pickupLng: z.coerce.number().finite(),
    dropLat: z.coerce.number().finite(),
    dropLng: z.coerce.number().finite(),
  });

  app.get("/api/taxi/map/route", async (req, res) => {
    try {
      const parsed = routeQuerySchema.safeParse({
        pickupLat: req.query.pickupLat,
        pickupLng: req.query.pickupLng,
        dropLat: req.query.dropLat,
        dropLng: req.query.dropLng,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Pickup and drop coordinates are required" });
      }

      const { pickupLat, pickupLng, dropLat, dropLng } = parsed.data;
      const url = new URL(`https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}`);
      url.searchParams.set("overview", "full");
      url.searchParams.set("geometries", "geojson");
      url.searchParams.set("steps", "false");

      try {
        const routeData = await fetchMapJson<OsrmRouteResponse>(url);
        const route = routeData.routes?.[0];
        if (!route) {
          return res.status(404).json({ message: "No route found for the selected locations" });
        }

        res.json({
          distanceKm: Number((route.distance / 1000).toFixed(1)),
          durationMin: Math.max(1, Math.round(route.duration / 60)),
          geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
        });
      } catch (err) {
        console.warn("OSRM failed, using fallback");

        const distanceKm = Number(haversineKm(
          { lat: pickupLat, lng: pickupLng },
          { lat: dropLat, lng: dropLng }
        ).toFixed(1));

        const avgSpeed = 25; // realistic city speed (km/h)
        const durationMin = Math.max(2, Math.round((distanceKm / avgSpeed) * 60));

        res.json({
          distanceKm,
          durationMin,
          geometry: [
            [pickupLat, pickupLng],
            [dropLat, dropLng]
          ]
        });
      }
    } catch (err) {
      console.error("Error fetching taxi route:", err);
      res.status(500).json({ message: "Failed to calculate route" });
    }
  });

  const nearbyVehiclesSchema = z.object({
    lat: z.coerce.number().finite(),
    lng: z.coerce.number().finite(),
    count: z.coerce.number().int().min(1).max(20).default(8),
    type: z.enum(["car", "bike", "auto"]).optional(),
  });

  app.get("/api/taxi/map/vehicles", async (req, res) => {
    try {
      const parsed = nearbyVehiclesSchema.safeParse({
        lat: req.query.lat,
        lng: req.query.lng,
        count: req.query.count,
        type: req.query.type,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Valid map center coordinates are required" });
      }

      const vehicles = await taxiStorage.getNearbyTaxiVehicles(
        { lat: parsed.data.lat, lng: parsed.data.lng },
        { count: parsed.data.count, type: parsed.data.type },
      );

      res.json(vehicles);
    } catch (err) {
      console.error("Error fetching nearby taxi vehicles:", err);
      res.status(500).json({ message: "Failed to fetch nearby vehicles" });
    }
  });

  app.get("/api/drivers/nearby", async (req, res) => {
    try {
      const parsed = nearbyVehiclesSchema.safeParse({
        lat: req.query.lat,
        lng: req.query.lng,
        count: req.query.count,
        type: req.query.type,
      });

      if (!parsed.success) {
        return res.status(400).json({ message: "Valid pickup coordinates are required" });
      }

      const vehicles = await taxiStorage.getNearbyTaxiVehicles(
        { lat: parsed.data.lat, lng: parsed.data.lng },
        { count: parsed.data.count, type: parsed.data.type },
      );

      res.json(vehicles.map(toNearbyDriverResponse));
    } catch (err) {
      console.error("Error fetching nearby drivers:", err);
      res.status(500).json({ message: "Failed to fetch nearby drivers" });
    }
  });

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
      const perKm = parseFloat(vehicleType.pricePerKm);
      const perMin = parseFloat(vehicleType.pricePerMinute);
      const estimatedFare =baseFare +(perKm * distance) +(perMin * duration);

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
    driverId: z.string().min(1).optional(),
    pickupAddress: z.string().min(1),
    dropAddress: z.string().min(1),
    pickupLat: z.coerce.number().finite(),
    pickupLng: z.coerce.number().finite(),
    dropLat: z.coerce.number().finite(),
    dropLng: z.coerce.number().finite(),
    fare: z.coerce.number().positive(),
    distance: z.coerce.number().positive().optional(),
    duration: z.coerce.number().int().positive().optional(),
    paymentMethod: z.enum([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.WALLET, PaymentMethod.UPI]).default(PaymentMethod.CASH),
    notes: z.string().trim().max(200).optional(),
  });

  app.post("/api/taxi/rides", requireAuth, async (req, res) => {
    try {
      const parsed = bookRideSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      try { console.log("[TAXI BOOK] vehicleTypeId:", parsed.data.vehicleTypeId, "driverId:", parsed.data.driverId); } catch (e) {}

      let selectedNearbyVehicle: Awaited<ReturnType<typeof taxiStorage.getNearbyTaxiVehicles>>[number] | null = null;

      let vehicleType = await taxiStorage.getTaxiVehicleType(parsed.data.vehicleTypeId);
      // Defensive fallback: try resolving by ObjectId directly if storage helper missed it
      if (!vehicleType) {
        try {
          const { ObjectId } = await import('mongodb');
          if (/^[a-fA-F0-9]{24}$/.test(parsed.data.vehicleTypeId)) {
            const db = (await import('./db')).getDb();
            const raw = await db.collection('taxi_vehicle_types').findOne({ _id: new ObjectId(parsed.data.vehicleTypeId) });
            if (raw) vehicleType = { id: raw._id?.toString(), ...raw } as any;
          }
        } catch (e) {
          // ignore and fall through
        }
      }

      if (!vehicleType) {
        return res.status(404).json({ message: "Vehicle type not found" });
      }

      if (parsed.data.driverId) {
        const driver = await taxiStorage.getTaxiDriver(parsed.data.driverId);
        if (driver && driver.isActive && driver.isApproved) {
          selectedNearbyVehicle = {
            id: driver._id,
            driverName: driver.name,
            vehicleNumber: driver.vehicleNumber,
            vehicleType: driver.vehicleType,
          } as Awaited<ReturnType<typeof taxiStorage.getNearbyTaxiVehicles>>[number];
        } else {
          const nearbyVehicles = await taxiStorage.getNearbyTaxiVehicles(
            { lat: parsed.data.pickupLat, lng: parsed.data.pickupLng },
            { count: 20 },
          );
          selectedNearbyVehicle = nearbyVehicles.find((vehicle) => vehicle.id === parsed.data.driverId) ?? null;
        }

        if (!selectedNearbyVehicle) {
          return res.status(404).json({ message: "Selected driver is no longer available" });
        }
      }

      const ride = await taxiStorage.createTaxiRide({
        userId: req.user!.id,
        vehicleType: vehicleType.name,
        pickupLat: parsed.data.pickupLat,
        pickupLng: parsed.data.pickupLng,
        dropLat: parsed.data.dropLat,
        dropLng: parsed.data.dropLng,
        pickupAddress: parsed.data.pickupAddress,
        dropAddress: parsed.data.dropAddress,
        fare: Number(parsed.data.fare.toFixed(2)),
        status: "searching",
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: "pending",
        distance: parsed.data.distance,
        duration: parsed.data.duration,
        notes: parsed.data.notes,
      });

      // Generate OTP for this ride
      const otpResult = await taxiStorage.createRideOtp(ride.id ?? ride._id, req.user!.id);
      const otp = otpResult?.otp;

      // Log OTP for demo/testing (remove in production)
      if (otp) {
        console.log(`[TAXI] Ride OTP for testing: ${otp}`);
      }

      if (selectedNearbyVehicle) {
        const assignedRide = await taxiStorage.assignTaxiDriverSnapshot(ride.id ?? ride._id, {
          id: selectedNearbyVehicle.id,
          driverName: selectedNearbyVehicle.driverName,
          vehicleNumber: selectedNearbyVehicle.vehicleNumber,
          vehicleType: selectedNearbyVehicle.vehicleType,
        });
        return res.status(201).json({ ...(assignedRide ?? ride), otp }); // Include OTP in response (TEMP - for testing)
      }

      res.status(201).json({ ...ride, otp }); // Include OTP in response (TEMP - for testing)
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

  // ==================== OTP VERIFICATION ====================

  const verifyOtpSchema = z.object({
    rideId: z.string().min(1),
    otp: z.string().regex(/^\d{4}$/, "OTP must be 4 digits"),
  });

  app.post("/api/taxi/verify-otp", requireAuth, async (req, res) => {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const result = await taxiStorage.verifyRideOtp(parsed.data.rideId, parsed.data.otp);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message || "OTP verification failed" });
      }

      res.json({ success: true, message: "OTP verified successfully" });
    } catch (err) {
      console.error("Error verifying OTP:", err);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/taxi/resend-otp", requireAuth, async (req, res) => {
    try {
      const { rideId } = req.body;
      if (!rideId) {
        return res.status(400).json({ message: "Ride ID is required" });
      }

      const ride = await taxiStorage.getTaxiRide(rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }

      if (ride.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const result = await taxiStorage.resendRideOtp(rideId);
      if (!result) {
        return res.status(400).json({ message: "Failed to resend OTP" });
      }

      console.log(`[TAXI] Resent OTP for testing: ${result.otp}`);
      res.json({ success: true, otp: result.otp }); // TEMP: Include in response for testing
    } catch (err) {
      console.error("Error resending OTP:", err);
      res.status(500).json({ message: "Failed to resend OTP" });
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

  const driverLocationSchema = z.object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  });

  app.patch("/api/taxi/driver/location", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const parsed = driverLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Valid latitude and longitude are required" });
      }

      const updated = await taxiStorage.updateTaxiDriverLocation(req.user!.id, parsed.data.lat, parsed.data.lng);
      res.json(updated);
    } catch (err) {
      console.error("Error updating taxi driver location:", err);
      res.status(500).json({ message: "Failed to update driver location" });
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

      // Link OTP to driver when status changes to driver_assigned
      if (parsed.data.status === "driver_assigned" && driver.id) {
        await taxiStorage.linkOtpToDriver(req.params.id, driver.id);
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

  // Seed endpoint to initialize vehicle types if missing (bootstrap-safe)
  // Works without admin auth if collection is empty (first-time setup)
  app.post("/api/admin/taxi/seed-vehicle-types", async (req, res) => {
    try {
      const db = (await import("./db")).getDb();
      const existing = await db.collection('taxi_vehicle_types').find().limit(1).toArray();
      
      // If vehicle types already exist, require admin auth
      if (existing.length > 0) {
        if (!req.isAuthenticated() || !req.user?.isAdmin) {
          return res.status(403).json({ message: "Access denied. Vehicle types already exist." });
        }
        return res.json({ message: "Vehicle types already exist", count: existing.length });
      }

      // Bootstrap scenario: no vehicle types exist yet, allow unseeded access
      const now = new Date();
      const vehicleTypes = [
        { name: 'Auto', baseFare: '20.00', perKmRate: '10.00', perMinRate: '0.50', type: 'auto', createdAt: now },
        { name: 'Mini', baseFare: '30.00', perKmRate: '12.00', perMinRate: '0.60', type: 'car', createdAt: now },
        { name: 'Sedan', baseFare: '40.00', perKmRate: '15.00', perMinRate: '0.75', type: 'car', createdAt: now },
        { name: 'SUV', baseFare: '60.00', perKmRate: '20.00', perMinRate: '1.00', type: 'car', createdAt: now },
        { name: 'Bike', baseFare: '10.00', perKmRate: '6.00', perMinRate: '0.30', type: 'bike', createdAt: now },
      ];
      const result = await db.collection('taxi_vehicle_types').insertMany(vehicleTypes);
      res.json({ message: `Seeded ${result.insertedCount} vehicle types`, count: result.insertedCount });
    } catch (err) {
      console.error("Error seeding vehicle types:", err);
      res.status(500).json({ message: "Failed to seed vehicle types", error: err instanceof Error ? err.message : String(err) });
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

  app.get("/api/admin/taxi/drivers/available", requireAdmin, async (req, res) => {
    try {
      const drivers = await taxiStorage.getTaxiDrivers();
      const rides = await taxiStorage.getAllTaxiRides();
      const busy = new Set((rides || []).filter(r => r && (r.status === 'driver_assigned' || r.status === 'in_ride')).map(r => r.driverId).filter(Boolean));
      const available = (drivers || []).filter(d => d.isOnline && !busy.has(d.id));
      res.json(available);
    } catch (err) {
      console.error('Failed to fetch available drivers:', err);
      res.status(500).json({ message: 'Failed to fetch available drivers' });
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
