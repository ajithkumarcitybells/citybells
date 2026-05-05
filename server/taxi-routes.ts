import type { Express } from "express";
import { z } from "zod";
import { sanitizeTaxiRide, taxiStorage } from "./taxi-storage";
import { requireAuth, requireAdmin, requirePartner } from "./auth";
import { getDb, toObjectId } from "./db";
import { createAndDispatchNotification } from "./notifications";
import { insertTaxiVehicleTypeSchema, insertTaxiDriverSchema, insertTaxiRideSchema } from "@shared/schema";
import { PaymentMethod } from "./schemas/uber-schemas";
import { searchLocationsWithCache } from "./lib/map-search";
import { predictTaxiEta } from "./lib/taxi-eta";

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

const ACTIVE_DRIVER_STATUSES = ["requested", "accepted", "driver_assigned", "arriving", "in_ride", "started"];
const RIDE_REQUEST_MESSAGE = "New ride request received. Please accept or reject the ride.";

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

function rideFilter(rideId: string) {
  try {
    return { _id: toObjectId(rideId) } as any;
  } catch {
    return { _id: rideId as any };
  }
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return haversineKm(a, b);
}

async function getAvailableRideRequestDrivers(ride: any, preferredDriverId?: string | null) {
  const db = getDb();
  const rejectedDrivers = new Set<string>((ride.rejectedDriverIds || []).map(String));
  const busyRides = await db.collection("taxi_rides").find({
    _id: { $ne: ride._id },
    status: { $in: ACTIVE_DRIVER_STATUSES },
    driverId: { $ne: null },
  }).project({ driverId: 1 }).toArray();
  const busyDrivers = new Set(busyRides.map((item: any) => String(item.driverId)).filter(Boolean));

  const drivers = await db.collection("taxi_drivers").find({
    isApproved: { $ne: false },
  }).toArray();

  const pickup = {
    lat: Number(ride.pickupLat),
    lng: Number(ride.pickupLng),
  };

  return drivers
    .filter((driver: any) => {
      const id = String(driver._id);
      if (rejectedDrivers.has(id) || busyDrivers.has(id)) return false;
      if (preferredDriverId && id !== preferredDriverId) return false;
      const hasOnlineFlag = driver.isActive !== undefined || driver.isOnline !== undefined;
      if (hasOnlineFlag && !(driver.isActive === true || driver.isOnline === true)) return false;
      return true;
    })
    .map((driver: any) => {
      const driverLat = Number(driver.currentLat);
      const driverLng = Number(driver.currentLng);
      const hasLocation = Number.isFinite(driverLat) && Number.isFinite(driverLng) && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng);
      return {
        ...driver,
        id: String(driver._id),
        distanceToPickupKm: hasLocation ? distanceKm({ lat: driverLat, lng: driverLng }, pickup) : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((left: any, right: any) => left.distanceToPickupKm - right.distanceToPickupKm);
}

async function notifyRideUser(app: Express, ride: any, title: string, description: string, meta: Record<string, any> = {}) {
  try {
    await createAndDispatchNotification(ride.userId, "taxi.ride", String(ride._id || ride.id), title, description, meta);
  } catch (error) {
    console.warn("Ride user notification failed", error);
  }
  try {
    (app as any).locals.io?.to(`ride:${String(ride._id || ride.id)}`).emit("taxiRideUpdate", {
      rideId: String(ride._id || ride.id),
      title,
      message: description,
      ...meta,
    });
  } catch {}
}

async function notifyRideDriver(app: Express, driver: any, ride: any) {
  const rideId = String(ride._id || ride.id);
  const payload = {
    rideId,
    driverId: String(driver._id || driver.id),
    message: RIDE_REQUEST_MESSAGE,
    pickupArea: ride.pickupAddress,
    fare: ride.fare ?? ride.estimatedFare ?? null,
    distance: ride.distance ?? null,
  };

  try {
    if (driver.userId) {
      await createAndDispatchNotification(
        driver.userId,
        "taxi.ride_request",
        rideId,
        "New ride request",
        RIDE_REQUEST_MESSAGE,
        payload,
      );
    }
  } catch (error) {
    console.warn("Ride driver notification failed", error);
  }

  try {
    const io = (app as any).locals.io;
    io?.to(`driver:${String(driver.userId || driver._id || driver.id)}`).emit("taxiRideRequest", payload);
    if (driver.userId) io?.to(`driver:${String(driver._id || driver.id)}`).emit("taxiRideRequest", payload);
  } catch {}
}

async function notifyTaxiAdmins(app: Express, event: any, title: string, description: string) {
  try {
    const db = getDb();
    const admins = await db.collection("users").find({ isAdmin: true }).project({ _id: 1 }).toArray();
    for (const admin of admins) {
      await createAndDispatchNotification(
        String(admin._id),
        "taxi.safety",
        String(event.rideId || event._id || event.id),
        title,
        description,
        { eventId: String(event._id || event.id), rideId: String(event.rideId), type: event.type },
      );
    }
  } catch (error) {
    console.warn("Admin safety notification failed", error);
  }

  try {
    (app as any).locals.io?.to("admin:rides").emit("taxiSafetyEvent", {
      eventId: String(event._id || event.id),
      rideId: String(event.rideId),
      type: event.type,
      title,
      message: description,
    });
  } catch {}
}

async function dispatchRideRequest(app: Express, rideId: string, preferredDriverId?: string | null) {
  const db = getDb();
  const ride = await db.collection("taxi_rides").findOne(rideFilter(rideId));
  if (!ride) return null;

  const candidates = await getAvailableRideRequestDrivers(ride, preferredDriverId);
  if (candidates.length === 0) {
    const updated = await db.collection("taxi_rides").findOneAndUpdate(
      rideFilter(rideId),
      {
        $set: {
          status: "no_drivers",
          driverId: null,
          driverName: null,
          driverPhone: null,
          vehicleNumber: null,
          rideRequestMessage: "No drivers are currently available. Please try again.",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    const nextRide = (updated as any)?.value ?? updated;
    await notifyRideUser(app, nextRide, "No drivers available", "No drivers are currently available. Please try again.", { status: "no_drivers" });
    return nextRide;
  }

  const updated = await db.collection("taxi_rides").findOneAndUpdate(
    rideFilter(rideId),
    {
      $set: {
        driverId: null,
        driverName: null,
        driverPhone: null,
        vehicleNumber: null,
        status: "requested",
        rideRequestMessage: RIDE_REQUEST_MESSAGE,
        notifiedDriverIds: candidates.map((driver: any) => String(driver._id || driver.id)),
        availableDriverCount: candidates.length,
        requestedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  const nextRide = (updated as any)?.value ?? updated;
  for (const driver of candidates) {
    await notifyRideDriver(app, driver, nextRide);
  }
  try {
    (app as any).locals.io?.to("drivers").emit("taxiRideRequest", {
      rideId: String(nextRide?._id || nextRide?.id || rideId),
      message: RIDE_REQUEST_MESSAGE,
      pickupArea: nextRide?.pickupAddress,
      fare: nextRide?.fare ?? nextRide?.estimatedFare ?? null,
      distance: nextRide?.distance ?? null,
      availableDriverCount: candidates.length,
    });
  } catch {}
  await notifyRideUser(app, nextRide, "Finding your driver", "Nearby drivers have received your ride request.", { status: "requested" });
  return nextRide;
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

  const etaPredictSchema = z.object({
    pickupLat: z.coerce.number().finite(),
    pickupLng: z.coerce.number().finite(),
    dropLat: z.coerce.number().finite(),
    dropLng: z.coerce.number().finite(),
    vehicleTypeId: z.string().min(1),
    driverId: z.string().min(1).optional().nullable(),
    routeDistanceKm: z.coerce.number().positive().optional().nullable(),
    routeDurationMin: z.coerce.number().positive().optional().nullable(),
  });

  app.post("/api/taxi/eta/predict", async (req, res) => {
    try {
      const parsed = etaPredictSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid ETA request" });
      }

      const prediction = await predictTaxiEta(parsed.data);
      res.json(prediction);
    } catch (err) {
      console.error("Error predicting taxi ETA:", err);
      res.status(500).json({ message: "Failed to predict taxi ETA" });
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
      const perKm = parseFloat((vehicleType as any).perKmRate ?? (vehicleType as any).pricePerKm ?? "0");
      const perMin = parseFloat((vehicleType as any).perMinRate ?? (vehicleType as any).pricePerMinute ?? "0");
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

      const etaPrediction = await predictTaxiEta({
        pickupLat: parsed.data.pickupLat,
        pickupLng: parsed.data.pickupLng,
        dropLat: parsed.data.dropLat,
        dropLng: parsed.data.dropLng,
        vehicleTypeId: parsed.data.vehicleTypeId,
        driverId: parsed.data.driverId ?? null,
        routeDistanceKm: parsed.data.distance ?? null,
        routeDurationMin: parsed.data.duration ?? null,
      });

      const ride = await taxiStorage.createTaxiRide({
        userId: req.user!.id,
        vehicleTypeId: parsed.data.vehicleTypeId,
        vehicleType: vehicleType.name,
        pickupLat: parsed.data.pickupLat,
        pickupLng: parsed.data.pickupLng,
        dropLat: parsed.data.dropLat,
        dropLng: parsed.data.dropLng,
        pickupAddress: parsed.data.pickupAddress,
        dropAddress: parsed.data.dropAddress,
        fare: Number(parsed.data.fare.toFixed(2)),
        estimatedFare: parsed.data.fare.toFixed(2),
        status: "searching",
        paymentMethod: parsed.data.paymentMethod,
        paymentStatus: "pending",
        distance: parsed.data.distance?.toString(),
        duration: parsed.data.duration,
        predictedPickupEtaMin: etaPrediction.pickupEtaMin,
        predictedTripEtaMin: etaPrediction.tripEtaMin,
        predictedTotalEtaMin: etaPrediction.totalEtaMin,
        etaConfidence: etaPrediction.confidence,
        etaFactors: etaPrediction.factors,
        etaGeneratedAt: new Date(etaPrediction.generatedAt),
        notes: parsed.data.notes,
      } as any);

      await taxiStorage.createRideOtp(ride.id ?? ride._id, req.user!.id);
      const dispatchedRide = await dispatchRideRequest(app, ride.id ?? ride._id);
      res.status(201).json(sanitizeTaxiRide(dispatchedRide ?? ride, { includeCustomerOtp: true }));
    } catch (err) {
      console.error("Error booking ride:", err);
      res.status(500).json({ message: "Failed to book ride" });
    }
  });

  app.get("/api/taxi/rides", requireAuth, async (req, res) => {
    try {
      const rides = await taxiStorage.getTaxiRides(req.user!.id);
      res.json(rides.map((ride) => sanitizeTaxiRide(ride, { includeCustomerOtp: true })));
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
      if (ride.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(sanitizeTaxiRide(ride, { includeCustomerOtp: ride.userId === req.user!.id }));
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

  const safetyReportSchema = z.object({
    category: z.string().trim().min(2).max(80).default("Safety concern"),
    message: z.string().trim().min(5).max(1000),
  });

  const shareTripSchema = z.object({
    contactName: z.string().trim().max(80).optional(),
    contactPhone: z.string().trim().max(20).optional(),
  });

  async function getAuthorizedRide(req: any, rideId: string) {
    const ride = await taxiStorage.getTaxiRide(rideId);
    if (!ride) return { ride: null, error: { status: 404, message: "Ride not found" } };
    const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
    const isRider = String(ride.userId) === String(req.user!.id);
    const isAssignedDriver = driver && String(ride.driverId) === String(driver.id);
    if (!isRider && !isAssignedDriver && !req.user!.isAdmin) {
      return { ride: null, error: { status: 403, message: "Not authorized for this ride" } };
    }
    return { ride, driver, error: null };
  }

  app.post("/api/taxi/rides/:id/sos", requireAuth, async (req, res) => {
    try {
      const { ride, error } = await getAuthorizedRide(req, req.params.id);
      if (error) return res.status(error.status).json({ message: error.message });

      const db = getDb();
      const event = {
        rideId: String(ride.id),
        userId: String(req.user!.id),
        type: "sos",
        status: "active",
        message: "Rider triggered SOS from taxi tracking",
        rideSnapshot: {
          pickupAddress: ride.pickupAddress,
          dropAddress: ride.dropAddress,
          driverId: ride.driverId || null,
          driverName: ride.driverName || null,
          driverPhone: ride.driverPhone || null,
          status: ride.status,
        },
        createdAt: new Date(),
      };
      const inserted = await db.collection("taxi_safety_events").insertOne(event);
      const savedEvent = { ...event, _id: inserted.insertedId };
      await notifyTaxiAdmins(app, savedEvent, "Taxi SOS alert", `SOS raised for ride ${ride.orderNumber || ride.id}`);
      res.status(201).json({ success: true, message: "SOS alert sent. Our support team has been notified." });
    } catch (err) {
      console.error("Error creating SOS event:", err);
      res.status(500).json({ message: "Failed to send SOS alert" });
    }
  });

  app.post("/api/taxi/rides/:id/share", requireAuth, async (req, res) => {
    try {
      const { ride, error } = await getAuthorizedRide(req, req.params.id);
      if (error) return res.status(error.status).json({ message: error.message });
      const parsed = shareTripSchema.safeParse(req.body || {});
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid share request" });
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      const shareUrl = `${origin}/taxi/booking/${ride.id}`;
      const details = {
        shareUrl,
        text: `I'm taking a City Hub taxi from ${ride.pickupAddress} to ${ride.dropAddress}. Track it here: ${shareUrl}`,
        driverName: ride.driverName || null,
        vehicleNumber: ride.vehicleNumber || null,
        status: ride.status,
      };

      await getDb().collection("taxi_safety_events").insertOne({
        rideId: String(ride.id),
        userId: String(req.user!.id),
        type: "share",
        status: "sent",
        contactName: parsed.data.contactName || null,
        contactPhone: parsed.data.contactPhone || null,
        details,
        createdAt: new Date(),
      });

      res.json({ success: true, message: "Trip details ready to share", ...details });
    } catch (err) {
      console.error("Error sharing trip:", err);
      res.status(500).json({ message: "Failed to share trip" });
    }
  });

  app.post("/api/taxi/rides/:id/safety-report", requireAuth, async (req, res) => {
    try {
      const { ride, error } = await getAuthorizedRide(req, req.params.id);
      if (error) return res.status(error.status).json({ message: error.message });
      const parsed = safetyReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Add a short safety message" });
      }

      const event = {
        rideId: String(ride.id),
        userId: String(req.user!.id),
        type: "report",
        status: "open",
        category: parsed.data.category,
        message: parsed.data.message,
        rideSnapshot: {
          pickupAddress: ride.pickupAddress,
          dropAddress: ride.dropAddress,
          driverId: ride.driverId || null,
          driverName: ride.driverName || null,
          driverPhone: ride.driverPhone || null,
          riderPhone: (req.user as any)?.phone || null,
          status: ride.status,
        },
        createdAt: new Date(),
      };
      const inserted = await getDb().collection("taxi_safety_events").insertOne(event);
      const savedEvent = { ...event, _id: inserted.insertedId };
      await notifyTaxiAdmins(app, savedEvent, "Taxi safety report", `${parsed.data.category}: ride ${ride.orderNumber || ride.id}`);
      res.status(201).json({ success: true, message: "Safety report sent. Our team will review it." });
    } catch (err) {
      console.error("Error creating safety report:", err);
      res.status(500).json({ message: "Failed to send safety report" });
    }
  });

  app.post("/api/taxi/rides/:id/verify-pin", requireAuth, async (req, res) => {
    try {
      const parsed = z.object({
        otp: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid PIN" });
      }

      const { ride, driver, error } = await getAuthorizedRide(req, req.params.id);
      if (error) return res.status(error.status).json({ message: error.message });
      if (!driver || String(ride.driverId) !== String(driver.id)) {
        return res.status(403).json({ message: "Driver access required to verify ride PIN" });
      }

      const result = await taxiStorage.verifyRideOtp(req.params.id, parsed.data.otp);
      if (!result.success) {
        return res.status(400).json({ message: result.message || "Invalid OTP. Please try again." });
      }
      const updated = await taxiStorage.getTaxiRide(req.params.id);
      res.json({ success: true, message: "Ride PIN verified", ride: sanitizeTaxiRide(updated) });
    } catch (err) {
      console.error("Error verifying ride PIN:", err);
      res.status(500).json({ message: "Failed to verify ride PIN" });
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

      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(403).json({ message: "Driver access required" });
      }
      const ride = await taxiStorage.getTaxiRide(parsed.data.rideId);
      if (!ride) return res.status(404).json({ message: "Ride not found" });
      if (ride.driverId !== driver.id) {
        return res.status(403).json({ message: "Not assigned to this ride" });
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

  app.patch("/api/taxi/driver/rides/:rideId/start", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const parsed = z.object({
        otp: z.string().regex(/^\d{4}$/, "OTP must be 4 digits"),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid OTP" });
      }

      const ride = await taxiStorage.getTaxiRide(req.params.rideId);
      if (!ride) return res.status(404).json({ message: "Ride not found" });
      if (ride.driverId !== driver.id) {
        return res.status(403).json({ message: "Not assigned to this ride" });
      }

      const result = await taxiStorage.verifyRideOtp(req.params.rideId, parsed.data.otp);
      if (!result.success) {
        return res.status(400).json({ message: result.message || "OTP verification failed" });
      }

      const updated = await taxiStorage.getTaxiRide(req.params.rideId);
      res.json(sanitizeTaxiRide(updated));
    } catch (err) {
      console.error("Error starting ride:", err);
      res.status(500).json({ message: "Failed to start ride" });
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

      if (process.env.NODE_ENV !== "production") {
        console.log(`[TAXI] Resent ride start OTP for testing: ${result.otp}`);
      }
      res.json({ success: true, rideStartOtp: result.otp });
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

  const updateTaxiDriverProfileSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
    profilePhoto: z.string().optional().nullable(),
    licenseNumber: z.string().trim().max(40).optional().nullable(),
    licenseFrontPhoto: z.string().optional().nullable(),
    licenseBackPhoto: z.string().optional().nullable(),
    rcBookNumber: z.string().trim().max(60).optional().nullable(),
    rcBookFrontPhoto: z.string().optional().nullable(),
    rcBookBackPhoto: z.string().optional().nullable(),
    vehicleType: z.enum(["mini", "suv", "auto", "sedan"]).optional().nullable(),
    vehicleNumber: z.string().trim().max(30).optional().nullable(),
  });

  app.patch("/api/taxi/driver/profile", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const parsed = updateTaxiDriverProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid driver profile" });
      }

      const updated = await taxiStorage.updateTaxiDriver(driver.id, {
        ...parsed.data,
        updatedAt: new Date(),
      } as any);
      if (!updated) {
        return res.status(500).json({ message: "Failed to update driver profile" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating driver profile:", err);
      res.status(500).json({ message: "Failed to update driver profile" });
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
      if (!updated) {
        return res.status(500).json({ message: "Failed to update driver online status" });
      }
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
      if (!updated) {
        return res.status(500).json({ message: "Failed to save driver location" });
      }
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
      if (!driver.isActive && !driver.isOnline) {
        return res.json([]);
      }
      const rides = await taxiStorage.getDriverTaxiRides(driver.id);
      res.json(rides.map((ride) => sanitizeTaxiRide(ride)));
    } catch (err) {
      console.error("Error fetching driver rides:", err);
      res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  app.patch("/api/taxi/driver/rides/:id/accept", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const db = getDb();
      const updated = await db.collection("taxi_rides").findOneAndUpdate(
        {
          ...rideFilter(req.params.id),
          status: "requested",
          rejectedDriverIds: { $ne: driver.id },
          $or: [
            { driverId: String(driver.id) },
            { driverId: null },
            { driverId: { $exists: false } },
          ],
        },
        {
          $set: {
            driverId: String(driver.id),
            driverName: driver.name,
            driverPhone: driver.phone,
            vehicleNumber: driver.vehicleNumber,
            vehicleType: driver.vehicleType,
            status: "accepted",
            acceptedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );
      const claimedRide = (updated as any)?.value ?? updated;
      if (!claimedRide) {
        const existingRide = await db.collection("taxi_rides").findOne(rideFilter(req.params.id));
        if (!existingRide) return res.status(404).json({ message: "Ride not found" });
        return res.status(409).json({ message: "Ride request is no longer available" });
      }

      if (!claimedRide.rideStartOtpHash || !claimedRide.rideStartOtpExpiresAt || claimedRide.rideStartOtpExpiresAt < new Date()) {
        await taxiStorage.createRideOtp(req.params.id, claimedRide.userId);
      }
      const nextRide = await taxiStorage.getTaxiRide(req.params.id) ?? claimedRide;
      await notifyRideUser(app, nextRide, "Ride accepted", `${driver.name || "Your driver"} accepted your ride. Your pickup OTP is ready.`, { status: "accepted" });
      try {
        (app as any).locals.io?.to("drivers").emit("taxiRideUpdate", {
          rideId: String(nextRide._id || nextRide.id),
          status: "accepted",
          driverId: String(driver.id),
        });
      } catch {}
      res.json(sanitizeTaxiRide(nextRide));
    } catch (err) {
      console.error("Error accepting ride:", err);
      res.status(500).json({ message: "Failed to accept ride" });
    }
  });

  app.patch("/api/taxi/driver/rides/:id/reject", requireAuth, async (req, res) => {
    try {
      const driver = await taxiStorage.getTaxiDriverByUserId(req.user!.id);
      if (!driver) {
        return res.status(404).json({ message: "Driver profile not found" });
      }

      const db = getDb();
      const ride = await db.collection("taxi_rides").findOne(rideFilter(req.params.id));
      if (!ride) return res.status(404).json({ message: "Ride not found" });
      const assignedToAnotherDriver = ride.driverId && String(ride.driverId) !== String(driver.id);
      if (assignedToAnotherDriver) {
        return res.status(403).json({ message: "This ride request is assigned to another driver" });
      }
      if (ride.status !== "requested") {
        return res.status(400).json({ message: "Ride request is no longer available" });
      }

      await db.collection("taxi_rides").updateOne(
        rideFilter(req.params.id),
        {
          $addToSet: {
            rejectedDriverIds: String(driver.id) as any,
          },
          $push: {
            rejectedDrivers: {
              driverId: String(driver.id),
              driverName: driver.name || null,
              rejectedAt: new Date(),
            } as any,
          },
          $set: {
            driverId: null,
            driverName: null,
            driverPhone: null,
            vehicleNumber: null,
            updatedAt: new Date(),
          },
        },
      );

      const dispatchedRide = await dispatchRideRequest(app, req.params.id);
      try {
        (app as any).locals.io?.to("drivers").emit("taxiRideUpdate", {
          rideId: req.params.id,
          status: dispatchedRide?.status || "requested",
        });
      } catch {}
      res.json({
        success: true,
        message: "Ride rejected",
        ride: sanitizeTaxiRide(dispatchedRide),
      });
    } catch (err) {
      console.error("Error rejecting ride:", err);
      res.status(500).json({ message: "Failed to reject ride" });
    }
  });

  const updateRideStatusSchema = z.object({
    status: z.enum(["requested", "accepted", "driver_assigned", "arriving", "in_ride", "started", "completed", "cancelled"]),
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
      if (parsed.data.status === "in_ride" || parsed.data.status === "started") {
        return res.status(400).json({ message: "Enter the customer OTP to start the ride" });
      }

      const ride = await taxiStorage.getTaxiRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      if (ride.driverId !== driver.id) {
        return res.status(403).json({ message: "Not assigned to this ride" });
      }

      if (ride.status === "requested" && parsed.data.status !== "accepted") {
        return res.status(400).json({ message: "Accept the ride before changing ride status" });
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
      res.json(sanitizeTaxiRide(updated));
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
      const busy = new Set((rides || []).filter(r => r && ACTIVE_DRIVER_STATUSES.includes(String(r.status))).map(r => r.driverId).filter(Boolean));
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
      res.json(rides.map((ride) => sanitizeTaxiRide(ride)));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch rides" });
    }
  });

  app.get("/api/admin/taxi/safety", requireAdmin, async (_req, res) => {
    try {
      const db = getDb();
      const [events, rides] = await Promise.all([
        db.collection("taxi_safety_events").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
        taxiStorage.getAllTaxiRides(),
      ]);
      const now = Date.now();
      const activeStatuses = new Set(["requested", "accepted", "driver_assigned", "arriving", "started", "in_ride"]);
      const highDelayRides = rides
        .filter((ride: any) => activeStatuses.has(String(ride.status)))
        .filter((ride: any) => {
          const createdAt = ride.createdAt ? new Date(ride.createdAt).getTime() : now;
          const predicted = Number(ride.predictedTotalEtaMin || ride.duration || 0);
          return predicted > 0 && ((now - createdAt) / 60000) > predicted + 10;
        })
        .slice(0, 20)
        .map((ride: any) => sanitizeTaxiRide(ride));

      const normalizedEvents = events.map((event: any) => ({
        id: String(event._id),
        rideId: event.rideId,
        userId: event.userId,
        type: event.type,
        status: event.status,
        category: event.category || null,
        message: event.message || null,
        createdAt: event.createdAt,
        rideSnapshot: event.rideSnapshot || null,
      }));

      res.json({
        activeSos: normalizedEvents.filter((event: any) => event.type === "sos" && event.status === "active"),
        reportedRides: normalizedEvents.filter((event: any) => event.type === "report"),
        highDelayRides,
        recentEvents: normalizedEvents,
      });
    } catch (err) {
      console.error("Error fetching taxi safety dashboard:", err);
      res.status(500).json({ message: "Failed to fetch taxi safety dashboard" });
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
      res.json(sanitizeTaxiRide(updated));
    } catch (err) {
      res.status(500).json({ message: "Failed to assign driver" });
    }
  });

  app.patch("/api/admin/taxi/rides/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await taxiStorage.updateTaxiRideStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: "Ride not found" });
      res.json(sanitizeTaxiRide(updated));
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
