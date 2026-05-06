import { type InsertTaxiVehicleType, type InsertTaxiDriver, type InsertTaxiRide } from "@shared/schema";
import { getDb, toDoc, toDocs, newId, toObjectId } from "./db";
import { randomBytes, randomInt, createCipheriv, createDecipheriv } from "crypto";
import { hashOtp, compareOtp } from "./phone-otp";

export interface ITaxiStorage {
  getTaxiVehicleTypes(): Promise<any[]>;
  getTaxiVehicleType(id: string): Promise<any | undefined>;
  createTaxiVehicleType(vt: InsertTaxiVehicleType): Promise<any>;
  updateTaxiVehicleType(id: string, vt: Partial<InsertTaxiVehicleType>): Promise<any | undefined>;
  deleteTaxiVehicleType(id: string): Promise<void>;

  getTaxiDrivers(): Promise<any[]>;
  getTaxiDriver(id: string): Promise<any | undefined>;
  getTaxiDriverByUserId(userId: string): Promise<any | undefined>;
  createTaxiDriver(driver: InsertTaxiDriver): Promise<any>;
  updateTaxiDriver(id: string, driver: Partial<InsertTaxiDriver>): Promise<any | undefined>;
  deleteTaxiDriver(id: string): Promise<void>;
  toggleTaxiDriverOnline(userId: string, isOnline: boolean): Promise<any | undefined>;
  updateTaxiDriverLocation(userId: string, lat: number, lng: number): Promise<any | undefined>;
  getNearbyTaxiVehicles(
    center: { lat: number; lng: number },
    options?: { count?: number; type?: "car" | "bike" | "auto" },
  ): Promise<any[]>;

  getTaxiRides(userId: string): Promise<any[]>;
  getAllTaxiRides(): Promise<any[]>;
  getTaxiRide(id: string): Promise<any | undefined>;
  getDriverTaxiRides(driverId: string): Promise<any[]>;
  getScheduledTaxiRides(filters?: { userId?: string; driverId?: string; status?: string; includePast?: boolean }): Promise<any[]>;
  addScheduledRideEvent(rideId: string, type: string, actorId: string | null, actorRole: string, metadata?: any): Promise<void>;
  createTaxiRide(ride: InsertTaxiRide): Promise<any>;
  updateTaxiRideStatus(id: string, status: string): Promise<any | undefined>;
  updateTaxiRide(id: string, data: Partial<InsertTaxiRide>): Promise<any | undefined>;
  assignTaxiDriver(rideId: string, driverId: string): Promise<any | undefined>;
  assignTaxiDriverSnapshot(
    rideId: string,
    driver: { id: string; driverName: string; vehicleNumber: string; vehicleType: string },
  ): Promise<any | undefined>;
  rateTaxiRide(id: string, rating: number): Promise<any | undefined>;

  getTaxiDriverEarnings(driverId: string): Promise<string>;
  getTaxiDriverStats(driverId: string): Promise<{ totalRides: number; todayRides: number; earnings: string; rating: string }>;

  // OTP Management
  createRideOtp(rideId: string, userId: string): Promise<{ otp: string } | undefined>;
  getRideOtp(rideId: string): Promise<any | undefined>;
  linkOtpToDriver(rideId: string, driverId: string): Promise<any | undefined>;
  verifyRideOtp(rideId: string, otp: string): Promise<{ success: boolean; message?: string }>;
  resendRideOtp(rideId: string): Promise<{ otp: string } | undefined>;
}

type FleetVehicleType = "car" | "bike" | "auto";

type NearbyTaxiVehicle = {
  id: string;
  type: FleetVehicleType;
  lat: number;
  lng: number;
  heading: number;
  driverName: string;
  etaMin: number;
  vehicleType: string;
  vehicleNumber: string;
  distanceKm: number;
  rating: number;
  completedRides?: number;
  safetyVerified?: boolean;
  photo?: string | null;
};

type DemoFleetTemplate = {
  id: string;
  driverName: string;
  vehicleType: string;
  vehicleNumber: string;
  rating: number;
  type: FleetVehicleType;
  latOffset: number;
  lngOffset: number;
};

