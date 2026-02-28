import {
  movingVehicleTypes,
  movingDrivers,
  movingBookings,
  users,
  type MovingVehicleType,
  type InsertMovingVehicleType,
  type MovingDriver,
  type InsertMovingDriver,
  type MovingBooking,
  type InsertMovingBooking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

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
    return db.select().from(movingVehicleTypes);
  }

  async getVehicleType(id: string): Promise<MovingVehicleType | undefined> {
    const [vt] = await db.select().from(movingVehicleTypes).where(eq(movingVehicleTypes.id, id));
    return vt || undefined;
  }

  async createVehicleType(vehicleType: InsertMovingVehicleType): Promise<MovingVehicleType> {
    const [created] = await db.insert(movingVehicleTypes).values(vehicleType).returning();
    return created;
  }

  async updateVehicleType(id: string, vehicleType: Partial<InsertMovingVehicleType>): Promise<MovingVehicleType | undefined> {
    const [updated] = await db.update(movingVehicleTypes).set(vehicleType).where(eq(movingVehicleTypes.id, id)).returning();
    return updated || undefined;
  }

  async deleteVehicleType(id: string): Promise<void> {
    await db.delete(movingVehicleTypes).where(eq(movingVehicleTypes.id, id));
  }

  async getDrivers(): Promise<MovingDriver[]> {
    return db.select().from(movingDrivers);
  }

  async getDriver(id: string): Promise<MovingDriver | undefined> {
    const [driver] = await db.select().from(movingDrivers).where(eq(movingDrivers.id, id));
    return driver || undefined;
  }

  async getDriverByUserId(userId: string): Promise<MovingDriver | undefined> {
    const [driver] = await db.select().from(movingDrivers).where(eq(movingDrivers.userId, userId));
    return driver || undefined;
  }

  async createDriver(driver: InsertMovingDriver): Promise<MovingDriver> {
    const [created] = await db.insert(movingDrivers).values(driver).returning();
    return created;
  }

  async updateDriver(id: string, driver: Partial<InsertMovingDriver>): Promise<MovingDriver | undefined> {
    const [updated] = await db.update(movingDrivers).set(driver).where(eq(movingDrivers.id, id)).returning();
    return updated || undefined;
  }

  async deleteDriver(id: string): Promise<void> {
    await db.delete(movingDrivers).where(eq(movingDrivers.id, id));
  }

  async toggleDriverAvailability(userId: string): Promise<MovingDriver | undefined> {
    const driver = await this.getDriverByUserId(userId);
    if (!driver) return undefined;
    const [updated] = await db.update(movingDrivers)
      .set({ isAvailable: !driver.isAvailable })
      .where(eq(movingDrivers.id, driver.id))
      .returning();
    return updated || undefined;
  }

  async getBookings(): Promise<MovingBooking[]> {
    return db.select().from(movingBookings).orderBy(desc(movingBookings.createdAt));
  }

  async getBooking(id: string): Promise<MovingBooking | undefined> {
    const [booking] = await db.select().from(movingBookings).where(eq(movingBookings.id, id));
    return booking || undefined;
  }

  async getUserBookings(userId: string): Promise<MovingBooking[]> {
    return db.select().from(movingBookings)
      .where(eq(movingBookings.userId, userId))
      .orderBy(desc(movingBookings.createdAt));
  }

  async getDriverBookings(driverId: string): Promise<MovingBooking[]> {
    return db.select().from(movingBookings)
      .where(eq(movingBookings.driverId, driverId))
      .orderBy(desc(movingBookings.createdAt));
  }

  async createBooking(booking: InsertMovingBooking): Promise<MovingBooking> {
    const [created] = await db.insert(movingBookings).values(booking).returning();
    return created;
  }

  async updateBookingStatus(id: string, status: string): Promise<MovingBooking | undefined> {
    const [updated] = await db.update(movingBookings)
      .set({ status })
      .where(eq(movingBookings.id, id))
      .returning();
    return updated || undefined;
  }

  async assignDriver(bookingId: string, driverId: string): Promise<MovingBooking | undefined> {
    const [updated] = await db.update(movingBookings)
      .set({ driverId, status: "confirmed" })
      .where(eq(movingBookings.id, bookingId))
      .returning();
    return updated || undefined;
  }

  async cancelBooking(id: string, userId: string): Promise<MovingBooking | undefined> {
    const [updated] = await db.update(movingBookings)
      .set({ status: "cancelled" })
      .where(and(eq(movingBookings.id, id), eq(movingBookings.userId, userId)))
      .returning();
    return updated || undefined;
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
