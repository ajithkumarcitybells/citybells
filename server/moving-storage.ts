import {
  type MovingVehicleType,
  type InsertMovingVehicleType,
  type MovingDriver,
  type InsertMovingDriver,
  type MovingBooking,
  type InsertMovingBooking,
} from "@shared/schema";
import { getDb, toDoc, toDocs, newId } from "./db";

function col(name: string) {
  return getDb().collection(name);
}

export interface IMovingStorage {
  getVehicleTypes(): Promise<MovingVehicleType[]>;
  getVehicleType(id: string): Promise<MovingVehicleType | undefined>;
  createVehicleType(vehicleType: InsertMovingVehicleType): Promise<MovingVehicleType>;
  updateVehicleType(id: string, vehicleType: Partial<InsertMovingVehicleType>): Promise<MovingVehicleType | undefined>;
  deleteVehicleType(id: string): Promise<void>;
  getDrivers(): Promise<MovingDriver[]>;
  getDriver(id: string): Promise<MovingDriver | undefined>;
  getDriverByUserId(userId: string): Promise<MovingDriver | undefined>;
  createDriver(driver: InsertMovingDriver): Promise<MovingDriver>;
  updateDriver(id: string, driver: Partial<InsertMovingDriver>): Promise<MovingDriver | undefined>;
  deleteDriver(id: string): Promise<void>;
  toggleDriverAvailability(userId: string): Promise<MovingDriver | undefined>;
  getBookings(): Promise<MovingBooking[]>;
  getBooking(id: string): Promise<MovingBooking | undefined>;
  getUserBookings(userId: string): Promise<MovingBooking[]>;
  getDriverBookings(driverId: string): Promise<MovingBooking[]>;
  createBooking(booking: InsertMovingBooking): Promise<MovingBooking>;
  updateBookingStatus(id: string, status: string): Promise<MovingBooking | undefined>;
  assignDriver(bookingId: string, driverId: string): Promise<MovingBooking | undefined>;
  cancelBooking(id: string, userId: string): Promise<MovingBooking | undefined>;
  estimatePrice(vehicleTypeId: string, distanceKm: number, helpersCount: number): Promise<{ estimatedPrice: string }>;
}