const DEMO_TAXI_FLEET: DemoFleetTemplate[] = [
  {
    id: "demo_driver_sedan_1",
    driverName: "Arjun Demo",
    vehicleType: "Sedan",
    vehicleNumber: "TN09 AB 1425",
    rating: 4.8,
    type: "car",
    latOffset: 0.0084,
    lngOffset: -0.0061,
  },
  {
    id: "demo_driver_bike_1",
    driverName: "Kiran Demo",
    vehicleType: "Bike Taxi",
    vehicleNumber: "TN10 BK 7712",
    rating: 4.7,
    type: "bike",
    latOffset: -0.0063,
    lngOffset: 0.0046,
  },
  {
    id: "demo_driver_auto_1",
    driverName: "Muthu Demo",
    vehicleType: "Auto",
    vehicleNumber: "TN07 AU 5634",
    rating: 4.6,
    type: "auto",
    latOffset: 0.0049,
    lngOffset: 0.0078,
  },
  {
    id: "demo_driver_suv_1",
    driverName: "Priya Demo",
    vehicleType: "SUV",
    vehicleNumber: "TN14 CX 9881",
    rating: 4.9,
    type: "car",
    latOffset: -0.0091,
    lngOffset: -0.0042,
  },
];

function getRideOtpKey() {
  const secret = process.env.RIDE_OTP_SECRET || process.env.SESSION_SECRET || "dev-ride-otp-secret-change-me";
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32));
}

