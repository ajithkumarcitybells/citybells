import { Db, ObjectId } from "mongodb";

// Enums
export enum RideStatus {
  PENDING = "pending",
  SEARCHING = "searching_driver",
  ACCEPTED = "driver_accepted",
  ARRIVING = "driver_arriving",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum DriverStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  ON_RIDE = "on_ride",
}

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD = "card",
  UPI = "upi",
  WALLET = "wallet",
}

// Type Definitions
export interface IUser {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "user" | "driver" | "admin";
  avatar?: string;
  addresses: Array<{ label: string; lat: number; lng: number; address: string }>;
  rating: number; // 0-5
  rideCount: number;
  wallet: number; // balance
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriver {
  _id: ObjectId;
  userId: ObjectId;
  licenseNumber: string;
  approvalStatus: ApprovalStatus;
  documents: Array<{ type: string; url: string; uploadedAt: Date }>;
  rating: number; // 0-5
  totalRides: number;
  earnings: number;
  totalEarnings: number;
  status: DriverStatus;
  currentLocation?: { lat: number; lng: number };
  currentRideId?: ObjectId;
  acceptanceRate: number;
  cancellationRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicle {
  _id: ObjectId;
  driverId: ObjectId;
  type: "mini" | "sedan" | "suv" | "premium";
  registrationNumber: string;
  model: string;
  capacity: number;
  color: string;
  rating: number; // 0-5
  createdAt: Date;
  updatedAt: Date;
}

export interface IRide {
  _id: ObjectId;
  userId: ObjectId;
  driverId?: ObjectId;
  vehicleId?: ObjectId;
  pickupLocation: { lat: number; lng: number; address: string };
  dropLocation: { lat: number; lng: number; address: string };
  distanceMeters: number;
  durationSec: number;
  fare: number;
  baseFare: number;
  surgeMultiplier: number;
  status: RideStatus;
  paymentMethod: PaymentMethod;
  pickupTime?: Date;
  startTime?: Date;
  endTime?: Date;
  actualDistance?: number;
  actualDuration?: number;
  actualFare?: number;
  scheduledTime?: Date; // for schedule later
  cancelledBy?: "user" | "driver" | "admin";
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment {
  _id: ObjectId;
  rideId: ObjectId;
  userId: ObjectId;
  amount: number;
  method: PaymentMethod;
  status: "pending" | "completed" | "failed";
  transactionId?: string;
  paymentGatewayResponse?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRating {
  _id: ObjectId;
  rideId: ObjectId;
  userId: ObjectId;
  driverId: ObjectId;
  userRating: number; // 0-5
  driverRating: number; // 0-5
  userComments: string;
  driverComments: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDriverLocation {
  _id: ObjectId;
  driverId: ObjectId;
  latitude: number;
  longitude: number;
  heading?: number; // compass direction
  speed?: number; // km/h
  accuracy?: number; // meters
  rideId?: ObjectId; // track which ride
  timestamp: Date;
}

export interface IEarnings {
  _id: ObjectId;
  driverId: ObjectId;
  rideId: ObjectId;
  grossAmount: number;
  commissionPercentage: number;
  commission: number;
  netEarnings: number;
  bonusAmount: number;
  date: Date;
  createdAt: Date;
}

export interface IAdminSettings {
  _id: ObjectId;
  baseFare: number; // starting fare
  perKmRate: number; // fare per km
  perMinRate: number; // fare per minute
  surgeFactor: number; // default surge multiplier
  commissionPercentage: number; // admin commission from rides
  cancellationFeePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to ensure collections and indexes exist
export async function ensureUberCollections(db: Db) {
  // Create collections if they don't exist
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);

  if (!collectionNames.includes("users_uber")) {
    await db.createCollection("users_uber");
  }
  if (!collectionNames.includes("drivers")) {
    await db.createCollection("drivers");
  }
  if (!collectionNames.includes("vehicles")) {
    await db.createCollection("vehicles");
  }
  if (!collectionNames.includes("rides")) {
    await db.createCollection("rides");
  }
  if (!collectionNames.includes("payments")) {
    await db.createCollection("payments");
  }
  if (!collectionNames.includes("ratings")) {
    await db.createCollection("ratings");
  }
  if (!collectionNames.includes("driver_locations")) {
    await db.createCollection("driver_locations");
  }
  if (!collectionNames.includes("earnings")) {
    await db.createCollection("earnings");
  }
  if (!collectionNames.includes("admin_settings")) {
    await db.createCollection("admin_settings");
  }

  // Create indexes
  await db.collection("users_uber").createIndex({ email: 1 }, { unique: true });
  await db.collection("users_uber").createIndex({ phone: 1 });
  await db.collection("users_uber").createIndex({ role: 1 });

  await db.collection("drivers").createIndex({ userId: 1 });
  await db.collection("drivers").createIndex({ approvalStatus: 1 });
  await db.collection("drivers").createIndex({ status: 1 });

  await db.collection("vehicles").createIndex({ driverId: 1 });

  await db.collection("rides").createIndex({ userId: 1 });
  await db.collection("rides").createIndex({ driverId: 1 });
  await db.collection("rides").createIndex({ status: 1 });
  await db.collection("rides").createIndex({ createdAt: -1 });
  await db.collection("rides").createIndex({ "pickupLocation.lat": 1, "pickupLocation.lng": 1 });

  await db.collection("payments").createIndex({ rideId: 1 });
  await db.collection("payments").createIndex({ userId: 1 });

  await db.collection("ratings").createIndex({ rideId: 1 });
  await db.collection("ratings").createIndex({ userId: 1 });
  await db.collection("ratings").createIndex({ driverId: 1 });

  await db.collection("driver_locations").createIndex({ driverId: 1 });
  await db.collection("driver_locations").createIndex({ timestamp: -1 }, { expireAfterSeconds: 86400 }); // auto-delete after 24h
  await db.collection("driver_locations").createIndex({ latitude: 1, longitude: 1 });

  await db.collection("earnings").createIndex({ driverId: 1 });
  await db.collection("earnings").createIndex({ date: 1 });
}