export class MovingStorage implements IMovingStorage {
  async getVehicleTypes(): Promise<MovingVehicleType[]> {
    return toDocs<MovingVehicleType>(await col("moving_vehicle_types").find().toArray());
  }
  async getVehicleType(id: string): Promise<MovingVehicleType | undefined> {
    const doc = await col("moving_vehicle_types").findOne({ _id: id as any });
    return doc ? toDoc<MovingVehicleType>(doc) : undefined;
  }
  async createVehicleType(vehicleType: InsertMovingVehicleType): Promise<MovingVehicleType> {
    const id = newId();
    const doc = { _id: id as any, image: null, ...vehicleType };
    await col("moving_vehicle_types").insertOne(doc);
    return toDoc<MovingVehicleType>(doc);
  }
  async updateVehicleType(id: string, vehicleType: Partial<InsertMovingVehicleType>): Promise<MovingVehicleType | undefined> {
    const r = await col("moving_vehicle_types").findOneAndUpdate({ _id: id as any }, { $set: vehicleType }, { returnDocument: "after" });
    return r ? toDoc<MovingVehicleType>(r) : undefined;
  }
  async deleteVehicleType(id: string): Promise<void> {
    await col("moving_vehicle_types").deleteOne({ _id: id as any });
  }
  async getDrivers(): Promise<MovingDriver[]> {
    return toDocs<MovingDriver>(await col("moving_drivers").find().toArray());
  }
  async getDriver(id: string): Promise<MovingDriver | undefined> {
    const doc = await col("moving_drivers").findOne({ _id: id as any });
    return doc ? toDoc<MovingDriver>(doc) : undefined;
  }
  async getDriverByUserId(userId: string): Promise<MovingDriver | undefined> {
    const doc = await col("moving_drivers").findOne({ userId });
    return doc ? toDoc<MovingDriver>(doc) : undefined;
  }
  async createDriver(driver: InsertMovingDriver): Promise<MovingDriver> {
    const id = newId();
    const doc = { _id: id as any, isAvailable: true, rating: "4.5", ...driver };
    await col("moving_drivers").insertOne(doc);
    return toDoc<MovingDriver>(doc);
  }
  async updateDriver(id: string, driver: Partial<InsertMovingDriver>): Promise<MovingDriver | undefined> {
    const r = await col("moving_drivers").findOneAndUpdate({ _id: id as any }, { $set: driver }, { returnDocument: "after" });
    return r ? toDoc<MovingDriver>(r) : undefined;
  }
  async deleteDriver(id: string): Promise<void> {
    await col("moving_drivers").deleteOne({ _id: id as any });
  }
  async toggleDriverAvailability(userId: string): Promise<MovingDriver | undefined> {
    const driver = await this.getDriverByUserId(userId);
    if (!driver) return undefined;
    const r = await col("moving_drivers").findOneAndUpdate(
      { _id: driver.id as any },
      { $set: { isAvailable: !driver.isAvailable } },
      { returnDocument: "after" }
    );
    return r ? toDoc<MovingDriver>(r) : undefined;
  }
  async getBookings(): Promise<MovingBooking[]> {
    return toDocs<MovingBooking>(await col("moving_bookings").find().sort({ createdAt: -1 }).toArray());
  }
  async getBooking(id: string): Promise<MovingBooking | undefined> {
    const doc = await col("moving_bookings").findOne({ _id: id as any });
    return doc ? toDoc<MovingBooking>(doc) : undefined;
  }
  async getUserBookings(userId: string): Promise<MovingBooking[]> {
    return toDocs<MovingBooking>(await col("moving_bookings").find({ userId }).sort({ createdAt: -1 }).toArray());
  }
  async getDriverBookings(driverId: string): Promise<MovingBooking[]> {
    return toDocs<MovingBooking>(await col("moving_bookings").find({ driverId }).sort({ createdAt: -1 }).toArray());
  }
  async createBooking(booking: InsertMovingBooking): Promise<MovingBooking> {
    const id = newId();
    const doc = { _id: id as any, status: "pending", createdAt: new Date(), ...booking };
    await col("moving_bookings").insertOne(doc);
    return toDoc<MovingBooking>(doc);
  }
  async updateBookingStatus(id: string, status: string): Promise<MovingBooking | undefined> {
    const r = await col("moving_bookings").findOneAndUpdate({ _id: id as any }, { $set: { status } }, { returnDocument: "after" });
    return r ? toDoc<MovingBooking>(r) : undefined;
  }
  async assignDriver(bookingId: string, driverId: string): Promise<MovingBooking | undefined> {
    const r = await col("moving_bookings").findOneAndUpdate(
      { _id: bookingId as any },
      { $set: { driverId, status: "confirmed" } },
      { returnDocument: "after" }
    );
    return r ? toDoc<MovingBooking>(r) : undefined;
  }
  async cancelBooking(id: string, userId: string): Promise<MovingBooking | undefined> {
    const r = await col("moving_bookings").findOneAndUpdate(
      { _id: id as any, userId },
      { $set: { status: "cancelled" } },
      { returnDocument: "after" }
    );
    return r ? toDoc<MovingBooking>(r) : undefined;
  }
  async estimatePrice(vehicleTypeId: string, distanceKm: number, helpersCount: number): Promise<{ estimatedPrice: string }> {
    const vt = await this.getVehicleType(vehicleTypeId);
    if (!vt) throw new Error("Vehicle type not found");
    const base = parseFloat(vt.basePrice);
    const perKm = parseFloat(vt.pricePerKm);
    const helperCost = helpersCount * 200;
    const total = base + (perKm * distanceKm) + helperCost;
    return { estimatedPrice: total.toFixed(2) };
  }
}

export const movingStorage = new MovingStorage();