function encryptRideOtp(otp: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getRideOtpKey(), iv);
  const encrypted = Buffer.concat([cipher.update(otp, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

function decryptRideOtp(encrypted?: string | null, iv?: string | null, tag?: string | null) {
  if (!encrypted || !iv || !tag) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", getRideOtpKey(), Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function sanitizeTaxiRide(ride: any, options: { includeCustomerOtp?: boolean } = {}) {
  if (!ride) return ride;
  const {
    _id,
    rideStartOtpHash,
    rideStartOtpEncrypted,
    rideStartOtpIv,
    rideStartOtpTag,
    otp,
    ...safeRide
  } = ride;

  if (!safeRide.id && _id) {
    safeRide.id = _id.toString();
  }

  if (
    options.includeCustomerOtp
    && safeRide.rideStartOtpExpiresAt
    && new Date(safeRide.rideStartOtpExpiresAt) > new Date()
    && !safeRide.rideStartOtpVerifiedAt
    && ["accepted", "driver_assigned", "arriving"].includes(String(safeRide.status || ""))
  ) {
    const plainOtp = decryptRideOtp(rideStartOtpEncrypted, rideStartOtpIv, rideStartOtpTag);
    if (plainOtp) safeRide.rideStartOtp = plainOtp;
  }

  return safeRide;
}

function normalizeFleetVehicleType(label?: string | null): FleetVehicleType {
  const normalized = label?.toLowerCase() ?? "";
  if (normalized.includes("bike") || normalized.includes("moto")) {
    return "bike";
  }
  if (normalized.includes("auto") || normalized.includes("rick")) {
    return "auto";
  }
  return "car";
}

function getDistanceKm(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const latDelta = ((end.lat - start.lat) * Math.PI) / 180;
  const lngDelta = ((end.lng - start.lng) * Math.PI) / 180;
  const startLat = (start.lat * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;

  const haversine = Math.sin(latDelta / 2) ** 2
    + (Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function getBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radians = Math.atan2(to.lng - from.lng, to.lat - from.lat);
  return (radians * 180 / Math.PI + 360) % 360;
}

function getAnimatedSnapshot(baseLat: number, baseLng: number, seed: number) {
  const phase = (Date.now() / 4200) + (seed * 0.73);
  const nextPhase = phase + 0.18;
  const current = {
    lat: baseLat + (Math.sin(phase) * 0.00032),
    lng: baseLng + (Math.cos(phase * 1.08) * 0.00042),
  };
  const next = {
    lat: baseLat + (Math.sin(nextPhase) * 0.00032),
    lng: baseLng + (Math.cos(nextPhase * 1.08) * 0.00042),
  };

  return {
    ...current,
    heading: getBearing(current, next),
  };
}

function buildDemoTaxiVehicles(
  center: { lat: number; lng: number },
  count: number,
  requestedType?: FleetVehicleType,
): NearbyTaxiVehicle[] {
  return DEMO_TAXI_FLEET
    .filter((driver) => !requestedType || driver.type === requestedType)
    .map((driver, index) => {
      const animated = getAnimatedSnapshot(
        center.lat + driver.latOffset,
        center.lng + driver.lngOffset,
        index + 1,
      );
      const distanceKm = getDistanceKm(center, animated);

      return {
        id: driver.id,
        type: driver.type,
        lat: animated.lat,
        lng: animated.lng,
        heading: animated.heading,
        driverName: driver.driverName,
        etaMin: Math.max(2, Math.round((distanceKm * 4.2) + 1 + (index % 2))),
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        distanceKm: Number(distanceKm.toFixed(2)),
        rating: driver.rating,
      } satisfies NearbyTaxiVehicle;
    })
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, count);
}


export class TaxiStorage implements ITaxiStorage {
  private generateOrderNumber(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "TX";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getTaxiVehicleTypes(): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('taxi_vehicle_types').find().toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching taxi vehicle types:", error);
      return [];
    }
  }

  async getTaxiVehicleType(id: string): Promise<any | undefined> {
    try {
      const db = getDb();
      // support both string _id and ObjectId _id stored in the collection
      console.debug('[taxi-storage] getTaxiVehicleType lookup id=', id);
      let doc = await db.collection('taxi_vehicle_types').findOne({ _id: id as any });
      console.debug('[taxi-storage] find by string _id result=', !!doc);
      if (!doc) {
        try {
          doc = await db.collection('taxi_vehicle_types').findOne({ _id: toObjectId(id) });
          console.debug('[taxi-storage] find by ObjectId result=', !!doc);
        } catch (e) {
          console.debug('[taxi-storage] ObjectId conversion failed for', id);
          // ignore invalid ObjectId conversion
        }
      }
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching taxi vehicle type:", error);
      return undefined;
    }
  }

  async createTaxiVehicleType(vt: InsertTaxiVehicleType): Promise<any> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_vehicle_types').insertOne({ ...vt, createdAt: new Date() });
      const inserted = await db.collection('taxi_vehicle_types').findOne({ _id: res.insertedId });
      return toDoc<any>(inserted);
    } catch (error) {
      console.error("Error creating taxi vehicle type:", error);
      throw error;
    }
  }

  async updateTaxiVehicleType(id: string, vt: Partial<InsertTaxiVehicleType>): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_vehicle_types').findOneAndUpdate({ _id: toObjectId(id) }, { $set: vt }, { returnDocument: 'after' });
      return toDoc<any>(res.value);
    } catch (error) {
      console.error("Error updating taxi vehicle type:", error);
      return undefined;
    }
  }

  async deleteTaxiVehicleType(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection('taxi_vehicle_types').deleteOne({ _id: toObjectId(id) });
    } catch (error) {
      console.error("Error deleting taxi vehicle type:", error);
      throw error;
    }
  }

  async getTaxiDrivers(): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('taxi_drivers').find().toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching taxi drivers:", error);
      return [];
    }
  }

  async getTaxiDriver(id: string): Promise<any | undefined> {
    try {
      const db = getDb();
      let doc = await db.collection('taxi_drivers').findOne({ _id: id as any });
      if (!doc) {
        try {
          doc = await db.collection('taxi_drivers').findOne({ _id: toObjectId(id) });
        } catch (e) {
          // ignore invalid ObjectId conversion
        }
      }
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching taxi driver:", error);
      return undefined;
    }
  }

  async getTaxiDriverByUserId(userId: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const doc = await db.collection('taxi_drivers').findOne({ userId });
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching taxi driver by user:", error);
      return undefined;
    }
  }

  async createTaxiDriver(driver: InsertTaxiDriver): Promise<any> {
    try {
      const db = getDb();
      const id = newId();
      const doc = { _id: id as any, isActive: false, isOnline: false, isApproved: true, ...driver, createdAt: new Date() };
      await db.collection('taxi_drivers').insertOne(doc);
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error creating taxi driver:", error);
      throw error;
    }
  }

  async updateTaxiDriver(id: string, driver: Partial<InsertTaxiDriver>): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_drivers').findOneAndUpdate({ _id: id as any }, { $set: driver }, { returnDocument: 'after' });
      return toDoc<any>(res.value);
    } catch (error) {
      console.error("Error updating taxi driver:", error);
      return undefined;
    }
  }

  async deleteTaxiDriver(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection('taxi_drivers').deleteOne({ _id: id as any });
    } catch (error) {
      console.error("Error deleting taxi driver:", error);
      throw error;
    }
  }

  async toggleTaxiDriverOnline(userId: string, isOnline: boolean): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_drivers').findOneAndUpdate(
        { userId },
        { $set: { isActive: isOnline, isOnline, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      return toDoc<any>((res as any)?.value ?? res);
    } catch (error) {
      console.error("Error toggling taxi driver online:", error);
      return undefined;
    }
  }

  async updateTaxiDriverLocation(userId: string, lat: number, lng: number): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_drivers').findOneAndUpdate(
        { userId },
        { $set: { currentLat: lat, currentLng: lng, isActive: true, isOnline: true, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      return toDoc<any>((res as any)?.value ?? res);
    } catch (error) {
      console.error("Error updating taxi driver location:", error);
      return undefined;
    }
  }

  async getNearbyTaxiVehicles(
    center: { lat: number; lng: number },
    options?: { count?: number; type?: FleetVehicleType },
  ): Promise<NearbyTaxiVehicle[]> {
    const count = Math.min(Math.max(options?.count ?? 8, 1), 20);

    try {
      const db = getDb();
      const busyRides = await db.collection('taxi_rides').find({
        status: { $in: ['requested', 'accepted', 'driver_assigned', 'arriving', 'in_ride', 'started'] },
        driverId: { $ne: null },
      }).project({ driverId: 1 }).toArray();
      const busyDrivers = new Set(busyRides.map((ride: any) => String(ride.driverId)).filter(Boolean));

      const activeDrivers = await db.collection('taxi_drivers').find({
        isActive: true,
        isApproved: true,
        currentLat: { $type: "number" },
        currentLng: { $type: "number" },
      }).toArray();

      const liveVehicles = activeDrivers
        .filter((driver) => !busyDrivers.has(String(driver._id)))
        .map((driver, index): NearbyTaxiVehicle | null => {
        const baseLat = Number(driver.currentLat);
        const baseLng = Number(driver.currentLng);
        if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) {
          return null;
        }

        const animated = getAnimatedSnapshot(baseLat, baseLng, index + 1);
        const type = normalizeFleetVehicleType(driver.vehicleType);
        const distanceKm = getDistanceKm(center, animated);

        return {
          id: String(driver._id),
          type,
          lat: animated.lat,
          lng: animated.lng,
          heading: animated.heading,
          driverName: driver.name,
          etaMin: Math.max(2, Math.round((distanceKm * 4.5) + (index % 3))),
          vehicleType: driver.vehicleType,
          vehicleNumber: driver.vehicleNumber,
          distanceKm: Number(distanceKm.toFixed(2)),
          rating: Number(Number(driver.rating || 4.6).toFixed(1)),
          completedRides: Number(driver.completedRides || driver.totalRides || 0),
          safetyVerified: driver.safetyVerified !== false,
          photo: driver.profilePhoto || null,
        } satisfies NearbyTaxiVehicle;
      })
        .filter((vehicle): vehicle is NearbyTaxiVehicle => Boolean(vehicle))
        .filter((vehicle) => !options?.type || vehicle.type === options.type)
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, count);

      if (liveVehicles.length > 0) {
        return liveVehicles;
      }

      // Keep the local testing flow usable when no approved live drivers are publishing GPS.
      if (process.env.NODE_ENV !== "production") {
        return buildDemoTaxiVehicles(center, count, options?.type);
      }

      return [];
    } catch (error) {
      console.error("Error fetching nearby taxi vehicles:", error);
      return [];
    }
  }

  async getTaxiRides(userId: string): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('taxi_rides').find({ userId }).sort({ createdAt: -1 }).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching user taxi rides:", error);
      return [];
    }
  }

  async getAllTaxiRides(): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('taxi_rides').find().sort({ createdAt: -1 }).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching all taxi rides:", error);
      return [];
    }
  }

  async getTaxiRide(id: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const doc = await db.collection('taxi_rides').findOne({ _id: toObjectId(id) });
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching taxi ride:", error);
      return undefined;
    }
  }

  async getDriverTaxiRides(driverId: string): Promise<any[]> {
    try {
      const db = getDb();
      const driverIdString = String(driverId);
      const docs = await db.collection('taxi_rides').find({
        $and: [
          {
            $or: [
              { driverId: driverIdString },
              {
                status: 'requested',
                $or: [
                  { driverId: null },
                  { driverId: { $exists: false } },
                ],
              },
            ],
          },
          { rejectedDriverIds: { $ne: driverIdString } },
        ],
      }).sort({ createdAt: -1 }).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching driver taxi rides:", error);
      return [];
    }
  }

  async getScheduledTaxiRides(filters?: { userId?: string; driverId?: string; status?: string; includePast?: boolean }): Promise<any[]> {
    const query: any = { bookingType: "scheduled" };
    if (filters?.userId) query.userId = filters.userId;
    if (filters?.driverId) query.driverId = filters.driverId;
    if (filters?.status) query.status = filters.status;
    if (!filters?.includePast) {
      query.status = query.status || { $in: ["scheduled", "driver_assigned", "arriving", "accepted"] };
    }
    const docs = await getDb().collection("taxi_rides").find(query).sort({ scheduledPickupAt: 1 }).toArray();
    return docs.map((doc) => sanitizeTaxiRide(doc, { includeCustomerOtp: false }));
  }

  async addScheduledRideEvent(rideId: string, type: string, actorId: string | null, actorRole: string, metadata: any = {}): Promise<void> {
    await getDb().collection("taxi_scheduled_ride_events").insertOne({
      _id: newId() as any,
      rideId,
      type,
      actorId,
      actorRole,
      metadata,
      createdAt: new Date(),
    });
  }

  async createTaxiRide(ride: InsertTaxiRide): Promise<any> {
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const orderNumber = this.generateOrderNumber();
          const db = getDb();
          const res = await db.collection('taxi_rides').insertOne({ orderNumber, ...ride, createdAt: new Date() });
          const inserted = await db.collection('taxi_rides').findOne({ _id: res.insertedId });
          return toDoc<any>(inserted);
        } catch (err: any) {
          if (err.code === 11000 && attempt < 4) continue;
          throw err;
        }
      }
    } catch (error) {
      console.error("Error creating taxi ride:", error);
      throw error;
    }
  }

  async updateTaxiRideStatus(id: string, status: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_rides').findOneAndUpdate({ _id: toObjectId(id) }, { $set: { status } }, { returnDocument: 'after' });
      return toDoc<any>(res.value);
    } catch (error) {
      console.error("Error updating taxi ride status:", error);
      return undefined;
    }
  }

  async updateTaxiRide(id: string, data: Partial<InsertTaxiRide>): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_rides').findOneAndUpdate({ _id: toObjectId(id) }, { $set: data }, { returnDocument: 'after' });
      return toDoc<any>(res.value);
    } catch (error) {
      console.error("Error updating taxi ride:", error);
      return undefined;
    }
  }

  async assignTaxiDriver(rideId: string, driverId: string): Promise<any | undefined> {
    try {
      console.debug('[taxiStorage.assignTaxiDriver] rideId=', rideId, 'driverId=', driverId);
      const driver = await this.getTaxiDriver(driverId);
      console.debug('[taxiStorage.assignTaxiDriver] resolved driver=', !!driver, driver && driver.id);
      if (!driver || driver.isApproved === false || !(driver.isActive === true || driver.isOnline === true)) return undefined;

      const db = getDb();
      // fetch existing ride to record assignment history if present
      let existingRide: any = null;
      try {
        existingRide = await db.collection('taxi_rides').findOne({ _id: toObjectId(rideId) });
      } catch (e) {
        existingRide = await db.collection('taxi_rides').findOne({ _id: rideId as any });
      }
      console.debug('[taxiStorage.assignTaxiDriver] existingRide=', !!existingRide);
      const busyRide = await db.collection('taxi_rides').findOne({
        _id: { $ne: existingRide?._id },
        driverId,
        status: { $in: ['requested', 'accepted', 'driver_assigned', 'arriving', 'in_ride', 'started'] },
      });
      if (busyRide) return undefined;

      const update: any = { $set: { driverId, driverName: driver.name, driverPhone: driver.phone, vehicleNumber: driver.vehicleNumber, status: 'driver_assigned' } };
      if (existingRide && existingRide.driverId) {
        const historyItem = { driverId: existingRide.driverId, driverName: existingRide.driverName || null, vehicleNumber: existingRide.vehicleNumber || null, assignedAt: new Date() };
        update.$push = { assignmentHistory: historyItem };
      }

      const res = await db.collection('taxi_rides').findOneAndUpdate(
        // prefer ObjectId match; fallback to string
        ((): any => { try { return { _id: toObjectId(rideId) }; } catch (e) { return { _id: rideId as any }; } })(),
        update,
        { returnDocument: 'after' },
      );
      console.debug('[taxiStorage.assignTaxiDriver] findOneAndUpdate raw result=', res);
      const updated = res && (res.value ? res.value : res);
      if (updated && !updated.rideStartOtpHash) {
        await this.createRideOtp(rideId, updated.userId);
        const refreshed = await this.getTaxiRide(rideId);
        return refreshed;
      }
      return toDoc<any>(updated);
    } catch (error) {
      console.error("Error assigning taxi driver:", error);
      return undefined;
    }
  }

  async assignTaxiDriverSnapshot(
    rideId: string,
    driver: { id: string; driverName: string; vehicleNumber: string; vehicleType: string },
  ): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_rides').findOneAndUpdate(
        { _id: toObjectId(rideId) },
        { $set: { driverId: driver.id, driverName: driver.driverName, vehicleNumber: driver.vehicleNumber, vehicleType: driver.vehicleType, status: 'driver_assigned' } },
        { returnDocument: 'after' }
      );
      const updated = toDoc<any>((res as any).value ?? res);
      if (updated && !updated.rideStartOtpHash) {
        await this.createRideOtp(rideId, updated.userId);
        return await this.getTaxiRide(rideId);
      }
      return updated;
    } catch (error) {
      console.error("Error assigning taxi driver snapshot:", error);
      return undefined;
    }
  }

  async rateTaxiRide(id: string, rating: number): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('taxi_rides').findOneAndUpdate({ _id: toObjectId(id) }, { $set: { rating } }, { returnDocument: 'after' });
      return toDoc<any>(res.value);
    } catch (error) {
      console.error("Error rating taxi ride:", error);
      return undefined;
    }
  }

  async getTaxiDriverEarnings(driverId: string): Promise<string> {
    try {
      const db = getDb();
      const rides = await db.collection('taxi_rides').find({ driverId, status: 'completed' }).toArray();
      const total = rides.reduce((sum, ride) => sum + (ride.fare || 0), 0);
      return total.toString();
    } catch (error) {
      console.error("Error fetching taxi driver earnings:", error);
      return "0";
    }
  }

  async getTaxiDriverStats(driverId: string): Promise<{ totalRides: number; todayRides: number; earnings: string; rating: string }> {
    try {
      const db = getDb();
      const allRides = await db.collection('taxi_rides').find({ driverId, status: 'completed' }).toArray();
      const totalRides = allRides.length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayRides = allRides.filter(ride => new Date(ride.createdAt) >= today).length;

      const earnings = allRides.reduce((sum, ride) => sum + (ride.fare || 0), 0).toString();

      const driver = await this.getTaxiDriver(driverId);

      return {
        totalRides,
        todayRides,
        earnings,
        rating: (driver?.rating || 4.5).toString(),
      };
    } catch (error) {
      console.error("Error fetching taxi driver stats:", error);
      return { totalRides: 0, todayRides: 0, earnings: "0", rating: "0" };
    }
  }

  // ==================== OTP MANAGEMENT ====================

  async createRideOtp(rideId: string, userId: string): Promise<{ otp: string } | undefined> {
    try {
      const db = getDb();
      const otp = randomInt(1000, 9999).toString();
      const otpHash = await hashOtp(otp);
      const encrypted = encryptRideOtp(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      const update = {
        rideStartOtpHash: otpHash,
        rideStartOtpEncrypted: encrypted.encrypted,
        rideStartOtpIv: encrypted.iv,
        rideStartOtpTag: encrypted.tag,
        rideStartOtpAttempts: 0,
        rideStartOtpVerifiedAt: null,
        rideStartOtpExpiresAt: expiresAt,
        rideStartOtpCreatedAt: new Date(),
      };
      await db.collection('taxi_rides').updateOne(
        ((): any => { try { return { _id: toObjectId(rideId) }; } catch { return { _id: rideId as any }; } })(),
        { $set: update },
      );

      return { otp };
    } catch (error) {
      console.error("Error creating ride OTP:", error);
      return undefined;
    }
  }

  async getRideOtp(rideId: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const doc = await db.collection('taxi_rides').findOne(((): any => { try { return { _id: toObjectId(rideId) }; } catch { return { _id: rideId as any }; } })());
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching ride OTP:", error);
      return undefined;
    }
  }

  async linkOtpToDriver(rideId: string, driverId: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const result = await db.collection('taxi_rides').findOneAndUpdate(
        ((): any => { try { return { _id: toObjectId(rideId) }; } catch { return { _id: rideId as any }; } })(),
        { $set: { rideStartOtpDriverId: driverId } },
        { returnDocument: 'after' }
      );
      return toDoc<any>((result as any).value ?? result);
    } catch (error) {
      console.error("Error linking OTP to driver:", error);
      return undefined;
    }
  }

  async verifyRideOtp(rideId: string, otp: string): Promise<{ success: boolean; message?: string }> {
    try {
      const db = getDb();
      const rideFilter = ((): any => { try { return { _id: toObjectId(rideId) }; } catch { return { _id: rideId as any }; } })();
      const record = await db.collection('taxi_rides').findOne(rideFilter);

      if (!record) {
        return { success: false, message: "Ride not found" };
      }

      if (record.status !== "arriving") {
        return { success: false, message: "Ride can only be started after driver arrives" };
      }

      if (record.rideStartOtpVerifiedAt) {
        return { success: true };
      }

      if (!record.rideStartOtpHash || !record.rideStartOtpExpiresAt || record.rideStartOtpExpiresAt < new Date()) {
        return { success: false, message: "OTP expired. Ask the customer to refresh the booking." };
      }

      if ((record.rideStartOtpAttempts || 0) >= 5) {
        return { success: false, message: "Too many incorrect attempts" };
      }

      if (!(await compareOtp(otp, record.rideStartOtpHash))) {
        await db.collection('taxi_rides').updateOne(
          rideFilter,
          { $inc: { rideStartOtpAttempts: 1 } }
        );
        return { success: false, message: "Invalid OTP" };
      }

      await db.collection('taxi_rides').updateOne(
        rideFilter,
        { $set: { status: "started", rideStartOtpVerifiedAt: new Date() } }
      );

      return { success: true };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return { success: false, message: "Error verifying OTP" };
    }
  }

  async resendRideOtp(rideId: string): Promise<{ otp: string } | undefined> {
    try {
      const db = getDb();
      const newOtp = randomInt(1000, 9999).toString();
      const otpHash = await hashOtp(newOtp);
      const encrypted = encryptRideOtp(newOtp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const result = await db.collection('taxi_rides').findOneAndUpdate(
        ((): any => { try { return { _id: toObjectId(rideId) }; } catch { return { _id: rideId as any }; } })(),
        {
          $set: {
            rideStartOtpHash: otpHash,
            rideStartOtpEncrypted: encrypted.encrypted,
            rideStartOtpIv: encrypted.iv,
            rideStartOtpTag: encrypted.tag,
            rideStartOtpAttempts: 0,
            rideStartOtpVerifiedAt: null,
            rideStartOtpExpiresAt: expiresAt,
            rideStartOtpCreatedAt: new Date(),
          },
          $inc: { rideStartOtpResendCount: 1 }
        },
        { returnDocument: 'after' }
      );

      if ((result as any)?.value || result) {
        return { otp: newOtp };
      }

      return undefined;
    } catch (error) {
      console.error("Error resending OTP:", error);
      return undefined;
    }
  }
}

export const taxiStorage = new TaxiStorage();
